"use client";

import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";

import { cn } from "@/lib/utils";

function Table({
  className,
  containerClassName,
  ...props
}: React.HTMLAttributes<HTMLTableElement> & { containerClassName?: string }) {
  return (
    <div className={cn("w-full overflow-x-auto rounded-md border border-border", containerClassName)}>
      <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  );
}

function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("bg-muted", className)} {...props} />;
}

function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("divide-y divide-border", className)} {...props} />;
}

function TableRow({
  className,
  clickable,
  ...props
}: Omit<HTMLMotionProps<"tr">, "ref"> & { clickable?: boolean }) {
  return (
    <motion.tr
      className={cn("h-11 transition-colors", clickable && "cursor-pointer hover:bg-accent", className)}
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
      whileHover={clickable ? { y: -1 } : undefined}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "px-3 py-2 text-left text-caption font-medium uppercase tracking-wide text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-3 py-2 text-body text-foreground", className)} {...props} />;
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
