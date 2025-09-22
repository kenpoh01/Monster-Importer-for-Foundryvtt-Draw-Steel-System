import { parseTierText, parseTarget } from "./tierParser.js";
import { characteristicMap } from "./keywordParser.js";

function normalizeType(type = "", cost = "") {
  const map = {
    "main action": "main",
    "maneuver": "maneuver",
    "free maneuver": "freeManeuver",
    "triggered action": "triggered",
    "free triggered action": "freeTriggered",
    "no action": "none"
  };

  const normalized = map[type.toLowerCase().trim()];
  if (normalized) return normalized;

  if (cost?.toLowerCase().includes("villain action")) return "villain";

  return "main";
}

function getImageForType(type, itemType) {
  const images = {
    ability: {
      main: "icons/skills/melee/strike-polearm-glowing-white.webp",
      maneuver: "icons/magic/air/air-pressure-shield-blue.webp",
      triggered: "icons/skills/movement/arrow-upward-yellow.webp",
      none: "icons/magic/unholy/silhouette-robe-evil-power.webp",
      villain: "icons/magic/death/skull-horned-worn-fire-blue.webp"
    },
    feature: {
      withCaptain: "icons/skills/social/intimidation-impressing.webp",
      default: "icons/creatures/unholy/demon-hairy-winged-pink.webp"
    }
  };

  if (itemType === "feature") {
    return type === "with-captain"
      ? images.feature.withCaptain
      : images.feature.default;
  }

  return images.ability[type] || "";
}

function normalizeDistance(raw = "") {
  const text = raw.toLowerCase().trim();

  if (text.includes("burst")) {
    const primary = Number(text.match(/\d+/)?.[0]) || 1;
    return { type: "burst", primary };
  }

  if (text.includes("cube")) {
    const [primary, secondary] = text.match(/\d+/g)?.map(Number) || [1, 1];
    return { type: "cube", primary, secondary };
  }

  if (text.includes("line")) {
    const [primary, secondary, tertiary] = text.match(/\d+/g)?.map(Number) || [1, 1, 1];
    return { type: "line", primary, secondary, tertiary };
  }

  if (text.includes("aura")) {
    const primary = Number(text.match(/\d+/)?.[0]) || 1;
    return { type: "aura", primary };
  }

  if (text.includes("melee or ranged")) {
    return { type: "meleeRanged", primary: 1 };
  }

  if (text.includes("ranged")) {
    const primary = Number(text.match(/\d+/)?.[0]) || 1;
    return { type: "ranged", primary };
  }

  if (text.includes("melee")) {
    return { type: "melee", primary: 1 };
  }

  if (text.includes("self")) {
    return { type: "self" };
  }

  if (text.includes("special")) {
    return { type: "special" };
  }

  return { type: "melee", primary: 1 };
}

function determineCategory(ability) {
  const costText = ability.cost?.toLowerCase() || "";
  const rawCategory = ability.category?.toLowerCase();

  if (costText.includes("signature")) return "signature";
  if (costText.includes("malice")) return "heroic";
  if (costText.includes("villain")) return "villain";
  if (rawCategory) return rawCategory;

  return "";
}

function formatNarrativeBlock(block) {
  if (!block?.effect) return "";

  let text = block.effect.trim();
  if (text.toLowerCase().startsWith("effect:")) {
    text = text.slice(7).trim(); // Remove "Effect:" prefix
  }

  if (block.name && block.name.toLowerCase() !== "effect") {
    return `<p><strong>${block.name}:</strong> ${text}</p>`;
  }

  return `<p>${text}</p>`;
}

export function parseItems(traits = [], abilities = [], rawData = {}) {
  const items = [];

  const characteristicScores = {
    might: rawData.might ?? 0,
    agility: rawData.agility ?? 0,
    reason: rawData.reason ?? 0,
    intuition: rawData.intuition ?? 0,
    presence: rawData.presence ?? 0
  };
  const highestCharacteristic = Object.entries(characteristicScores)
    .sort((a, b) => b[1] - a[1])[0][0];

  const potencyMap = ["@potency.weak", "@potency.average", "@potency.strong"];

  if (rawData.with_captain) {
    items.push({
      name: "With Captain",
      type: "feature",
      img: getImageForType("with-captain", "feature"),
      system: {
        description: {
          value: `<p><strong>With Captain:</strong> ${rawData.with_captain}</p>`,
          director: ""
        },
        source: {
          book: "Monsters",
          license: "Draw Steel Creator License",
          revision: 1
        },
        _dsid: "with-captain",
        advancements: {}
      },
      effects: [],
      folder: null,
      sort: -100000,
      flags: {},
      _stats: {
        coreVersion: "13.347",
        systemId: "draw-steel",
        systemVersion: "0.8.0",
        lastModifiedBy: null
      }
    });
  }

  traits.forEach((trait, index) => {
    items.push({
      name: trait.name || `Trait ${index + 1}`,
      type: "feature",
      img: getImageForType("default", "feature"),
      system: {
        description: {
          value: trait.effects?.map(e => `<p>${e.effect}</p>`).join("") || "",
          director: ""
        },
        source: {
          book: "Monsters",
          license: "Draw Steel Creator License",
          revision: 1
        },
        _dsid: trait.name?.toLowerCase().replace(/\s+/g, "-") || `trait-${index}`,
        advancements: {}
      }
    });
  });

  abilities.forEach((ability, index) => {
    const damageIndex = ability.effects.findIndex(e => e.t1 || e.t2 || e.t3);
    const damageEffect = ability.effects[damageIndex];
    const tieredDamage = {
      t1: damageEffect?.t1,
      t2: damageEffect?.t2,
      t3: damageEffect?.t3
    };

    const beforeEffects = ability.effects.slice(0, damageIndex);
    const afterEffects = ability.effects.slice(damageIndex + 1);

    const costText = ability.cost?.toLowerCase() || "";
    const isMalice = costText.includes("malice");
    const maliceValue = isMalice ? Number(costText.match(/\d+/)?.[0]) || null : null;

    const category = determineCategory(ability);
    const resource = isMalice ? maliceValue : null;

    const effectGroups = {};

    [tieredDamage.t1, tieredDamage.t2, tieredDamage.t3].forEach((text, i) => {
      if (!text) return;
      const tier = `tier${i + 1}`;
      const potency = {
        value: potencyMap[i],
        characteristic: highestCharacteristic
      };

      const chunks = text.split(";").map(s => s.trim());

      chunks.forEach(chunk => {
        const parsed = parseTierText(chunk);
        const effectType = parsed.value > 0
          ? "damage"
          : parsed.condition
          ? "applied"
          : parsed.movement
          ? "forced"
          : parsed.narrative
          ? "special"
          : null;

        if (!effectType) return;

        const groupKey = `${effectType}-${parsed.condition || parsed.movement?.name || parsed.types?.[0] || "narrative"}`;
        effectGroups[groupKey] = effectGroups[groupKey] || {
          _id: foundry.utils.randomID(),
          type: effectType,
          name: effectType === "applied"
            ? parsed.condition.charAt(0).toUpperCase() + parsed.condition.slice(1)
            : effectType === "forced"
            ? parsed.movement?.name
            : effectType === "special"
            ? "Special"
            : "",
          img: null
        };

        const effect = effectGroups[groupKey];

        if (effectType === "damage") {
          effect.damage = effect.damage || {};
          effect.damage[tier] = {
            value: parsed.value.toString(),
            types: parsed.types,
            properties: [],
            potency: {
              value: potencyMap[i],
              characteristic: i === 0 ? "none" : ""
            }
          };
        }

        if (effectType === "applied") {
          effect.applied = effect.applied || {};
          effect.applied[tier] = {
            display: i === 0 ? `{{potency}} ${parsed.condition} ${parsed.narrative || "(save ends)"}`.trim() : "",
            potency: {
              value: potencyMap[i],
              characteristic: parsed.trigger?.stat || highestCharacteristic
            },
            effects: {
              [parsed.condition]: {
                condition: "failure",
                end: "save",
                properties: []
              }
            }
          };
        }

        if (effectType === "forced") {
          effect.forced = effect.forced || {};
          effect.forced[tier] = {
            movement: [parsed.movement.name],
            distance: parsed.movement.distance.toString(),
            display: "{{forced}}",
            properties: [],
            potency
          };
        }

        if (effectType === "special") {
          effect.special = effect.special || {};
          effect.special[tier] = {
            display: parsed.narrative,
            potency
          };
        }
      });
    });
	
	    const normalizedType = normalizeType(ability.type, ability.cost);
    const distance = normalizeDistance(ability.distance || "");

    const finalEffects = {};
    Object.values(effectGroups).forEach(e => {
      finalEffects[e._id] = e;
    });

    const effectBefore = beforeEffects.map(formatNarrativeBlock).join("");
    const effectAfter = afterEffects.map(block => {
  if (!block?.effect) return "";

  let text = block.effect.trim();

  // Strip leading "Effect:" if present
  if (text.toLowerCase().startsWith("effect:")) {
    text = text.slice(7).trim();
  }

  // Prepend cost as bold label if present
  if (block.cost) {
    text = `<strong>${block.cost}:</strong> ${text}`;
  }

  // If name is present and not "Effect", wrap with label
  if (block.name && block.name.toLowerCase() !== "effect") {
    return `<p><strong>${block.name}:</strong> ${text}</p>`;
  }

  // Otherwise just wrap the text
  return `<p>${text}</p>`;
}).join("");

    items.push({
      name: ability.name || `Ability ${index + 1}`,
      type: "ability",
      img: getImageForType(normalizedType, "ability"),
      system: {
        type: normalizedType,
        category,
        keywords: ability.keywords?.map(k => k.toLowerCase()) || [],
        distance,
        target: parseTarget(ability.target),
        damageDisplay: "melee",
        power: {
          roll: {
            formula: "@chr",
            characteristics: [highestCharacteristic]
          },
          effects: finalEffects
        },
        effect: {
          before: effectBefore,
          after: effectAfter
        },
        spend: {
          text: "",
          value: null
        },
        source: {
          book: "Monsters",
          license: "Draw Steel Creator License",
          revision: 1,
          page: ability.page || ""
        },
        _dsid: ability.name?.toLowerCase().replace(/\s+/g, "-") || `ability-${index}`,
        story: "",
        resource,
        trigger: ability.trigger || ""
      },
      effects: [],
      folder: null,
      sort: 0,
      flags: {},
      _stats: {
        coreVersion: "13.347",
        systemId: "draw-steel",
        systemVersion: "0.8.0",
        lastModifiedBy: null
      }
    });
  });

  console.log("✅ Final Items:", items);
  return items;
}