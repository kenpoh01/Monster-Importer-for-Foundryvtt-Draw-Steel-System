import { parseTierText, parseTarget, mapCharacteristic } from "./tierParser.js";

function normalizeType(type = "") {
  const map = {
    "main action": "main",
    "main": "main",
    "maneuver": "maneuver",
    "reaction": "reaction",
    "free": "free"
  };
  return map[type.toLowerCase()] || "main";
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
      img: "icons/skills/social/intimidation-impressing.webp",
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
      img: "icons/svg/anchor.svg",
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
    const damageEffect = ability.effects?.find(e => e.roll);
    const narrativeEffect = ability.effects?.find(e => e.effect);

    const effects = {};

    const effectGroups = {};

    [damageEffect?.t1, damageEffect?.t2, damageEffect?.t3].forEach((text, i) => {
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
              characteristic: parsed.potency
                ? mapCharacteristic(parsed.potency[0])
                : highestCharacteristic
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

    const isRanged = ability.keywords?.some(k => k.toLowerCase() === "ranged") ||
                     ability.distance?.toLowerCase().includes("ranged");

    const finalEffects = {};
    Object.values(effectGroups).forEach(e => {
      finalEffects[e._id] = e;
    });

    items.push({
      name: ability.name || `Ability ${index + 1}`,
      type: "ability",
      img: "icons/skills/melee/strike-polearm-glowing-white.webp",
      system: {
        type: normalizeType(ability.type),
        category: ability.category?.toLowerCase() || "signature",
        keywords: ability.keywords?.map(k => k.toLowerCase()) || [],
        distance: {
          type: isRanged ? "ranged" : "melee",
          primary: Number(ability.distance?.match(/\d+/)?.[0]) || 1
        },
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
          before: "",
          after: ""
        },
        spend: {
          text: narrativeEffect?.cost || "",
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
        resource: null,
        trigger: ""
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