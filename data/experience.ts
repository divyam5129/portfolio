// Experience: "The climb". Each chapter is a waypoint on the elevation profile,
// in order from the trailhead up. Keep bullets factual: no invented metrics,
// awards or dates. "TODO" values render as an em dash.

import type { Hue } from "./site";

export type Chapter = {
  id: string;
  kind: "education" | "role";
  /** short label under the waypoint on the elevation profile */
  waypoint: string;
  title: string;
  org: string;
  period: string;
  summary: string;
  bullets: string[];
  tags: string[];
  hue: Hue;
};

export const chapters: Chapter[] = [
  {
    id: "sjsu",
    kind: "education",
    waypoint: "SJSU",
    title: "Economics, SJSU",
    org: "San José State University",
    period: "2023–2027", // TODO: confirm start year
    summary: "B.S. Economics with a minor in Business.",
    bullets: [
      "B.S. Economics, minor in Business, expected May 2027.",
      "Student member, Institute of Internal Auditors (IIA).",
    ],
    tags: ["Economics", "Business", "IIA"],
    hue: "gold",
  },
  {
    id: "ra",
    kind: "role",
    waypoint: "Resident Advisor",
    title: "Resident Advisor",
    org: "University Housing Services, SJSU",
    period: "TODO", // TODO: dates
    summary: "Community, mediation and first response in the residence halls.",
    bullets: [
      "Supported and mentored residents through the academic year.",
      "Mediated roommate and floor conflicts and ran community programming.",
      "Served as first responder for residence-hall issues.",
    ],
    tags: ["Leadership", "Conflict resolution", "Community"],
    hue: "dawn",
  },
  {
    id: "library",
    kind: "role",
    waypoint: "Library",
    title: "Library Shifts",
    org: "SJSU Library",
    period: "TODO", // TODO: dates
    summary: "Front-line service alongside a full course load.",
    bullets: ["Reliable front-line service work alongside a full course load."],
    tags: ["Reliability", "Service"],
    hue: "pine",
  },
  {
    id: "ey",
    kind: "role",
    waypoint: "EY",
    title: "Tech Risk Intern",
    org: "EY",
    period: "TODO", // TODO: dates
    summary: "SOX controls testing on an engagement team.",
    bullets: [
      "Tested IT and business controls for SOX compliance.",
      "Documented control evidence and test results.",
      "Worked within an engagement team on audit workpapers.",
    ],
    tags: ["SOX", "ITGC", "Controls testing", "Audit documentation"],
    hue: "sky",
  },
];

/** The last waypoint: where the trail goes next. */
export const summit = {
  waypoint: "Next",
  title: "Next summit",
  line: "Graduating May 2027. Available from June 2027.",
  paths: [
    { title: "Tech controls / risk advisory", hue: "trail" as Hue },
    { title: "Finance & economics analytics", hue: "dusk" as Hue },
  ],
};
