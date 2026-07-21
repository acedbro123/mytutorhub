/*
 * Voluntool — volunteer organizations shown on the Map page.
 * ===========================================================================
 * HOW TO ADD YOUR OWN ORGANIZATION:
 *   1. Copy one whole { ... } block below.
 *   2. Paste it into the list, keeping a comma between entries.
 *   3. Edit the fields.
 *
 * COORDINATES: you can either
 *   (a) leave latitude/longitude out and just give an "address" — the Map page
 *       geocodes it via OpenStreetMap Nominatim on load and caches the result; or
 *   (b) provide latitude/longitude directly (most reliable — use this if an
 *       address doesn't geocode). To look up coordinates: open Google Maps,
 *       right-click the exact spot, and click the "lat, lng" numbers to copy.
 *
 * FIELDS (all required except where noted):
 *   name                (text)    organization name
 *   description         (text)    one-line summary — optional
 *   address             (text)    street address (used for geocoding + display)
 *   latitude            (number)  optional if an address is given
 *   longitude           (number)  optional if an address is given
 *   category            (text)    e.g. "Tutoring" — optional
 *   link                (text)    website URL — optional
 *   minAge              (number)  youngest age the org accepts volunteers
 *   weeklyHoursRequired (number)  hours per week the org expects
 * ===========================================================================
 * Lines marked "// VERIFY" are placeholders still to be confirmed.
 */
window.VOLUNTOOL_ORGS = [
  {
    name: "City of Beverly Hills Volunteer Program",
    description: "City-run volunteering across senior nutrition, the public library, the annual Art Show, Concerts on Canon, and community events.",
    address: "455 N Rexford Dr, Beverly Hills, CA 90210",
    category: "Community",
    link: "https://www.beverlyhills.org/343/Volunteering",
    minAge: 14, // grades 9-12 and up
    weeklyHoursRequired: 2 // VERIFY — flexible/event-based, not a fixed weekly amount
  },
  {
    name: "Friends of Beverly Gardens Park",
    description: "Volunteer group that helps restore and maintain the historic Beverly Gardens Park along Santa Monica Blvd.",
    address: "Beverly Gardens Park, Santa Monica Blvd, Beverly Hills, CA 90210", // VERIFY
    latitude: 34.0722931,  // from "Beverly Gardens Park, Beverly Hills, CA" — the street address didn't geocode
    longitude: -118.4035049,
    category: "Environment",
    link: "https://www.beverlyhills.org/480/Community-Groups", // VERIFY
    minAge: 14, // grades 9-12 and up
    weeklyHoursRequired: 2 // VERIFY — event-based
  },
  {
    name: "Dream Street Foundation",
    description: "Runs free camps for children and young adults with serious medical conditions; volunteers serve as camp counselors and companions.",
    address: "Beverly Hills, CA 90210", // VERIFY — exact street address
    category: "Children / Health",
    link: "https://dreamstreetfoundation.org", // VERIFY
    minAge: 19,
    weeklyHoursRequired: 4 // VERIFY — intensive during camp sessions
  },
  {
    name: "TreePeople",
    description: "Environmental nonprofit focused on tree planting and ecosystem restoration; runs regular public volunteer events.",
    address: "12601 Mulholland Dr, Beverly Hills, CA 90210",
    latitude: 34.1290474,  // Coldwater Canyon Park (TreePeople HQ) — the street address didn't geocode
    longitude: -118.4020473,
    category: "Environment",
    link: "https://www.treepeople.org",
    minAge: 5, // with adult guardian
    weeklyHoursRequired: 3 // typical event length
  },
  {
    name: "Teen BHEF (Beverly Hills Education Foundation)",
    description: "Student volunteer group for grades 7-12 doing service projects and fundraising to support Beverly Hills schools.",
    address: "255 S Lasky Dr, Beverly Hills, CA 90212", // VERIFY
    category: "Education / Youth",
    link: "https://www.bhef.org", // VERIFY
    minAge: 12, // grades 7-12
    weeklyHoursRequired: 1 // VERIFY — flexible/event-based
  }

  // PENDING — uncomment and fill minAge when replies arrive:
  // {
  //   name: "The Amanda Foundation",
  //   description: "No-kill animal rescue with a full veterinary hospital; volunteers help with dog walking, cat care, and adoption events.",
  //   address: "351 N Foothill Rd, Beverly Hills, CA 90210",
  //   category: "Animals",
  //   link: "https://amandafoundation.org/get-involved/",
  //   minAge: ???, // awaiting email reply
  //   weeklyHoursRequired: 2 // VERIFY
  // },
  // {
  //   name: "Friends of Greystone",
  //   description: "Volunteer group raising funds and running events to restore the historic Greystone/Doheny estate.",
  //   address: "905 Loma Vista Dr, Beverly Hills, CA 90210", // VERIFY
  //   category: "Historic Preservation",
  //   link: "https://www.friendsofgreystone.org", // VERIFY
  //   minAge: ???, // awaiting email reply
  //   weeklyHoursRequired: 2 // VERIFY
  // }
];
