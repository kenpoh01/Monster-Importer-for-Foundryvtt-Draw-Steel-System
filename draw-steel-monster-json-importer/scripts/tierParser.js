export function parseTierText(text = "") {
  const result = {
    value: 0,
    types: [],
    movement: null,
    condition: null,
    potency: null,
    narrative: ""
  };

  const original = text;

  // 🔢 Damage value and type
  const damageMatch = text.match(/(\d+)\s*(\w+)?\s*damage/i);
  if (damageMatch) {
    result.value = Number(damageMatch[1]);
    const type = damageMatch[2]?.toLowerCase();
    if (type && !["damage"].includes(type)) result.types.push(type);
    text = text.replace(damageMatch[0], "");
  }

  // 🧭 Movement
  const moveMatch = text.match(/(slide|pull|push|shift)\s*(\d+)/i);
  if (moveMatch) {
    result.movement = {
      type: moveMatch[1].toLowerCase(),
      distance: Number(moveMatch[2])
    };
    text = text.replace(moveMatch[0], "");
  }

  // 🧠 Condition
  const conditionMatch = text.match(/\b(grabbed|dazed|weakened|wet)\b/i);
  if (conditionMatch) {
    result.condition = conditionMatch[1].toLowerCase();
    text = text.replace(conditionMatch[0], "");
  }

  // ⚡ Potency trigger
  const potencyMatch = text.match(/a\s*<\s*(\d+)/i);
  if (potencyMatch) {
    result.potency = `a < ${potencyMatch[1]}`;
    text = text.replace(potencyMatch[0], "");
  }

  // 🧾 Narrative fallback
  const leftover = text.replace(/[.;]/g, "").trim();
  if (leftover.length > 0) {
    result.narrative = leftover;
  }

  // 🧪 Debug log
  console.log("🧪 Parsed tier:", original, JSON.stringify(result, null, 2));

  return result;
}

export function parseTarget(targetText) {
  if (!targetText || typeof targetText !== "string") return { type: "special", value: null };

  const numberWords = {
    one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10
  };

  const lower = targetText.toLowerCase();
  let value = null;

  for (const [word, num] of Object.entries(numberWords)) {
    if (lower.includes(word)) {
      value = num;
      break;
    }
  }

  if (lower.includes("all") || lower.includes("each") || lower.includes("every")) {
    value = null;
  }

  let type = "special";

  if (lower.includes("creatures or objects")) type = "creatureObject";
  else if (lower.includes("creature")) type = "creature";
  else if (lower.includes("object")) type = "object";
  else if (lower.includes("enemy")) type = "enemy";
  else if (lower.includes("ally")) type = "ally";
  else if (lower.includes("self or ally")) type = "selfOrAlly";
  else if (lower.includes("self or creature")) type = "selfOrCreature";
  else if (lower.includes("self ally")) type = "selfAlly";
  else if (lower.includes("self")) type = "self";

  return { type, value };
}