import { parseDamage } from "./damageParser.js";

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

  const abilityHeaderRegex = /^[a-z]\s+.+?\s+\d+\s+malice$/i;

  lines.forEach((line, i) => {
    if (i === 0 && /malice features/i.test(line)) {
      typeKey = line.split(" ")[0].trim();
      return;
    }


if (line.startsWith("e ") && current) {
  const raw = line.slice(2).trim();

  // Split on "x" or "×" with optional spacing
  const parts = raw.split(/\s*[x×]\s*/i);

  if (parts.length === 2) {
    const distanceRaw = parts[0].trim().toLowerCase();
    const targetRaw = parts[1].trim().toLowerCase();

    current.system.distance.type = distanceRaw;
    current.system.target.type = targetRaw;
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

      const match = line.match(/^[a-z]\s+(.*?)\s+(\d+)\s+malice/i);
      if (!match) return;

      const name = match[1].trim();
      const cost = parseInt(match[2]);

      const nextLine = lines[i + 1]?.trim();
      const typeMatch = nextLine?.match(/^(.+?)\s+(Maneuver|Attack|Effect|Reaction|Action|Ability|Spell|Power)\.?$/i);

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

    if (current && !collectingTier && /^[^a-z]/i.test(line)) {
      afterTierStarted = true;
    }

    if (afterTierStarted && current) {
      postTierLines.push(line);
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

function enrichNarrative(text) {
  const collapsed = text.replace(/\s*\n\s*/g, " ").replace(/\s{2,}/g, " ").trim();

  const withDamage = collapsed.replace(/(\d+)\s*(\w+)?\s*damage/gi, (_, value, type) => {
    const dmgType = type?.toLowerCase();
    const enriched = dmgType && dmgType !== "damage"
      ? `[[/damage ${value} ${dmgType}]] damage`
      : `[[/damage ${value}]] damage`;
    return enriched;
  });

  const skillList = ["Might", "Intuition", "Agility", "Reason", "Presence"];
  const skillRegex = new RegExp(`\\b(${skillList.join("|")})\\s+test\\b`, "gi");

  const withSkills = withDamage.replace(skillRegex, (_, skill) => {
    return `<span style="text-decoration:underline"><strong>${skill} test</strong></span>`;
  });

  const skillInitials = ["m", "i", "a", "r", "p"];
  const skillRangeRegex = new RegExp(`\\b([${skillInitials.join("")}])<([0-9]+)]`, "gi");

  const withSkillRanges = withSkills.replace(skillRangeRegex, (_, letter, num) => {
    return `${letter.toUpperCase()}<${num}`;
  });

  return withSkillRanges;
}

function convertTierLabel(tierChar) {
  switch (tierChar) {
    case "á": case "1": return "11 or less";
    case "é": case "2": return "12-16";
    case "í": case "3": return "17+";
    default: return tierChar;
  }
}

function parseDuration(text) {
  const lower = text.toLowerCase();

  if (/\(save ends\)/i.test(lower)) {
    return { end: "save", rounds: null, roll: "1d10 + @combat.save.bonus" };
  }

  if (/until the end of the round/.test(lower)) {
    return { end: "round", rounds: 1, roll: "" };
  }

  if (/until the end of the turn/.test(lower) || /\(eot\)/i.test(lower)) {
    return { end: "turn", rounds: 1, roll: "" };
  }

  if (/until the end of the encounter/.test(lower) || /until .* disappears/.test(lower)) {
    return { end: "encounter", rounds: null, roll: "" };
  }

  return { end: "turn", rounds: 1, roll: "" };
}

function finalizeEffectTable(item, tierLines) {
  if (!tierLines.length) return;

  let table = `<table><tbody>`;
  const activeEffects = [];

  tierLines.forEach(line => {
    const match = line.match(/^([123áéí])\s+(.*)/);
    if (!match) return;

    const tier = match[1];
    const rawText = match[2].trim();
    const enriched = enrichNarrative(rawText);
    const label = convertTierLabel(tier);

    table += `<tr><td data-colwidth="98"><p>${label}</p></td><td><p>${enriched}</p></td></tr>`;

    const conditionMatch = enriched.match(/\b(weakened|restrained|frightened|bleeding|slowed|taunted|dazed)\b/i);
    if (conditionMatch) {
      const durationData = parseDuration(enriched);

      activeEffects.push({
        name: conditionMatch[1].charAt(0).toUpperCase() + conditionMatch[1].slice(1),
        img: "icons/svg/downgrade.svg",
        origin: null,
        transfer: false,
        type: "base",
        system: {
          end: { type: durationData.end, roll: durationData.roll }
        },
        changes: [],
        disabled: false,
        duration: { rounds: durationData.rounds },
        description: "",
        tint: "#ffffff",
        statuses: [conditionMatch[1].toLowerCase()],
        sort: 0,
        flags: {},
        _stats: {
          coreVersion: "13.347",
          systemId: "draw-steel",
          systemVersion: "0.8.0",
          lastModifiedBy: null
        }
      });
    }
  });

  table += `</tbody></table>`;
  item.system.effect.before += table;
  item.effects.push(...activeEffects);
}