import { parseDamage } from "./damageParser.js";
import { parseDistanceLine } from "./distanceParser.js";
import { parseTarget } from "./tierParser.js";
import { enrichNarrative } from "./narrativeUtils.js";
import { finalizeEffectTable } from "./effectTableBuilder.js";


export function parseMaliceText(rawText) {
  const lines = rawText.split("\n").map(l => l.trim());
  const items = [];
  let current = null;
  let typeKey = "";
  let tierLines = [];
  let postTierLines = [];
  let afterTierStarted = false;

  let collectingTier = false;
  let currentTier = "";
  let tierBuffer = [];

  const abilityHeaderRegex = /^[a-z]\s+.+?(?:\s+\d+\s+malice|\s+signature ability)$/i;

  lines.forEach((line, i) => {
    if (i === 0 && /malice features/i.test(line)) {
      typeKey = line.split(" ")[0].trim();
      return;
    }

    if (line.startsWith("e ") && current) {
      const parsed = parseDistanceLine(line);
      if (parsed) {
        current.system.distance = parsed.distance;
        current.system.target = parsed.target;
      }
      return;
    }

    if (abilityHeaderRegex.test(line)) {
      if (current) {
        if (collectingTier && currentTier) {
          tierLines.push(`${currentTier} ${tierBuffer.join(" ")}`.trim());
          tierBuffer = [];
          collectingTier = false;
          currentTier = "";
        }
        finalizeEffectTable(current, tierLines);
        if (postTierLines.length) {
          const afterHtml = postTierLines.map(l => `<p>${l}</p>`).join("");
          current.system.effect.after += afterHtml;
        }
        items.push(current);
        tierLines = [];
        postTierLines = [];
        afterTierStarted = false;
      }

      const maliceMatch = line.match(/^[a-z]\s+(.*?)\s+(\d+)\s+malice/i);
      const signatureMatch = line.match(/^[a-z]\s+(.*?)\s+signature ability/i);

      let name = "";
      let cost = 0;

      if (maliceMatch) {
        name = maliceMatch[1].trim();
        cost = parseInt(maliceMatch[2]);
      } else if (signatureMatch) {
        name = signatureMatch[1].trim();
        cost = 0;
      } else {
        return;
      }

      const nextLine = lines[i + 1]?.trim();
      const typeMatch = nextLine?.match(/^(.+?)\s+(Maneuver|Attack|Effect|Reaction|Action|Ability|Spell|Power|Main action)$/i);

      const keywords = [];
      let type = "special";

      if (typeMatch) {
        const rawKeywords = typeMatch[1]
          .split(",")
          .map(k => k.trim().replace(/\.$/, ""))
          .filter(Boolean);

        keywords.push(...rawKeywords);
        lines[i + 1] = ""; // prevent reprocessing
      }

      current = {
        name,
        type: "ability",
        img: "icons/magic/unholy/silhouette-robe-evil-power.webp",
        system: {
          type,
          category: "heroic",
          resource: cost,
          trigger: `A ${typeKey.toLowerCase()} starts its turn.`,
          distance: { type: "special" },
          target: { type: "special" },
          damageDisplay: "melee",
          power: {
            roll: { formula: "", characteristics: [] },
            effects: {}
          },
          effect: { before: "", after: "" },
          spend: { text: "", value: null },
          source: {
            book: "Monsters",
            page: "",
            license: "Draw Steel Creator License",
            revision: 1
          },
          _dsid: name.toLowerCase().replace(/\s+/g, "-"),
          story: "",
          keywords
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
      };
      return;
    }

    const tierStart = line.match(/^([123áéí])\s+(.*)/);
    if (tierStart) {
      if (collectingTier && currentTier) {
        tierLines.push(`${currentTier} ${tierBuffer.join(" ")}`.trim());
        tierBuffer = [];
      }
      collectingTier = true;
      currentTier = tierStart[1];
      tierBuffer.push(tierStart[2]);
      return;
    }

    if (collectingTier) {
      const isNewAbility = abilityHeaderRegex.test(line);
      const isNewTier = /^[123áéí]\s/.test(line);

      if (isNewAbility || isNewTier) {
        tierLines.push(`${currentTier} ${tierBuffer.join(" ")}`.trim());
        tierBuffer = [];
        collectingTier = false;
        currentTier = "";
      } else {
        tierBuffer.push(line);
        return;
      }
    }

const tierLineMatch = line.match(/^([123áéí])\s+/);
if (current && !collectingTier && tierLineMatch) {
  afterTierStarted = true;
}



    if (afterTierStarted && current) {
  if (/^effect:/i.test(line)) {
    const effectText = line.replace(/^effect:/i, "").trim();
    current.system.effect.after += `<p>${enrichNarrative(effectText)}</p>`;
  } else {
    postTierLines.push(line);
  }
  return;
}

    if (current) {
      current.system.effect.before += `<p>${enrichNarrative(line)}</p>`;
    }
  });

  if (collectingTier && currentTier) {
    tierLines.push(`${currentTier} ${tierBuffer.join(" ")}`.trim());
  }

  if (current) {
    finalizeEffectTable(current, tierLines);
    if (postTierLines.length) {
      const afterHtml = postTierLines.map(l => `<p>${l}</p>`).join("");
      current.system.effect.after += afterHtml;
    }
    items.push(current);
  }

  return {
    typeKey,
    items
  };
}