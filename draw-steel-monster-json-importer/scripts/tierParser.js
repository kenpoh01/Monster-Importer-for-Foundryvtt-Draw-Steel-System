export function parseTierText(text = "") {
  const result = {
    value: 0,
    types: [],
    movement: null,
    condition: null,
    potency: null
  };

  const original = text;
  console.log("🔍 Parsing tier text:", original);

  // 🔢 Damage value and type
  const damageMatch = text.match(/(\d+)\s*(\w+)?\s*damage/i);
  if (damageMatch) {
    console.log("💥 Damage match:", damageMatch);
    result.value = Number(damageMatch[1]);
    const type = damageMatch[2]?.toLowerCase();
    if (type && !["damage"].includes(type)) result.types.push(type);
    text = text.replace(damageMatch[0], "");
  }

  // 🧭 Movement
  const moveMatch = text.match(/(slide|pull|push|shift)\s*(\d+)/i);
  if (moveMatch) {
    console.log("🧭 Movement match:", moveMatch);
    result.movement = {
      name: moveMatch[1].toLowerCase(),
      type: "forced",
      distance: Number(moveMatch[2]),
      img: null
    };
    text = text.replace(moveMatch[0], "");
  }

  // 🧠 Condition
  const conditionMatch = text.match(/\b(bleeding|dazed|grabbed|frightened|prone|restrained|slowed|taunted|weakened)\b/i);
  if (conditionMatch) {
    console.log("🧠 Condition match:", conditionMatch);
    result.condition = conditionMatch[1].toLowerCase();
    text = text.replace(conditionMatch[0], "");
  }

  // ⚡ Potency trigger
  const potencyMatch = text.match(/\b([marip])\s*<\s*(\d+)/i);
  if (potencyMatch) {
    console.log("⚡ Potency match:", potencyMatch);
    result.potency = `${potencyMatch[1]} < ${potencyMatch[2]}`;
    text = text.replace(potencyMatch[0], "");
  }

  // 🧾 Narrative fallback
  const leftover = text.replace(/[\.;]/g, "").trim();
  if (leftover.length > 0) {
    console.log("🧾 Narrative leftover:", leftover);
    result.narrative = leftover;
  }

  console.log("🧪 Final parsed tier:", JSON.stringify(result, null, 2));
  return result;
}

export function parseTarget(targetText) {
  if (!targetText || typeof targetText !== "string") return { type: "special", value: null };

  console.log("🎯 Parsing target:", targetText);
  const numberWords = {
    one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10
  };

  const lower = targetText.toLowerCase();
  let value = null;

  for (const [word, num] of Object.entries(numberWords)) {
    if (lower.includes(word)) {
      console.log("🔢 Found number word:", word);
      value = num;
      break;
    }
  }

  if (lower.includes("all") || lower.includes("each") || lower.includes("every")) {
    console.log("🔢 Found universal target keyword");
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

  console.log("🎯 Final target type:", type, "value:", value);
  return { type, value };
}

export function buildEffectsFromTiers(tierText = "", highestCharacteristic = "none") {
  const effects = {};
  const chunks = tierText.includes(";") ? tierText.split(";").map(s => s.trim()) : [tierText.trim()];

  console.log("🧱 Building effects from:", tierText);

  chunks.forEach((chunk, index) => {
    console.log(`🔹 Parsing chunk ${index + 1}:`, chunk);
    const parsed = parseTierText(chunk);
    const potencyMap = ["@potency.weak", "@potency.average", "@potency.strong"];

    for (let i = 0; i < 3; i++) {
      const tier = `tier${i + 1}`;
      const potency = {
        value: potencyMap[i],
        characteristic: highestCharacteristic
      };

      if (parsed.value > 0) {
        effects.damage = effects.damage || {};
        effects.damage[tier] = {
          value: (parsed.value * (i + 1)).toString(),
          types: parsed.types,
          properties: [],
          potency
        };
        console.log(`💥 Added damage for ${tier}:`, effects.damage[tier]);
      }

      if (parsed.movement) {
        effects.forced = effects.forced || {};
        effects.forced[tier] = {
          movement: [parsed.movement.name],
          distance: (parsed.movement.distance * (i + 1)).toString(),
          display: "{{forced}}",
          properties: [],
          potency
        };
        console.log(`🧭 Added movement for ${tier}:`, effects.forced[tier]);
      }

      if (parsed.condition) {
        effects.applied = effects.applied || {};
        effects.applied[tier] = {
          display: i === 0 ? `{{potency}} ${parsed.condition} (save ends)` : "",
          potency,
          effects: {
            [parsed.condition]: {
              condition: "failure",
              end: "save",
              properties: []
            }
          }
        };
        console.log(`🧠 Added applied condition for ${tier}:`, effects.applied[tier]);
      }

      if (parsed.narrative) {
        effects.special = effects.special || {};
        effects.special[tier] = {
          description: parsed.narrative,
          potency
        };
        console.log(`🧾 Added narrative for ${tier}:`, effects.special[tier]);
      }
    }
  });

  console.log("✅ Final effects object:", JSON.stringify(effects, null, 2));
  return effects;
}
