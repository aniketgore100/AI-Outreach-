const UNIT_TO_MS = {
  ms: 1,
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

function parseDurationToMs(duration) {
  const match = /^(\d+)(ms|s|m|h|d)$/.exec(duration.trim());

  if (!match) {
    throw new Error(`Invalid duration string: "${duration}". Expected formats like "15m", "7d", "30s".`);
  }

  const [, value, unit] = match;
  return Number(value) * UNIT_TO_MS[unit];
}

module.exports = { parseDurationToMs };
