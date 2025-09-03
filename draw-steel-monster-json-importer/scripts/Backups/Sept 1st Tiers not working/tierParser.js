const randomID = foundry.utils.randomID;

export function parseTierText(text = "") {
  console.log("🔍 Parsing tier text:", text);

  const result = {
    value: 0,
    types: [],
    movement: null,
    condition: null,
    potency: null,
    narrative: ""
  };

  const damageMatch = text.match(/(\d+)\s*(\w+)?\s*damage/i);
  if (damageMatch) {
    result.value = Number(damageMatch[1]);
    const type = damageMatch[2]?.toLowerCase();
    if (type && !["damage"].includes(type)) result.types.push(type);
    text = text.replace(damageMatch[0], "");
  }

  const moveMatch = text.match(/(slide|pull|push|shift)\s*(\d+)/i);
  if (moveMatch) {
    result.movement = {
      name: moveMatch[1].toLowerCase(),
      type: "forced",
      distance: Number(moveMatch[2]),
      img: null
    };
    text = text.replace(moveMatch[0], "");
  }

  const conditionMatch = text.match(/\b(bleeding|dazed|grabbed|frightened|prone|restrained|slowed|taunted|weakened)\b/i);
  if (conditionMatch) {
    result.condition = conditionMatch[1].toLowerCase();
    text = text.replace(conditionMatch[0], "");
  }

  const potencyMatch = text.match(/\b([marip])\s*<\s*(\d+)/i);
  if (potencyMatch) {
    result.potency = {
      raw: potencyMatch[0],
      characteristic: mapCharacteristic(potencyMatch[1]),
      threshold: Number(potencyMatch[2])
    };
    text = text.replace(potencyMatch[0], "");
  }

  const leftover = text.replace(/[\.;]/g, "").trim();
  if (leftover.length > 0) {
    result.narrative = leftover;
  }

  return result;
}

function mapCharacteristic(letter) {
  const map = {
    m: "might",
    a: "agility",
    r: "reason",
    i: "intuition",
    p: "presence"
  };
  return map[letter.toLowerCase()] || "none";
}

export function buildEffectsFromTiers(tierText = "", highestCharacteristic = "none") {
  const effects = {};
  const chunks = tierText.includes(";") ? tierText.split(";").map(s => s.trim()) : [tierText.trim()];
  const potencyMap = ["@potency.weak", "@potency.average", "@potency.strong"];

  chunks.forEach((chunk, index) => {
    const parsed = parseTierText(chunk);

    for (let i = 0; i < 3; i++) {
      const tier = `tier${i + 1}`;
      const potency = {
        value: potencyMap[i],
        characteristic: parsed.potency?.characteristic || highestCharacteristic
      };

      if (parsed.value > 0) {
        effects.damage = effects.damage || {};
        effects.damage[tier] = {
          value: (parsed.value * (i + 1)).toString(),
          types: parsed.types,
          properties: [],
          potency
        };
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
      }

      if (parsed.condition) {
        effects.applied = effects.applied || {};
        effects.applied[tier] = {
          display: i === 0 ? `{{potency}} ${parsed.condition} ${parsed.narrative || "(save ends)"}` : "",
          potency,
          effects: {
            [parsed.condition]: {
              condition: "failure",
              end: "save",
              properties: []
            }
          }
        };
      }

      if (parsed.narrative && !parsed.condition) {
        effects.special = effects.special || {};
        effects.special[tier] = {
          display: parsed.narrative,
          potency
        };
      }
    }
  });

  return effects;
}





export function parseTarget(text = "") {
  const lower = text.toLowerCase();
  const numberWords = {
    one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10
  };

  let value = null;
  for (const word in numberWords) {
    if (lower.includes(word)) {
      value = numberWords[word];
      break;
    }
  }

  let type = "creature";
  if (lower.includes("object")) type = "object";
  if (lower.includes("enemy")) type = "enemy";
  if (lower.includes("ally")) type = "ally";
  if (lower.includes("self")) type = "self";

  return { type, value };
}

export function parseDistance(text = "") {
  const lower = text.toLowerCase();
  const match = lower.match(/(ranged|melee)\s*(\d+)/);

  const type = match?.[1] || "melee";
  const primary = match?.[2] ? parseInt(match[2], 10) : 1;

  return { type, primary };
}