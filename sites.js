/*
 * Voluntool — Online volunteering websites (single source of truth).
 * ===========================================================================
 * This one list drives BOTH the "Browse Online Volunteering Websites" grid on
 * websites.html AND the "Websites" dropdown in the Online section nav bar.
 * Add a company here and it automatically appears in both places.
 *
 * FIELDS:
 *   name       (text)  company / platform name (shown in the grid + dropdown)
 *   page       (text)  that company's individual page, e.g. "schoolhouse.html"
 *   blurb      (text)  one-line description on the grid card
 *   icon       (text)  emoji shown on the grid card
 *   iconBg     (text)  card icon background color
 *   badge      (text)  small tag on the grid card
 *   badgeClass (text)  optional CSS class for the badge (e.g. "badge-purple")
 *   badgeStyle (text)  optional inline style for the badge (used if no class)
 * ===========================================================================
 */
window.VOLUNTOOL_SITES = [
  {
    name: "Schoolhouse.world",
    page: "schoolhouse.html",
    blurb: "A peer tutoring platform founded by Sal Khan with live, interactive sessions across many subjects.",
    icon: "📘",
    iconBg: "#EEF2FF",
    badge: "All subjects",
    badgeClass: "badge-purple"
  },
  {
    name: "UpChieve",
    page: "upchieve.html",
    blurb: "On-demand volunteering where you can jump in whenever you have time and help a student instantly.",
    icon: "⚡",
    iconBg: "#E0F2FE",
    badge: "On-demand",
    badgeClass: "badge-blue"
  },
  {
    name: "Wise Readers to Leaders",
    page: "wise-readers.html",
    blurb: "A literacy-focused option that helps students build reading confidence over time through repeated support.",
    icon: "📖",
    iconBg: "#ECFDF5",
    badge: "Literacy focus",
    badgeClass: "badge-green"
  },
  {
    name: "Learn to Be",
    page: "learn-to-be.html",
    blurb: "A long-term tutoring opportunity where volunteers build consistent relationships with students over time.",
    icon: "🌱",
    iconBg: "#FFFBEB",
    badge: "Long-term match",
    badgeClass: "badge-amber"
  },
  {
    name: "Reading Partners",
    page: "reading-partners.html",
    blurb: "Another strong option for structured, one-on-one support, especially for younger readers.",
    icon: "📖",
    iconBg: "#FFF7ED",
    badge: "In-person & Online",
    badgeStyle: "background:#FFF7ED;color:#C2410C;"
  }
];
