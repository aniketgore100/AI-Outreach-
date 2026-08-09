import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const SIZE_CLASSES = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
} as const;

interface SpinnerProps {
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}

export function Spinner({ size = "md", className }: SpinnerProps) {
  return <Loader2 className={cn("animate-spin", SIZE_CLASSES[size], className)} />;
}
