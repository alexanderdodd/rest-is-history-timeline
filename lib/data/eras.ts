import type { Era } from "./types";

export const ERAS: Era[] = [
  { id: "ancient", name: "Ancient", startYear: -3000, endYear: -500 },
  { id: "classical", name: "Classical", startYear: -500, endYear: 500 },
  { id: "medieval", name: "Medieval", startYear: 500, endYear: 1500 },
  { id: "early-modern", name: "Early Modern", startYear: 1500, endYear: 1800 },
  { id: "modern", name: "Modern", startYear: 1800, endYear: 1945 },
  { id: "contemporary", name: "Contemporary", startYear: 1945, endYear: 2100 },
];

export const ERA_BY_ID: Record<string, Era> = Object.fromEntries(
  ERAS.map((e) => [e.id, e]),
);
