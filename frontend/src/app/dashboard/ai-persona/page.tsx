import { Bot } from "lucide-react";

import { AIPersona } from "@/components/dashboard/AI-Persona";

export default function Page() {
  return (
    <AIPersona
      icon={<Bot className="h-4 w-4" />}
      title="AI Persona"
      description="Define the tone and voice your AI writes with, so every generated email sounds like you."
    />
  );
}
