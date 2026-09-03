# Org import

Turns an Apple Numbers batch into map data.

```bash
python3 tools/import_orgs.py "new batch.numbers" --into organizations_norcal.json --dry-run
python3 tools/import_orgs.py "new batch.numbers" --into organizations_norcal.json
```

Needs `numbers_parser` (`pip3 install numbers-parser`). Start with `--dry-run`:
it does everything except write the target file.

Safe to re-run. Rows already in the target are skipped by slug id, geocoding
results are cached in `.cache/`, and an interrupted run picks up where it
stopped.

## What it does

1. **Parse.** Reads the first table of the first sheet by *header name* —
   column order varies between batches.
2. **Ages.** Extracts a minimum volunteer age where the wording states one.
3. **Categories.** Matches the org name against keyword rules, falling back to
   `category_overrides.json`.
4. **Geocode.** Nominatim structured query, rate-limited to one call per 1.1s.
5. **Merge.** Appends to the target JSON, skipping duplicates and exclusions.

The run stops before writing if any row lacks a category, and prints the
missing names as paste-ready JSON lines. Add them to
`category_overrides.json` and run again.

## The three files beside the script

`category_overrides.json` — org name to category, for names the keyword rules
can't resolve or get wrong. This is accumulated hand-classification; it grows
every batch, and is worth keeping because it encodes judgment the rules can't.

`excluded_orgs.json` — slug ids that must stay off the map, with a reason.
Deleting a row from the JSON is not enough on its own: dedupe only compares
against rows currently in the target file, so a deleted row looks new on the
next run and comes straight back. Add the id here and the deletion sticks.

`.cache/geocache.json` — every Nominatim lookup made so far, keyed by query.
Committed on purpose: it makes re-runs instant, keeps coordinates stable
across runs, and is the polite thing to do to a free service.

## Two things that will bite you

**The age column mixes two different facts.** It states the age a volunteer
must be, *and* the age of the people the org serves, in the same free text.
Read naively, "Children From Birth To Age 5" yields a minimum volunteer age of
5, and "Ages 25 And Under" yields 25. Both are confident, wrong, and look
perfectly fine in the data until a student acts on one. So a number is only
recorded when the wording actually states a floor — "at least 16", "18 and
older", "must be 21". Everything else is left `unknown`, which the map renders
as "AGE NOT VERIFIED". Roughly a quarter of rows land there, and that is the
correct outcome, not a gap to fill.

**Categories come from the org name, never the Note column.** The Note is
about age policy, not mission, so classifying on it misfires badly. Several
keyword patterns are anchored with `\b` for the same reason — unanchored, they
matched inside longer words: `hiv` in "Arc**hiv**e", `tree` in "S**tree**ts",
`park` in "S**park**le", `ministr` in "Ad**ministr**ative", `christ` in
"**Christ**mas". If a new category rule starts sweeping up unrelated orgs,
this is the first thing to check.

## Checking the result

An address that geocodes far outside California usually means the sheet lists
a national headquarters rather than the local office — Covenant House and the
Center for Employment Opportunities both came in pointing at Los Angeles. The
script flags these rather than failing; check each against the org's own site.

Some orgs genuinely have no street address — student-run or fully remote. Put
an explanation in the row's `description` rather than inventing an address;
the map renders it in both the popup and the list card. `SOAR` in
`organizations_norcal.json` is the worked example.

Then serve the repo and load `map.html`. Pins are Leaflet `circleMarker`s, so
count `.leaflet-overlay-pane path`, not `.leaflet-marker-icon`. Markers only
render for orgs in the current viewport, so an empty map at the default zoom
is expected — search an address first.
