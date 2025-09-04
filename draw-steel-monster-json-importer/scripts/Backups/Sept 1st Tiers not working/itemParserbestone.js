import { buildEffectsFromTiers, parseTarget } from "./tierParser.js";

export function parseItems(traits = [], abilities = [], rawData = {}) {
  const items = [];

  // Determine highest characteristic
  const characteristicScores = {
    might: rawData.might ?? 0,
    agility: rawData.agility ?? 0,
    reason: rawData.reason ?? 0,
    intuition: rawData.intuition ?? 0,
    presence: rawData.presence ?? 0
  };
  const highestCharacteristic = Object.entries(characteristicScores)
    .sort((a, b) => b[1] - a[1])[0][0];

  // ✅ Add "With Captain" feature
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

  // ✅ Parse traits as simple features
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

  // ✅ Parse abilities using buildEffectsFromTiers
  abilities.forEach((ability, index) => {
    const damageEffect = ability.effects?.find(e => e.roll);
    const narrativeEffect = ability.effects?.find(e => e.effect);

    const tierText = damageEffect
      ? `${damageEffect.t1}; ${damageEffect.t2}; ${damageEffect.t3}`
      : "";

    const effects = damageEffect
      ? buildEffectsFromTiers(tierText, highestCharacteristic)
      : {};

    // Check if any effect includes a condition
    const hasCondition = Object.values(effects).some(e => e.type === "applied");

    items.push({
      name: ability.name || `Ability ${index + 1}`,
      type: "ability",
      img: "icons/svg/book.svg",
      system: {
        type: "main",
        category: "signature",
        keywords: ability.keywords?.map(k => k.toLowerCase()) || [],
        distance: {
          type: ability.distance?.includes("ranged") ? "ranged" : "melee",
          primary: Number(ability.distance?.match(/\d+/)?.[0]) || 1
        },
        target: parseTarget(ability.target),
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
          after: hasCondition ? "" : narrativeEffect?.effect || ""
        },
        spend: {
          text: narrativeEffect?.cost || "",
          value: null
        },
        source: {
          book: "Monsters",
          license: "Draw Steel Creator License",
          revision: 1
        },
        _dsid: ability.name?.toLowerCase().replace(/\s+/g, "-") || `ability-${index}`
      }
    });
  });

  return items;
}