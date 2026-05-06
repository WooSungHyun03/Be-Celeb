// Defines shared rule type identifiers for future rule-based recommendation logic.
export const RULE_TYPES = ["category-fit", "platform-fit", "trend-score", "creator-goal"] as const;

export type RuleType = (typeof RULE_TYPES)[number];
