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

function mapCharacteristic(letter) {
  const map = {
    m: "might",
    a: "agility",
    r: "reason",
    i: "intuition",
    p: "presence"
  };
  return map[letter?.toLowerCase()] || "none";
}

export function buildEffectsFromTiers(tierText = "", highestCharacteristic = "none") {
  const effects = {};
  const chunks = tierText.includes(";") ? tierText.split(";").map(s => s.trim()) : [tierText.trim()];
  const potencyMap = ["@potency.weak", "@potency.average", "@potency.strong"];

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

  chunks.forEach((chunk) => {
    const parsed = parseTierText(chunk);
    const effectId = foundry.utils.randomID();

    const effect = {
      _id: effectId,
      name: "",
      img: null
    };

    // 🔥 Damage effect (no scaling)
    if (parsed.value > 0) {
      effect.type = "damage";
      effect.damage = {};

      for (let i = 0; i < 3; i++) {
        const tier = `tier${i + 1}`;
        effect.damage[tier] = {
          value: parsed.value.toString(), // ← no multiplication
          types: parsed.types,
          properties: [],
          potency: {
            value: potencyMap[i],
            characteristic: "none"
          }
        };
      }
    }

    // ⚠️ Applied condition effect
    if (parsed.condition) {
      effect.type = "applied";
      effect.name = parsed.condition.charAt(0).toUpperCase() + parsed.condition.slice(1);
      effect.applied = {};

      const durationKey = Object.keys(durationMap).find(key =>
        parsed.narrative?.toLowerCase().includes(key)
      );
      const duration = durationMap[durationKey] || "save";

      for (let i = 0; i < 3; i++) {
        const tier = `tier${i + 1}`;
        effect.applied[tier] = {
          display: i === 0 ? `{{potency}} ${parsed.condition} ${parsed.narrative || "(save ends)"}` : "",
          potency: {
            value: potencyMap[i],
            characteristic: mapCharacteristic(parsed.potency?.[0] || highestCharacteristic)
          },
          effects: {
            [parsed.condition]: {
              condition: "failure",
              end: duration,
              properties: []
            }
          }
        };
      }
    }

    // 🌀 Forced movement effect
    if (parsed.movement) {
      effect.type = "forced";
      effect.name = parsed.movement.name;
      effect.forced = {};

      for (let i = 0; i < 3; i++) {
        const tier = `tier${i + 1}`;
        effect.forced[tier] = {
          movement: [parsed.movement.name],
          distance: parsed.movement.distance.toString(), // ← no scaling
          display: "{{forced}}",
          properties: [],
          potency: {
            value: potencyMap[i],
            characteristic: highestCharacteristic
          }
        };
      }
    }

    // ✨ Narrative-only special effect
    if (parsed.narrative && !parsed.condition && !parsed.value && !parsed.movement) {
      effect.type = "special";
      effect.name = "Special";
      effect.special = {};

      for (let i = 0; i < 3; i++) {
        const tier = `tier${i + 1}`;
        effect.special[tier] = {
          display: parsed.narrative,
          potency: {
            value: potencyMap[i],
            characteristic: highestCharacteristic
          }
        };
      }
    }

    if (effect.type) {
      effects[effectId] = effect;
    }
  });

  console.log("✅ Final effects object:", JSON.stringify(effects, null, 2));
  return effects;
}

