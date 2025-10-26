// tierParser.js
import { parseDamage } from "./damageParser.js";
import { parseConditionEffect } from "./conditionParser.js";
import { parseMovement } from "./movementParser.js";
import { characteristicMap } from "./keywordParser.js";

export function parseTierText(text = "") {
  const result = {
    value: 0,
    types: [],
    movement: null,
    condition: null,
    potency: null,
    narrative: "",
    trigger: null
  };

  const original = text;

  // 🔥 Damage
  const damage = parseDamage(text);
  if (damage) {
    result.value = damage.value;
    result.types = damage.types;
    text = text.replace(/(\d+)\s*\w*\s*damage/i, "");
  }

  // 🌀 Movement
  const movement = parseMovement(text);
  if (movement) {
    result.movement = {
      name: movement.name,
      type: "forced",
      distance: movement.distance,
      img: null
    };
    text = text.replace(/\b(slide|pull|push|shift)\s*\d+/i, "");
  }

  // ⚠️ Triggered condition (e.g. "A < 1 the target is warped (save ends)", or M < 2 the target is blood soaked (save ends)"
  const triggerMatch = text.match(/([ARMIP])\s*<\s*(\d+)\s+the target is ([a-z]+(?:\s+[a-z]+)*)(?:\s*\(save ends\))?/i);
  if (triggerMatch) {
    const [, statLetter, threshold, conditionText] = triggerMatch;
    const stat = characteristicMap[statLetter.toUpperCase()] || "none";
    const conditionData = parseConditionEffect(conditionText);

    result.trigger = { stat, threshold: parseInt(threshold) };
    result.condition = conditionData.condition;
    result.potency = conditionData.saveEnds ? "saveEnds" : null;
    result.narrative = conditionData.type === "other" ? conditionText : "";
  } else {
    // ⚠️ General condition or narrative
    const conditionData = parseConditionEffect(text);
    result.condition = conditionData.condition;
    result.potency = conditionData.saveEnds ? "saveEnds" : null;
    result.narrative = conditionData.type === "other" ? text.replace(/[\.;]/g, "").trim() : "";
  }

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
