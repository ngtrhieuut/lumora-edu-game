export const GAMEPLAY_FOCUS_VIEWS = Object.freeze([
  "first-session-oracle",
  "first-session-numeral",
  "mechanic-intro",
  "boss-tease",
  "play",
  "quest-play",
  "practice-play",
  "practice-puzzle",
]);

export function isGameplayFocusView(view) {
  return typeof view === "string" && GAMEPLAY_FOCUS_VIEWS.includes(view);
}
