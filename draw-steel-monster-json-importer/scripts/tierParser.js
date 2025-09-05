// tierParser.js
import { parseDamage } from "./damageParser.js";
import { parseCondition } from "./conditionParser.js";
import { parseMovement } from "./movementParser.js";

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
  console.log("🔍 Parsing tier text:", original);

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

  // ⚠️ Condition
  const condition = parseCondition(text);
  if (condition) {
    result.condition = condition.condition;
    result.potency = condition.potency;
    result.narrative = condition.narrative;
  } else {
    const leftover = text.replace(/[\.;]/g, "").trim();
    if (leftover.length > 0) {
      result.narrative = leftover;
    }
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

export function mapCharacteristic(letter) {
  const map = {
    m: "might",
    a: "agility",
    r: "reason",
    i: "intuition",
    p: "presence"
  };
  return map[letter?.toLowerCase()] || "none";
}