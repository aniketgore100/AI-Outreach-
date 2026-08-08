export const STANDARD_LEAD_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "companyName",
  "jobTitle",
  "location",
  "linkedinUrl",
  "phone",
  "website",
] as const;

export type StandardLeadField = (typeof STANDARD_LEAD_FIELDS)[number];

export type TargetField = StandardLeadField | "customFields" | "ignored";

export interface ColumnMappingEntry {
  sourceColumn: string;
  targetField: TargetField;
}

export interface ParsedLeadRow {
  firstName?: string;
  lastName?: string;
  email?: string;
  companyName?: string;
  jobTitle?: string;
  location?: string;
  linkedinUrl?: string;
  phone?: string;
  website?: string;
  customFields?: Record<string, string>;
}

export interface UploadMetadata {
  originalFileName: string;
  fileType: "csv" | "xlsx" | "xls";
  fileSizeBytes?: number;
  totalRows: number;
}

export interface LeadListSummary {
  id: string;
  name: string;
  leadCount: number;
  status: "completed" | "failed";
  uploadMetadata: UploadMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface LeadListDetail extends LeadListSummary {
  columnMapping: ColumnMappingEntry[];
  skippedDuplicateCount: number;
  skippedMissingEmailCount: number;
}

export interface Lead {
  id: string;
  leadListId: string;
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  jobTitle: string;
  location: string;
  linkedinUrl: string;
  phone: string;
  website: string;
  customFields: Record<string, string>;
  createdAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CreateLeadListPayload {
  name: string;
  uploadMetadata: UploadMetadata;
  columnMapping: ColumnMappingEntry[];
  leads: ParsedLeadRow[];
}
