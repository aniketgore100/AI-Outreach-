// A small fixed palette for per-person avatar identity — the one deliberate
// exception to the product's single-accent-color rule. Distinguishing people
// in a dense list benefits from variety the neutral+indigo system doesn't
// provide; picked from Tailwind's standard scale (not arbitrary hex) so it
// still holds up in both themes via the app's `dark:` variant.
const AVATAR_PALETTE: { bg: string; text: string }[] = [
  {
    bg: "bg-indigo-100 dark:bg-indigo-500/20",
    text: "text-indigo-700 dark:text-indigo-300",
  },
  {
    bg: "bg-sky-100 dark:bg-sky-500/20",
    text: "text-sky-700 dark:text-sky-300",
  },
  {
    bg: "bg-emerald-100 dark:bg-emerald-500/20",
    text: "text-emerald-700 dark:text-emerald-300",
  },
  {
    bg: "bg-amber-100 dark:bg-amber-500/20",
    text: "text-amber-700 dark:text-amber-300",
  },
  {
    bg: "bg-rose-100 dark:bg-rose-500/20",
    text: "text-rose-700 dark:text-rose-300",
  },
  {
    bg: "bg-violet-100 dark:bg-violet-500/20",
    text: "text-violet-700 dark:text-violet-300",
  },
  {
    bg: "bg-teal-100 dark:bg-teal-500/20",
    text: "text-teal-700 dark:text-teal-300",
  },
  {
    bg: "bg-orange-100 dark:bg-orange-500/20",
    text: "text-orange-700 dark:text-orange-300",
  },
];

/** Up to 2 uppercase initials from the given name parts, e.g. ("Aarav", "Mehta") -> "AM". */
export function getInitials(
  ...parts: Array<string | undefined | null>
): string {
  const letters = parts
    .map((part) => part?.trim()?.[0])
    .filter((letter): letter is string => Boolean(letter));
  return letters.join("").slice(0, 2).toUpperCase() || "?";
}

/** Up to 2 uppercase initials from a single free-text name, e.g. "Welcome Email" -> "WE", "Recap" -> "RE". */
export function getNameInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return getInitials(words[0], words[1]);
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/** Deterministic bg/text color pair for an avatar, stable across renders for the same seed (e.g. a lead's id). */
export function getAvatarColors(seed: string): { bg: string; text: string } {
  return AVATAR_PALETTE[hashString(seed) % AVATAR_PALETTE.length];
}
