"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CircleAlert, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ColumnMappingModal } from "@/components/lead-lists/column-mapping-modal";
import { buildLeadsFromMapping } from "@/lib/lead-field-mapping";
import { parseSpreadsheetFile, UnsupportedFileError, type ParsedSpreadsheet } from "@/lib/spreadsheet-parser";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchLeadLists, importLeadList } from "@/store/slices/lead-list.slice";
import type { ColumnMappingEntry } from "@/types/lead-list.types";

export function LeadListUploader() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const inputRef = useRef<HTMLInputElement>(null);

  const [parsed, setParsed] = useState<ParsedSpreadsheet | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const importStatus = useAppSelector((state) => state.leadLists.importStatus);
  const importError = useAppSelector((state) => state.leadLists.importError);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;

    setParseError(null);

    try {
      const result = await parseSpreadsheetFile(file);
      setParsed(result);
      setModalOpen(true);
    } catch (err) {
      setParseError(
        err instanceof UnsupportedFileError ? err.message : "We couldn't read that file. Please try again."
      );
    }
  };

  const handleConfirm = async ({ name, mapping }: { name: string; mapping: ColumnMappingEntry[] }) => {
    if (!parsed) return;

    const leads = buildLeadsFromMapping(parsed.rows, mapping);
    const result = await dispatch(
      importLeadList({ name, uploadMetadata: parsed.uploadMetadata, columnMapping: mapping, leads })
    );

    if (importLeadList.fulfilled.match(result)) {
      setModalOpen(false);
      setParsed(null);
      void dispatch(fetchLeadLists());
      router.push(`/dashboard/lead-lists/${result.payload.id}`);
    }
  };

  return (
    <motion.div
      className="flex flex-col items-end gap-1.5"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      <Button type="button" size="sm" className="gap-2" onClick={() => inputRef.current?.click()}>
        <Upload className="h-4 w-4" />
        Upload Lead List
      </Button>

      {parseError ? (
        <p className="flex items-center gap-1.5 text-small text-destructive">
          <CircleAlert className="h-3.5 w-3.5 shrink-0" />
          {parseError}
        </p>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx"
        className="sr-only"
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      <ColumnMappingModal
        key={parsed ? `${parsed.uploadMetadata.originalFileName}-${parsed.uploadMetadata.totalRows}` : "empty"}
        open={modalOpen}
        onOpenChange={setModalOpen}
        parsed={parsed}
        defaultName={parsed?.uploadMetadata.originalFileName.replace(/\.[^.]+$/, "") ?? ""}
        isSubmitting={importStatus === "loading"}
        submitError={importError}
        onConfirm={handleConfirm}
      />
    </motion.div>
  );
}
