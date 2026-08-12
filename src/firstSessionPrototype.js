// Pure gate for the first-session recognition prototype.
// Prototype content may guide the demo, but it must never become campaign data.

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

export function getFirstSessionNumeralPrototype(prototype) {
  if (!isRecord(prototype)) return null;
  if (prototype.id !== "prototype-numeral") return null;
  if (prototype.kind !== "prototype" || prototype.type !== "numeral") return null;
  if (prototype.approved !== false || prototype.reward !== 0) return null;
  return prototype;
}
