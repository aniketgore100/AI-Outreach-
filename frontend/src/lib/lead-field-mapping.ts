import { STANDARD_LEAD_FIELDS, type ColumnMappingEntry, type ParsedLeadRow, type StandardLeadField, type TargetField } from "@/types/lead-list.types";

export const STANDARD_FIELD_LABELS: Record<StandardLeadField, string> = {
  firstName: "First Name",
  lastName: "Last Name",
  email: "Email",
  companyName: "Company Name",
  jobTitle: "Job Title",
  location: "Location",
  linkedinUrl: "LinkedIn URL",
  phone: "Phone",
  website: "Website",
};

const FIELD_ALIASES: Record<StandardLeadField, string[]> = {
  firstName: ["first name", "firstname", "first", "given name"],
  lastName: ["last name", "lastname", "last", "surname", "family name"],
  email: ["email", "email address", "e-mail", "work email"],
  companyName: ["company", "company name", "organization", "organisation", "employer"],
  jobTitle: ["job title", "title", "position", "role"],
  location: ["location", "city", "address", "region"],
  linkedinUrl: ["linkedin", "linkedin url", "linkedin profile"],
  phone: ["phone", "phone number", "mobile", "telephone"],
  website: ["website", "site", "url", "domain", "company website"],
};

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

/** Best-effort default mapping so most imports need little manual adjustment
 * — every column can still be remapped or unmapped in the modal. */
export function guessColumnMapping(headers: string[]): ColumnMappingEntry[] {
  const used = new Set<TargetField>();

  return headers.map((header) => {
    const normalized = normalize(header);
    const match = STANDARD_LEAD_FIELDS.find(
      (field) => !used.has(field) && FIELD_ALIASES[field].includes(normalized)
    );

    if (match) {
      used.add(match);
      return { sourceColumn: header, targetField: match };
    }

    return { sourceColumn: header, targetField: "ignored" as TargetField };
  });
}

export function buildLeadsFromMapping(
  rows: Record<string, string>[],
  mapping: ColumnMappingEntry[]
): ParsedLeadRow[] {
  return rows.map((row) => {
    const lead: ParsedLeadRow = {};
    const customFields: Record<string, string> = {};

    for (const entry of mapping) {
      const value = row[entry.sourceColumn]?.trim() ?? "";
      if (!value || entry.targetField === "ignored") continue;

      if (entry.targetField === "customFields") {
        customFields[entry.sourceColumn] = value;
        continue;
      }

      lead[entry.targetField] = value;
    }

    if (Object.keys(customFields).length > 0) {
      lead.customFields = customFields;
    }

    return lead;
  });
}
