export function parseItems(traits = [], abilities = [], rawData = {}) {
  const items = [];

  const actionTypeMap = {
    "main action": "main",
    "maneuver": "maneuver",
    "free maneuver": "freeManeuver",
    "triggered action": "triggered",
    "free triggered": "freeTriggered",
    "none": "none",
    "villain action": "villain"
  };

  const categoryMap = {
    "heroic ability": "heroic",
    "free strike": "freeStrike",
    "signature ability": "signature",
    "villain ability": "villain"
  };

  const characteristicScores = {
    might: rawData.might ?? 0,
    agility: rawData.agility ?? 0,
    reason: rawData.reason ?? 0,
    intuition: rawData.intuition ?? 0,
    presence: rawData.presence ?? 0
  };
  const highestCharacteristic = Object.entries(characteristicScores)
    .sort((a, b) => b[1] - a[1])[0][0];

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
          page: "161",
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
          page: "",
          license: "Draw Steel Creator License",
          revision: 1
        },
        _dsid: trait.name?.toLowerCase().replace(/\s+/g, "-") || `trait-${index}`,
        advancements: {}
      }
    });
  });

  abilities.forEach((ability, index) => {
    const rawType = ability.type?.toLowerCase().trim() || "main action";
    const normalizedType = Object.entries(actionTypeMap).find(([key]) => rawType.includes(key))?.[1] || "main";

    const rawCategory = ability.cost?.toLowerCase().trim() || "signature ability";
    const normalizedCategory = Object.entries(categoryMap).find(([key]) => rawCategory.includes(key))?.[1] || "signature";

    const extractNumber = str => Number(str?.match(/\d+/)?.[0]) || 0;
    const extractType = str => {
      const types = ["poison", "fire", "cold", "psychic", "lightning", "acid", "sonic", "holy", "corruption"];
      return types.find(t => str?.toLowerCase().includes(t)) || "physical";
    };
    const extractMovement = str => {
      const moves = ["slide", "push", "pull"];
      return moves.find(m => str?.toLowerCase().includes(m)) || null;
    };

    const damageEffect = ability.effects?.find(e => e.roll);
    const narrativeEffect = ability.effects?.find(e => e.effect);

    const damageTiers = damageEffect ? {
      tier1: damageEffect.t1 || "",
      tier2: damageEffect.t2 || "",
      tier3: damageEffect.t3 || ""
    } : {};

    const damage = {};
    const forced = {};
    const potencyMap = {
      tier1: "@potency.weak",
      tier2: "@potency.average",
      tier3: "@potency.strong"
    };

    let hasForced = false;

    for (const tier of ["tier1", "tier2", "tier3"]) {
      const text = damageTiers[tier];
      const value = extractNumber(text);
      const type = extractType(text);
      const move = extractMovement(text);
      const moveDistance = move ? extractNumber(text.split(move)[1]) : null;

      damage[tier] = {
        value,
        types: [type],
        properties: [],
        display: "{{damage}}",
        potency: {
          value: potencyMap[tier],
          characteristic: tier === "tier1" ? "none" : ""
        }
      };

      if (move && moveDistance !== null) {
        hasForced = true;
        forced[tier] = {
          movement: [move],
          distance: `${moveDistance}`,
          display: "{{forced}}",
          properties: [],
          potency: {
            value: potencyMap[tier],
            characteristic: tier === "tier1" ? "none" : ""
          }
        };
      }
    }

    const effects = {};
    const damageKey = foundry.utils.randomID();
    effects[damageKey] = {
      type: "damage",
      name: "",
      img: null,
      damage
    };

    if (hasForced) {
      const forcedKey = foundry.utils.randomID();
      effects[forcedKey] = {
        type: "forced",
        name: forced.tier1?.movement?.[0] || "forced",
        img: null,
        forced
      };
    }

    console.log("✅ Ability:", ability.name, JSON.stringify(effects, null, 2));

    items.push({
      name: ability.name || `Ability ${index + 1}`,
      type: "ability",
      img: "icons/svg/book.svg",
      system: {
        type: normalizedType,
        category: normalizedCategory,
        keywords: ability.keywords?.map(k => k.toLowerCase()) || [],
        distance: {
          type: ability.distance?.includes("ranged") ? "ranged" : "melee",
          primary: extractNumber(ability.distance)
        },
        target: {
          type: "enemy",
          value: null
        },
        damageDisplay: "melee",
        power: {
          roll: {
            formula: "@chr",
            characteristics: [highestCharacteristic]
          },
          effects
        },
        effect: {
          before: "",
          after: narrativeEffect?.effect || ""
        },
        spend: {
          text: narrativeEffect?.cost || "",
          value: null
        },
        source: {
          book: "Monsters",
          page: "",
          license: "Draw Steel Creator License",
          revision: 1
        }
      }
    });
  });

  return items;
}