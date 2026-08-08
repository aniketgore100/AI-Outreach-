// Mirrors backend/src/services/lead-list.service.js#EMAIL_REGEX — same
// permissive shape check used consistently front and back.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}
