// All site-wide copy lives here. Edit freely; components read from this file.
// Values containing "TODO" are rendered as an em dash (—) in the UI, never as raw text.

export const site = {
  name: "Divyam Gupta",
  tagline: "Economics student · technology risk · camper",
  location: "San José, CA",
  email: "you@example.com", // TODO: real email
  linkedin: "https://www.linkedin.com/in/TODO", // TODO
  github: "https://github.com/TODO", // TODO
  resume: "/resume.pdf",
  graduation: "May 2027",
  availability: "June 2027",
  year: 2026,

  hero: {
    primaryCta: "View work",
    secondaryCta: "Resume",
  },

  about: {
    statement:
      "I study economics and technology risk at San José State, and I spend my free time somewhere without Wi-Fi.",
    // phrases in the statement that get their own colour
    highlights: [
      { text: "economics", hue: "gold" },
      { text: "technology risk", hue: "sky" },
      { text: "without Wi-Fi", hue: "pine" },
    ],
    portrait: "", // e.g. "/photos/portrait.jpg". Empty = neutral placeholder frame.
    portraitAlt: "Portrait of Divyam Gupta",
    caption: "FIG. 01",
    spec: [
      { label: "Based in", value: "San José, CA" },
      { label: "Studying", value: "B.S. Economics, SJSU" },
      { label: "Graduating", value: "May 2027" },
    ],
  },

  // "Now": what's happening at the moment. Each item is a card.
  now: {
    title: "Right now",
    intro: "Senior year, a tech risk internship, and the search for a full-time role in 2027. The trip planning never stops either.",
    items: [
      {
        kicker: "Studying",
        title: "Senior year at SJSU",
        body: "B.S. Economics with a minor in Business. Graduating May 2027.",
        hue: "dawn",
      },
      {
        kicker: "Working",
        title: "Tech risk intern, EY",
        body: "IT general controls audits and SOX controls testing, including client site visits.",
        hue: "sky",
      },
      {
        kicker: "Looking for",
        title: "Full-time roles, 2027",
        body: "New-grad roles in IT audit, tech risk, internal audit and risk management.",
        hue: "trail",
      },
      {
        kicker: "Community",
        title: "IIA student member",
        body: "Student member of the Institute of Internal Auditors, learning the profession beyond the classroom.",
        hue: "pine",
      },
    ],
  },

  // "Field guide": IT general controls explained in plain English.
  toolkit: {
    title: "The terrain I work in",
    intro: "IT general controls, in plain English: the checks that keep the systems behind the numbers trustworthy.",
    domains: [
      {
        id: "access",
        code: "ITGC-01",
        title: "Access",
        line: "The right people, and only the right people, can get in.",
        examples: ["Joiners, movers and leavers", "Periodic user access reviews", "Privileged and admin accounts", "Password and authentication settings"],
        hue: "sky",
      },
      {
        id: "change",
        code: "ITGC-02",
        title: "Change",
        line: "Nothing reaches production without being requested, tested and approved.",
        examples: ["Change tickets and approvals", "Testing before release", "Developers kept out of production", "Emergency change handling"],
        hue: "trail",
      },
      {
        id: "operations",
        code: "ITGC-03",
        title: "Operations",
        line: "Systems run the way they should, and recover when they don't.",
        examples: ["Scheduled job monitoring", "Backups and restores", "Incident and problem management", "Cloud and third-party reliance (SOC reports)"],
        hue: "pine",
      },
      {
        id: "development",
        code: "ITGC-04",
        title: "Development",
        line: "New systems and data moves are built with controls from day one.",
        examples: ["Project approvals", "User acceptance testing", "Data conversion checks", "Go-live sign-off"],
        hue: "dusk",
      },
    ],
    // How a control gets tested, step by step.
    process: [
      { title: "Understand", body: "What could go wrong, and which control stops it." },
      { title: "Walk through", body: "Follow one example end to end with the control owner." },
      { title: "Sample", body: "Pick the items to test across the period." },
      { title: "Test", body: "Check design and operating effectiveness against evidence." },
      { title: "Document", body: "Workpapers clear enough for a reviewer to re-perform." },
    ],
  },

  skills: {
    work: ["SOX controls", "IT general controls", "Audit documentation", "Excel", "Python", "Economics"],
    outdoors: ["Trip planning", "Navigation", "Backpacking", "Photography"],
  },

  contact: {
    headline: "Let's talk.",
    intro: "Recruiters, collaborators, and anyone with a good campsite recommendation.",
  },

  // Section labels used in the HUD and section headers. Order = scroll order.
  sections: [
    { id: "hero", label: "The Bay" },
    { id: "about", label: "About" },
    { id: "now", label: "Now" },
    { id: "experience", label: "Experience" },
    { id: "toolkit", label: "Field Guide" },
    { id: "trail-map", label: "Trail Map" },
    { id: "gallery", label: "Gallery" },
    { id: "skills", label: "Skills" },
    { id: "contact", label: "Contact" },
  ],
};

/** Index of a section in scroll order (drives camera poses and time of day). */
export function sectionIndex(id: string): number {
  return site.sections.findIndex((s) => s.id === id);
}

/** Colour families used by cards, tags and placeholder art. */
export type Hue = "dawn" | "sky" | "trail" | "pine" | "dusk" | "gold";
export const hues: Record<Hue, { a: string; b: string }> = {
  dawn: { a: "#ff8a5b", b: "#c084fc" },
  sky: { a: "#38bdf8", b: "#4fd1c5" },
  trail: { a: "#ff6a2b", b: "#fbbf24" },
  pine: { a: "#34d399", b: "#4fd1c5" },
  dusk: { a: "#a78bfa", b: "#f472b6" },
  gold: { a: "#fbbf24", b: "#ff8a5b" },
};

/** Render helper: anything still marked TODO shows as an em dash. */
export function display(value: string | undefined | null): string {
  if (!value || /TODO/i.test(value)) return "—";
  return value;
}

export function isTodo(value: string | undefined | null): boolean {
  return !value || /TODO/i.test(value);
}
