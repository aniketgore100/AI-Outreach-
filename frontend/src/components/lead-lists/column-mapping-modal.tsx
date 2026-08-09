"use client";

import { useMemo, useState } from "react";
import { CircleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { STANDARD_FIELD_LABELS, guessColumnMapping } from "@/lib/lead-field-mapping";
import type { ParsedSpreadsheet } from "@/lib/spreadsheet-parser";
import { STANDARD_LEAD_FIELDS, type ColumnMappingEntry, type TargetField } from "@/types/lead-list.types";

const SAMPLE_ROW_COUNT = 3;

interface ColumnMappingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parsed: ParsedSpreadsheet | null;
  defaultName: string;
  isSubmitting: boolean;
  submitError: string | null;
  onConfirm: (params: { name: string; mapping: ColumnMappingEntry[] }) => void;
}

export function ColumnMappingModal({
  open,
  onOpenChange,
  parsed,
  defaultName,
  isSubmitting,
  submitError,
  onConfirm,
}: ColumnMappingModalProps) {
  const [name, setName] = useState(defaultName);
  const [mapping, setMapping] = useState<ColumnMappingEntry[]>(() => (parsed ? guessColumnMapping(parsed.headers) : []));

  const hasEmailMapped = useMemo(() => mapping.some((entry) => entry.targetField === "email"), [mapping]);
  const canConfirm = hasEmailMapped && name.trim().length > 0 && !isSubmitting;

  if (!parsed) return null;

  const updateTarget = (sourceColumn: string, targetField: TargetField) => {
    setMapping((prev) => prev.map((entry) => (entry.sourceColumn === sourceColumn ? { ...entry, targetField } : entry)));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[78vh]">
        <DialogHeader className="gap-0.5 px-4 py-4 md:px-5 md:py-4">
          <DialogTitle className="text-base font-medium">Map your columns</DialogTitle>
          <DialogDescription className="text-small leading-6">
            Match each column from <span className="font-medium text-foreground">{parsed.uploadMetadata.originalFileName}</span> to
            a lead field. {parsed.uploadMetadata.totalRows} row{parsed.uploadMetadata.totalRows === 1 ? "" : "s"} found.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 md:px-5 md:py-4">
          <div className="space-y-1.5">
            <Label htmlFor="lead-list-name" className="text-small font-medium">
              Lead list name
            </Label>
            <Input
              id="lead-list-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={150}
              className="h-9"
            />
          </div>

          <Table className="mt-4">
            <TableHeader>
              <TableRow>
                <TableHead>Your column</TableHead>
                <TableHead>Sample value</TableHead>
                <TableHead className="w-44">Maps to</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mapping.map((entry) => {
                const sample = parsed.rows.slice(0, SAMPLE_ROW_COUNT).find((row) => row[entry.sourceColumn])?.[
                  entry.sourceColumn
                ];

                return (
                  <TableRow key={entry.sourceColumn} className="h-14">
                    <TableCell className="font-medium">{entry.sourceColumn}</TableCell>
                    <TableCell className="max-w-48 truncate text-muted-foreground" title={sample}>
                      {sample || "—"}
                    </TableCell>
                    <TableCell>
                        <Select
                          value={entry.targetField}
                          onValueChange={(value) => updateTarget(entry.sourceColumn, value as TargetField)}
                        >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ignored">Don&apos;t import</SelectItem>
                          <SelectItem value="customFields">Custom field</SelectItem>
                          {STANDARD_LEAD_FIELDS.map((field) => (
                            <SelectItem key={field} value={field}>
                              {STANDARD_FIELD_LABELS[field]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {!hasEmailMapped ? (
            <p className="mt-3 flex items-center gap-1.5 text-small text-destructive">
              <CircleAlert className="h-3.5 w-3.5 shrink-0" />
              Map at least one column to Email before importing.
            </p>
          ) : null}

          {submitError ? (
            <p className="mt-3 flex items-center gap-1.5 text-small text-destructive">
              <CircleAlert className="h-3.5 w-3.5 shrink-0" />
              {submitError}
            </p>
          ) : null}
        </div>

        <DialogFooter className="gap-2 px-4 py-3 md:px-5 md:py-4">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="button" disabled={!canConfirm} onClick={() => onConfirm({ name: name.trim(), mapping })}>
            {isSubmitting ? (
              <>
                <Spinner />
                Importing
              </>
            ) : (
              "Confirm Import"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
