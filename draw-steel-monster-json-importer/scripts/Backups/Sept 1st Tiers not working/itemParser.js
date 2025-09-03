import { buildEffectsFromTiers } from "./tierParser.js";

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
        _dsid: `trait-${index}`,
        advancements: {}
      }
    });
  });

  // ✅ Parse abilities using buildEffectsFromTiers
  abilities.forEach((ability, index) => {
    const damageEffect = ability.effects?.find(e => e.roll);
    const narrativeEffect = ability.effects?.find(e => e.effect);

    const effects = damageEffect
      ? buildEffectsFromTiers(damageEffect.roll, highestCharacteristic)
      : {};

    items.push({
      name: ability.name || `Ability ${index + 1}`,
      type: "ability",
      img: "icons/svg/book.svg",
      system: {
        type: "main",
        source: {
          book: "Monsters",
          license: "Draw Steel Creator License",
          revision: 1
        },
        _dsid: ability.name?.toLowerCase().replace(/\s+/g, "-") || `ability-${index}`,
        story: "",
        keywords: ability.keywords?.map(k => k.toLowerCase()) || [],
        category: "signature",
        resource: null,
        trigger: "",
        distance: {
          type: ability.distance?.includes("ranged") ? "ranged" : "melee",
          primary: Number(ability.distance?.match(/\d+/)?.[0]) || 1
        },
        damageDisplay: "melee",
        target: {
          type: "creature",
          value: 1
        },
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
        }
      }
    });
  });
console.log("Final Items:", items);
  return items;
}