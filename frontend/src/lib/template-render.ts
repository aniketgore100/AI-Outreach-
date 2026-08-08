import { STANDARD_FIELD_LABELS } from "@/lib/lead-field-mapping";
import { STANDARD_LEAD_FIELDS, type StandardLeadField } from "@/types/lead-list.types";

/** Mirrors backend/src/services/template.service.js#SAMPLE_LEAD — keeping
 * these in sync is what makes this preview an honest preview of the actual
 * "Send Test Email" output. */
export const SAMPLE_LEAD: Record<StandardLeadField, string> = {
  firstName: "John",
  lastName: "Doe",
  email: "john.doe@example.com",
  companyName: "Acme Inc.",
  jobTitle: "VP of Sales",
  location: "San Francisco, CA",
  linkedinUrl: "https://linkedin.com/in/johndoe",
  phone: "+1 (555) 123-4567",
  website: "https://acme.com",
};

export const PERSONALIZATION_VARIABLES = STANDARD_LEAD_FIELDS.map((field) => ({
  field,
  token: `{{${field}}}`,
  label: STANDARD_FIELD_LABELS[field],
  sample: SAMPLE_LEAD[field],
}));

const VARIABLE_PATTERN = /{{\s*(\w+)\s*}}/g;

/** Mirrors backend/src/utils/template.util.js#renderTemplate exactly (same
 * regex, same empty-string fallback for unknown/blank fields). */
export function renderTemplateString(template: string, data: Record<string, string>): string {
  return template.replace(VARIABLE_PATTERN, (_match, key: string) => data[key] ?? "");
}

/** Every `{{token}}` referenced in the given text, in first-seen order, deduped. */
export function extractVariableTokens(text: string): string[] {
  const seen = new Set<string>();
  for (const match of text.matchAll(VARIABLE_PATTERN)) {
    seen.add(match[1]);
  }
  return Array.from(seen);
}

export function findUnknownVariables(text: string): string[] {
  const known = new Set<string>(STANDARD_LEAD_FIELDS);
  return extractVariableTokens(text).filter((token) => !known.has(token));
}
