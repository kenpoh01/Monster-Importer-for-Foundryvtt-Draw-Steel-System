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
  const leftover = text.replace(/[\.;]/g, "").trim();
  if (leftover.length > 0) {
    result.narrative = leftover;
  }

  // 🧪 Debug log
  console.log("🧪 Parsed tier:", original, JSON.stringify(result, null, 2));

  return result;
}

