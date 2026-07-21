/*
 * Voluntool — volunteer organizations shown on the Map page.
 * ===========================================================================
 * HOW TO ADD YOUR OWN ORGANIZATION:
 *   1. Copy one whole { ... } block below.
 *   2. Paste it into the list, keeping a comma between entries.
 *   3. Edit the fields.
 *
 * To find latitude / longitude: open Google Maps, right-click the exact spot,
 * and click the "lat, lng" numbers at the top of the menu to copy them.
 *
 * FIELDS (all required except where noted):
 *   name                (text)    organization name
 *   description         (text)    one-line summary — optional
 *   address             (text)    street address — optional
 *   latitude            (number)  e.g. 34.0522
 *   longitude           (number)  e.g. -118.2437
 *   category            (text)    e.g. "Tutoring" — optional
 *   link                (text)    website URL — optional
 *   minAge              (number)  youngest age the org accepts volunteers
 *   weeklyHoursRequired (number)  hours per week the org expects
 * ===========================================================================
 * The samples below are spread around Los Angeles with a mix of minAge and
 * weeklyHoursRequired so the radius / age / hours filters are easy to see.
 */
window.VOLUNTOOL_ORGS = [
  {
    name: "Sample: Downtown LA Tutors",
    description: "After-school tutoring in math and reading for local students.",
    address: "630 W 5th St, Los Angeles, CA 90071",
    latitude: 34.0407,
    longitude: -118.2468,
    category: "Tutoring",
    link: "https://example.org/dtla-tutors",
    minAge: 16,
    weeklyHoursRequired: 2
  },
  {
    name: "Sample: Hollywood Homework Help",
    description: "Drop-in homework help for middle schoolers, no commitment needed.",
    address: "1623 Ivar Ave, Los Angeles, CA 90028",
    latitude: 34.0928,
    longitude: -118.3287,
    category: "Tutoring",
    link: "https://example.org/hollywood-homework",
    minAge: 13,
    weeklyHoursRequired: 1
  },
  {
    name: "Sample: Glendale Community Learning",
    description: "Reading buddies and literacy support for young readers.",
    address: "222 E Harvard St, Glendale, CA 91205",
    latitude: 34.1425,
    longitude: -118.2551,
    category: "Literacy",
    link: "https://example.org/glendale-learning",
    minAge: 13,
    weeklyHoursRequired: 1
  },
  {
    name: "Sample: Pasadena STEM Mentors",
    description: "Weekly STEM mentoring and science-fair coaching for teens.",
    address: "285 E Walnut St, Pasadena, CA 91101",
    latitude: 34.1478,
    longitude: -118.1445,
    category: "STEM",
    link: "https://example.org/pasadena-stem",
    minAge: 16,
    weeklyHoursRequired: 4
  },
  {
    name: "Sample: Santa Monica Reading Club",
    description: "Small-group reading sessions at the public library.",
    address: "601 Santa Monica Blvd, Santa Monica, CA 90401",
    latitude: 34.0195,
    longitude: -118.4912,
    category: "Literacy",
    link: "https://example.org/santa-monica-reading",
    minAge: 14,
    weeklyHoursRequired: 2
  },
  {
    name: "Sample: Northridge Study Buddies",
    description: "Peer tutoring for high school subjects and test prep.",
    address: "9051 Darby Ave, Northridge, CA 91325",
    latitude: 34.2381,
    longitude: -118.5301,
    category: "Tutoring",
    link: "https://example.org/northridge-study",
    minAge: 16,
    weeklyHoursRequired: 4
  },
  {
    name: "Sample: Long Beach Youth Corps",
    description: "Structured community-service and mentoring program for adults.",
    address: "100 W Broadway, Long Beach, CA 90802",
    latitude: 33.7701,
    longitude: -118.1937,
    category: "Mentoring",
    link: "https://example.org/long-beach-corps",
    minAge: 18,
    weeklyHoursRequired: 6
  },
  {
    name: "Sample: Pomona Literacy Project",
    description: "One-on-one literacy tutoring for elementary students.",
    address: "625 S Garey Ave, Pomona, CA 91766",
    latitude: 34.0551,
    longitude: -117.7500,
    category: "Literacy",
    link: "https://example.org/pomona-literacy",
    minAge: 15,
    weeklyHoursRequired: 2
  }
];
