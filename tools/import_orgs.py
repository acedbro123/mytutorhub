#!/usr/bin/env python3
"""Import an organization batch from an Apple Numbers file into the map's JSON.

    python3 tools/import_orgs.py "new batch.numbers" --into organizations_norcal.json

Runs parse -> ages -> categories -> geocode -> merge. Geocoding results are
cached under tools/.cache/, so a re-run after fixing categories costs nothing
and an interrupted run picks up where it stopped.

Nothing is written to the target file until every row has a category and a
coordinate. If some rows are missing a category the run stops and lists them;
add those names to category_overrides.json and run again.

Requires the `numbers_parser` package.
"""

import argparse
import json
import os
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
CACHE_DIR = os.path.join(HERE, '.cache')
OVERRIDES_FILE = os.path.join(HERE, 'category_overrides.json')
EXCLUDED_FILE = os.path.join(HERE, 'excluded_orgs.json')

# Nominatim asks for a real contact address in the User-Agent.
USER_AGENT = 'VoluntoolMapImport/1.0 (acedbro123@gmail.com)'
NOMINATIM = 'https://nominatim.openstreetmap.org/search'
RATE_LIMIT_SECONDS = 1.1

# The map builds its filter chips from whatever categories the orgs carry, so
# adding a value here is what makes a new chip appear. Keep to this set unless
# you actually want a new chip.
CATEGORIES = ['Advocacy', 'Animals', 'Arts', 'Children', 'Community', 'Education',
              'Environment', 'Faith', 'Food', 'Health', 'Homeless', 'Housing',
              'Seniors', 'Veterans', 'Youth']

FIELDS = ['id', 'name', 'description', 'address', 'category', 'link', 'email',
          'minAge', 'ageStatus', 'weeklyHoursRequired', 'latitude', 'longitude']


# --------------------------------------------------------------------------
# Parsing
# --------------------------------------------------------------------------

def slugify(name):
    s = unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


def read_rows(path):
    """Read the first table of the first sheet, keyed by header name.

    Column *order* varies between batches, so everything downstream goes
    through the header rather than a fixed index.
    """
    from numbers_parser import Document

    rows = Document(path).sheets[0].tables[0].rows(values_only=True)
    header = [(h or '').strip() for h in rows[0]]

    def col(*aliases):
        for i, h in enumerate(header):
            if any(a.lower() in h.lower() for a in aliases if h):
                return i
        return None

    idx = {
        'name': col('Organization Name', 'Organization'),
        'website': col('Website'),
        'address': col('Address'),
        'email': col('E-mail', 'Email'),
        'age': col('Minimum Age'),
        'note': col('Note'),
    }
    if idx['name'] is None:
        raise SystemExit('could not find an "Organization Name" column in: %s' % header)

    out = []
    for r in rows[1:]:
        if idx['name'] >= len(r) or not r[idx['name']]:
            continue
        get = lambda k: (r[idx[k]] if idx[k] is not None and idx[k] < len(r) else None)
        out.append({k: get(k) for k in idx})
    return out


# --------------------------------------------------------------------------
# Minimum volunteer age
# --------------------------------------------------------------------------
#
# The age column mixes two different facts: the age a volunteer must be, and
# the age of the people the org serves. Read naively, "Children From Birth To
# Age 5" or "Ages 25 And Under" become a volunteer minimum of 5 or 25 — a
# confident wrong number that looks fine until a student acts on it. So a value
# is only recorded when the wording actually states a floor; everything else is
# left unknown, which the map renders as "AGE NOT VERIFIED".

MIN_PATTERNS = [
    r'at least\s*(\d{1,2})',
    r'minimum(?:\s+age)?(?:\s+requirement)?(?:\s+(?:of|is|to volunteer))?\s*(?:of\s*)?(\d{1,2})',
    r'must be\s*(?:at least\s*)?(\d{1,2})',
    r'(\d{1,2})\s*(?:years?|yrs?)?\s*(?:of age\s*)?(?:and|or)\s*(?:older|above|up|over)',
    r'(\d{1,2})\s*\+',
    r'\bover\s*(?:the\s*age\s*of\s*)?(\d{1,2})',
    r'(?<!under )\bage\s*of\s*(\d{1,2})',
]
RANGE_RE = re.compile(r'(\d{1,2})\s*(?:years?|yrs?)?\s*(?:-|–|—|to|and)\s*(\d{1,2})')
NUM_RE = re.compile(r'\b(\d{1,2})\b')
# Wording that means the number describes people served, not the volunteer floor.
SERVED_RE = re.compile(r'\bunder\b|\bbirth\b|\bup to\b|\bgrades?\b|\byounger\b', re.I)
# Wording that does state a floor, and so overrides the above.
FLOOR_RE = re.compile(r'at least|must be|minimum|(?:and|or)\s*(?:older|above|up)|\+', re.I)


def extract_min_age(text):
    """Return (minAge, ageStatus). Ambiguous wording yields (None, 'unknown')."""
    if not text:
        return None, 'unknown'
    low = str(text).strip().lower()

    if SERVED_RE.search(low) and not FLOOR_RE.search(low):
        return None, 'unknown'

    for pat in MIN_PATTERNS:
        m = re.search(pat, low)
        if m:
            v = int(m.group(1))
            if 12 <= v <= 25:
                return v, 'confirmed'
            # A single-digit floor is real for family volunteering, but only
            # when the wording is explicit ("must be 10 or older").
            if 5 <= v < 12 and FLOOR_RE.search(low):
                return v, 'confirmed'
            return None, 'unknown'

    # "Volunteers aged 14 to 30" — the low end is the floor. A low end under 12
    # almost always means the range describes the people served instead.
    m = RANGE_RE.search(low)
    if m:
        a, b = int(m.group(1)), int(m.group(2))
        return (a, 'confirmed') if (12 <= a <= 25 and b > a) else (None, 'unknown')

    nums = [int(x) for x in NUM_RE.findall(low)]
    plausible = [v for v in nums if 12 <= v <= 25]
    if len(nums) == 1 and plausible:
        return plausible[0], 'confirmed'
    return None, 'unknown'


# --------------------------------------------------------------------------
# Categories
# --------------------------------------------------------------------------
#
# Matched against the org NAME only. The Note column is about age policy rather
# than mission, so classifying on it misfires badly. Whatever the name does not
# resolve is listed for a human to add to category_overrides.json.
#
# Several patterns are anchored with \b because the unanchored version matched
# inside longer words: "hiv" in "Archive", "tree" in "Streets", "park" in
# "Sparkle", "ministr" in "Administrative", "christ" in "Christmas".

RULES = [
    ('Animals', r'animal|humane societ|spca|wildlife|pet |pets\b|dog|cat\b|cats\b|feline|canine|equine|horse|rescue ranch|zoo|aquarium|bird|raptor|marine mammal|paws|kitten|puppy|veterinar|sanctuary'),
    ('Food', r'food bank|foodbank|food pantry|pantry|meals? on wheels|\bmeals?\b|hunger|nutrition|kitchen|feeding|farmers market|glean|harvest|soup |grocer|\bfeed\b|edible|second harvest'),
    ('Faith', r'\bchurch\b|temple|synagogue|mosque|islamic|jewish|catholic|parish|\bministr|\bchrist|gospel|congregation|baptist|lutheran|presbyterian|methodist|episcopal|chabad|buddhist|dharma|sikh|gurdwara|faith|bible|salvation army|diocese|hindu|vedic|spiritual'),
    ('Health', r'health|hospital|clinic|medical|hospice|cancer|blood|mental|counsel|therap|recovery|addiction|substance|wellness|disabilit|autism|alzheimer|caregiv|\baids\b|\bhiv\b|nurs|dental|vision|hearing|diabet|stroke|epilep|cerebral|down syndrome|special needs|crisis|suicide'),
    ('Homeless', r'homeless|shelter\b|unhoused|rescue mission|street outreach|transitional'),
    ('Housing', r'housing|habitat for humanity|tenant|rebuilding together|home repair|\bhomes\b'),
    ('Veterans', r'veteran|\bvfw\b|american legion|military|armed forces|troops|blue star|gold star'),
    ('Seniors', r'senior|elder|aging|older adult|retire|\bage well\b|meals on wheels|55\+'),
    ('Environment', r'environment|conservat|\bcreek|watershed|bay keeper|baykeeper|river|land trust|open space|\bparks?\b|trail|garden|\btrees?\b|forest|climate|recycl|sustainab|clean ?up|ecolog|audubon|sierra club|wetland|coast|ocean|shoreline|native plant|greenbelt|zero waste|solar|energy'),
    ('Arts', r'\barts?\b|museum|theat|music|orchestra|choral|chorus|symphony|dance|gallery|film|festival|\bopera\b|ballet|craft|photograph|poetry|literary|jazz|band\b|studio|creative'),
    ('Education', r'school|educat|tutor|literacy|library|libraries|scholarship|college|university|stem|reading|learning|academy|mentor|classroom|teach|student|book'),
    ('Children', r'child|kids?\b|infant|toddler|preschool|early childhood|foster|orphan|pediatric|boys & girls|boys and girls|girls inc|cradle|babies|baby|diaper'),
    ('Youth', r'youth|teen|young|scout|\b4-h\b|boy scouts|girl scouts|ymca|ywca|big brothers|big sisters|junior|after ?school|mentoring'),
    ('Advocacy', r'advoca|rights|equity|equalit|coalition|alliance|action|policy|reform|naacp|league of women voters|voter|civic|empower|justice|antiracis|anti-racis|legal|\blaw\b|lawyer|attorney|immigration'),
    ('Community', r'community|neighborhood|neighbor|rotary|kiwanis|lions club|chamber of commerce|business association|downtown|main street|united way|volunteer|association|resource center|foundation|council|network|center|centre|club|society|corps|outreach|services|hub|collective|project|program|partners|fund|initiative|cultur|heritage|historic'),
]
RULES = [(c, re.compile(p, re.I)) for c, p in RULES]

# When a name matches several rules, the more specific category wins.
PRIORITY = ['Animals', 'Veterans', 'Homeless', 'Food', 'Faith', 'Housing', 'Seniors',
            'Children', 'Youth', 'Health', 'Environment', 'Arts', 'Education',
            'Advocacy', 'Community']


def load_overrides():
    with open(OVERRIDES_FILE) as f:
        return json.load(f)


def load_excluded():
    """Slug ids that must stay off the map.

    Dedupe alone only compares against rows currently in the target file, so a
    row deleted on purpose looks brand new on the next run and would come
    straight back. This is what makes a deletion stick.
    """
    with open(EXCLUDED_FILE) as f:
        return {k: v for k, v in json.load(f).items() if not k.startswith('_')}


def classify(name, overrides):
    if name in overrides:
        return overrides[name]
    hits = [c for c, p in RULES if p.search(name)]
    for c in PRIORITY:
        if c in hits:
            return c
    return None


# --------------------------------------------------------------------------
# Geocoding
# --------------------------------------------------------------------------
#
# The structured query (street/city/state/postalcode) is what reproduces the
# coordinates already in the data. Free-form `q=` fails often on messy
# addresses and silently falls back to a city-center pin, so it is only used to
# rescue rows the structured query could not place at all.

NOISE_RE = re.compile(
    r'\b(?:ste|suite|unit|apt|apartment|fl|floor|rm|room|bldg|building|#\s*\S+|pmb|c/o|po box|p\.o\. box|mailbox)\b[^,]*',
    re.I)
STREET_RE = re.compile(
    r'\b(\d+[A-Za-z]?)\s+((?:[NSEW]\.?|North|South|East|West)?\s*[\w\.\'\-]+(?:\s+[\w\.\'\-]+){0,3}?\s+'
    r'(?:st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|way|ct|court|pl|place|'
    r'pkwy|parkway|ter|terrace|cir|circle|hwy|highway|sq|square|plaza|trail|trl|loop|row|walk|'
    r'path|alley|expy|expressway)\b\.?)', re.I)


def parse_address(addr):
    """Split a free-text address into (street, city, state, zip)."""
    a = re.sub(r',?\s*(?:USA|United States)\s*$', '', (addr or '').strip(), flags=re.I)

    zipcode = ''
    m = re.search(r'\b(\d{5})(?:-\d{4})?\s*$', a)
    if m:
        zipcode, a = m.group(1), a[:m.start()].rstrip(' ,')

    state = ''
    m = re.search(r',?\s*\b(CA|California)\b\s*$', a, re.I)
    if m:
        state, a = 'CA', a[:m.start()].rstrip(' ,')

    parts = [p.strip() for p in a.split(',') if p.strip()]
    city = parts[-1] if parts else ''
    rest = ', '.join(parts[:-1]) if len(parts) > 1 else ''

    if not rest and parts:
        # "37 Upenuf Rd Woodside" — no comma between street and city.
        sm = STREET_RE.search(parts[-1])
        if sm:
            rest = sm.group(0)
            city = parts[-1][sm.end():].strip(' ,') or city

    street = ''
    if rest:
        cleaned = NOISE_RE.sub('', rest)
        sm = STREET_RE.search(cleaned)
        street = sm.group(0) if sm else cleaned.split(',')[0].strip()

    return street.strip(), city.strip(), state or 'CA', zipcode


def clean_for_freeform(addr):
    a = re.sub(r',?\s*(?:USA|United States)\s*$', '', addr, flags=re.I)
    a = re.sub(r'(Street|Avenue|Boulevard|Road|Drive|Lane|Way|Court|Place)([A-Z][a-z])', r'\1, \2', a)
    a = re.sub(r'\b(?:Suite|Ste|Unit|Apt|Bldg|Building|Rm|Room|PMB)\.?\s*[\w#\-]*\.?\s*', '', a, flags=re.I)
    a = re.sub(r'\bP\.?\s*O\.?\s*Box\s*\d*,?\s*', '', a, flags=re.I)
    return re.sub(r'\s{2,}', ' ', a).strip(' ,')


class Geocoder:
    def __init__(self, cache_path):
        self.cache_path = cache_path
        self.cache = {}
        if os.path.exists(cache_path):
            with open(cache_path) as f:
                self.cache = json.load(f)

    def save(self):
        with open(self.cache_path, 'w') as f:
            json.dump(self.cache, f)

    def query(self, params):
        key = json.dumps(params, sort_keys=True)
        if key in self.cache:
            return self.cache[key]

        full = dict(params, format='json', limit='1', countrycodes='us')
        url = NOMINATIM + '?' + urllib.parse.urlencode(full)
        data = []
        for attempt in range(3):
            try:
                req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
                with urllib.request.urlopen(req, timeout=30) as r:
                    data = json.loads(r.read().decode())
                break
            except Exception as exc:
                if attempt == 2:
                    sys.stderr.write('geocode error: %s (%s)\n' % (exc, url))
                else:
                    time.sleep(5)

        result = [float(data[0]['lat']), float(data[0]['lon'])] if data else None
        self.cache[key] = result
        time.sleep(RATE_LIMIT_SECONDS)
        return result

    def locate(self, address):
        """Return (coords, level). Falls back street -> ZIP -> city -> free-form."""
        street, city, state, zipcode = parse_address(address)

        if street and (city or zipcode):
            p = {'street': street, 'state': state}
            if city:
                p['city'] = city
            if zipcode:
                p['postalcode'] = zipcode
            hit = self.query(p)
            if hit:
                return hit, 'street'

        if zipcode:
            hit = self.query({'postalcode': zipcode, 'state': state})
            if hit:
                return hit, 'zip'

        if city:
            hit = self.query({'city': city, 'state': state})
            if hit:
                return hit, 'city'

        hit = self.query({'q': clean_for_freeform(address) + ', CA'})
        if hit:
            return hit, 'freeform'

        if zipcode:
            hit = self.query({'q': zipcode + ', CA'})
            if hit:
                return hit, 'zip'

        return None, 'fail'


# --------------------------------------------------------------------------
# Pipeline
# --------------------------------------------------------------------------

def build_records(raw_rows, overrides):
    records, uncategorized = [], []
    for row in raw_rows:
        name = str(row['name']).strip()
        website = (row['website'] or '').strip()
        address = re.sub(r',\s*(?:USA|United States)\s*$', '', (row['address'] or '').strip()).strip(' ,')
        min_age, age_status = extract_min_age(row['age'])
        category = classify(name, overrides)
        if not category:
            uncategorized.append(name)

        records.append({
            'id': slugify(name),
            'name': name,
            'description': '',
            'address': address,
            'category': category or '',
            'link': website if website.startswith('http') else ('https://' + website if website else ''),
            'email': (row['email'] or '').strip(),
            'minAge': min_age,
            'ageStatus': age_status,
            'weeklyHoursRequired': None,
            'latitude': None,
            'longitude': None,
        })
    return records, uncategorized


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('numbers_file', help='the .numbers batch to import')
    ap.add_argument('--into', required=True,
                    help='target JSON, e.g. organizations_norcal.json')
    ap.add_argument('--dry-run', action='store_true',
                    help='report what would happen without writing the target file')
    args = ap.parse_args()

    target = args.into if os.path.isabs(args.into) else os.path.join(REPO, args.into)
    os.makedirs(CACHE_DIR, exist_ok=True)
    overrides = load_overrides()

    print('reading %s' % args.numbers_file)
    raw = read_rows(args.numbers_file)
    print('  %d rows' % len(raw))

    records, uncategorized = build_records(raw, overrides)

    confirmed = sum(1 for r in records if r['ageStatus'] == 'confirmed')
    print('ages: %d confirmed, %d unknown' % (confirmed, len(records) - confirmed))

    if uncategorized:
        print('\n%d names need a category. Add them to %s, then re-run:\n'
              % (len(uncategorized), os.path.relpath(OVERRIDES_FILE, REPO)))
        for n in sorted(set(uncategorized)):
            print('  "%s": "",' % n.replace('"', '\\"'))
        print('\nValid categories: %s' % ', '.join(CATEGORIES))
        return 1

    existing = json.load(open(target)) if os.path.exists(target) else []
    seen = {o['id'] for o in existing}
    excluded = load_excluded()

    skipped = [r['name'] for r in records if r['id'] in excluded]
    fresh = [r for r in records if r['id'] not in seen and r['id'] not in excluded]
    dupes = len(records) - len(fresh) - len(skipped)
    print('%d new, %d already present' % (len(fresh), dupes))
    for name in skipped:
        print('  excluded: %s' % name)
    if not fresh:
        print('nothing to add')
        return 0

    print('geocoding %d addresses (about %d minutes at Nominatim rate limits)'
          % (len(fresh), max(1, round(len(fresh) * RATE_LIMIT_SECONDS / 60))))
    geo = Geocoder(os.path.join(CACHE_DIR, 'geocache.json'))
    levels = {}
    failed = []
    try:
        for i, rec in enumerate(fresh):
            coords, level = geo.locate(rec['address'])
            levels[level] = levels.get(level, 0) + 1
            if coords:
                rec['latitude'], rec['longitude'] = coords
            else:
                failed.append(rec['name'])
            if i and i % 25 == 0:
                geo.save()
                print('  %d/%d %s' % (i, len(fresh), levels))
    finally:
        geo.save()
    print('  done %s' % levels)

    if failed:
        print('\n%d rows could not be geocoded and are NOT being added:' % len(failed))
        for n in failed:
            print('  %s' % n)
        fresh = [r for r in fresh if r['latitude'] is not None]

    # A coordinate far outside California usually means the sheet lists a
    # national headquarters rather than the local office. Worth a look, but not
    # an error — see the SOAR entry for a row that is legitimately remote.
    outliers = [r for r in fresh
                if not (32.0 <= r['latitude'] <= 42.1 and -124.5 <= r['longitude'] <= -114.0)]
    if outliers:
        print('\n%d rows landed outside California — check these against the org\'s own site:'
              % len(outliers))
        for r in outliers:
            print('  %-38s %s' % (r['name'][:38], r['address']))

    if args.dry_run:
        print('\ndry run: %s not written (%d rows would be added)'
              % (args.into, len(fresh)))
        return 0

    merged = existing + [{k: r[k] for k in FIELDS} for r in fresh]
    with open(target, 'w') as f:
        json.dump(merged, f, indent=2, ensure_ascii=False)
    print('\n%s: %d -> %d records' % (args.into, len(existing), len(merged)))
    print('Verify with: python3 -m http.server, then load map.html')
    return 0


if __name__ == '__main__':
    sys.exit(main())
