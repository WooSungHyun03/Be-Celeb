// Documents team roles for UI and documentation references.
export const TEAM_ROLES = [
  "team-lead",
  "frontend",
  "backend",
  "data-design",
] as const;

export type TeamRole = (typeof TEAM_ROLES)[number];
