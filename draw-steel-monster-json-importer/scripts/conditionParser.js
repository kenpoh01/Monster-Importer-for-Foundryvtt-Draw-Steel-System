// conditionParser.js

const supportedConditions = [
  "bleeding", "dazed", "grabbed", "frightened", "prone",
  "restrained", "slowed", "taunted", "weakened"
];

const durationMap = {
  turn: "turn",
  "eot": "turn",
  "end of turn": "turn",
  save: "save",
  "save ends": "save",
  encounter: "encounter",
  "end of encounter": "encounter",
  respite: "respite",
  "next respite": "respite"
};

export function parseCondition(text = "") {
  const lower = text.toLowerCase();

  const conditionMatch = supportedConditions.find(cond => lower.includes(cond));
  if (!conditionMatch) return null;

  const potencyMatch = lower.match(/\b([marip])\s*<\s*(\d+)/i);
  const potency = potencyMatch ? `${potencyMatch[1]} < ${potencyMatch[2]}` : null;

  const durationKey = Object.keys(durationMap).find(key => lower.includes(key));
  const duration = durationMap[durationKey] || "save";

  let narrative = text;
  if (potencyMatch) narrative = narrative.replace(potencyMatch[0], "");
  if (durationKey) narrative = narrative.replace(durationKey, "");
  narrative = narrative.replace(conditionMatch, "");
  narrative = narrative.replace(/I\s*<\s*\d+/i, "");
  narrative = narrative.replace(/\(\s*ends\s*\)/i, "(save ends)");
  narrative = narrative.replace(/[\.;]/g, "").replace(/\s+/g, " ").trim();

  return {
    condition: conditionMatch,
    potency,
    duration,
    narrative
  };
}