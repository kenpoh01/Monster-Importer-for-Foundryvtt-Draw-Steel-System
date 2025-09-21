// KeywordParser that stores them in a centralized location

export const characteristicMap = {
  A: "agility", R: "reason", M: "might", I: "intuition", P: "presence"
};



// ✅ Centralized vocabularies for monster schema

export const validRoles = [
  "ambusher", "artillery", "brute", "controller", "defender",
  "harrier", "hexer", "leader", "minion", "mount", "solo", "support"
];

export const validOrganizations = [
  "minion", "horde", "platoon", "elite", "leader", "solo"
];

export const validMovementTypes = [
  "walk", "fly", "swim", "burrow", "climb", "teleport", "hover" // ✅ hover added
];

export const validAncestryKeywords = [
  "abyssal", "accursed", "animal", "beast", "construct", "dragon",
  "elemental", "fey", "giant", "horror", "humanoid", "infernal",
  "plant", "swarm", "undead"
];

export const supportedConditions = new Set([
  "bleeding", "dazed", "grabbed", "frightened", "prone",
  "restrained", "slowed", "taunted", "weakened"
]);

// ✅ Custom effects not listed in Heroes book p.77
export const customEffectRegistry = new Set([
  "warped", "dragonsealed", "entangled", "phased", "corrupted",
  "marked", "unstable", "banished", "fractured"
]);

// ✅ Duration keywords used in condition and effect parsing
export const durationMap = {
  "eot": "endOfTurn",
  "end of turn": "endOfTurn",
  "start of turn": "startOfTurn",
  "save ends": "saveEnds",
  "until moved": "untilMoved",
  "until damaged": "untilDamaged",
  "until end of round": "endOfRound",
  "until end of encounter": "endOfEncounter"
};


export const allConditions = new Set([
  ...supportedConditions,
  ...customEffectRegistry
]);

/**
 * Checks whether a given text contains a known custom effect.
 * Returns the matched effect name if found, otherwise null.
 */
export function isCustomEffect(text) {
  const lowered = text.toLowerCase();
  for (const effect of customEffectRegistry) {
    if (lowered.includes(effect)) return effect;
  }
  return null;
}

/**
 * Heuristically determines whether a line is likely a keyword/action line.
 * Prevents misclassification of narrative lines like "They can..." as keywords.
 */
export function isLikelyKeywordLine(line) {
  const tokens = line.split(/(?:,\s*|\s+)(?=[A-Z])/).map(t => t.trim());
  const capitalized = tokens.filter(t => /^[A-Z]/.test(t));
  return capitalized.length >= 2 || /main action|maneuver|reaction|triggered|free maneuver/i.test(line);
}

export function parseKeywordLine(line) {
  let type = "special";
  const keywords = [];

  // Split on comma OR space followed by capital letter
  const tokens = line.split(/(?:,\s*|\s+)(?=[A-Z])/).map(t => t.trim());

  for (const token of tokens) {
    const lowered = token.toLowerCase();

    if (lowered.includes("main action")) type = "main";
    else if (lowered.includes("maneuver")) type = "maneuver";
    else if (lowered.includes("reaction")) type = "reaction";
    else if (lowered.includes("triggered action") || lowered.includes("triggered")) type = "triggered";
    else if (lowered.includes("free maneuver")) type = "maneuver";
    else keywords.push(token);
  }

  return { type, keywords };
}


/**
 * Determines whether a line is narrative (not a keyword or structural line).
 */
export function isNarrativeLine(line) {
  if (!line || line.length < 2) return false;

  const trimmed = line.trim();

  if (/^[123áéí]\s+\d+/.test(trimmed)) return false;
  if (/^[A-Z][a-z]+(,\s*[A-Z][a-z]+)*\s+(Main|Triggered|Reaction|Maneuver) action$/i.test(trimmed)) return false;
  if (/^Effect:/i.test(trimmed)) return false;

  return /[.,!?;:"'()]/.test(trimmed);
}