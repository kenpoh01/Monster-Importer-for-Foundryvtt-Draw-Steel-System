// movementParser.js

const movementTypes = ["slide", "pull", "push", "shift"];

export function parseMovement(text = "") {
  const lower = text.toLowerCase();

  const match = lower.match(/\b(slide|pull|push|shift)\s*(\d+)/i);
  if (!match) return null;

  const name = match[1].toLowerCase();
  const distance = Number(match[2]);

  return {
    name,
    distance
  };
}