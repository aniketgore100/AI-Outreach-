import { Bot } from "lucide-react";

import { ComingSoonPage } from "@/components/dashboard/coming-soon-page";

export default function Page() {
  return (
    <ComingSoonPage
      icon={Bot}
      title="AI Persona"
      description="Define the tone and voice your AI writes with, so every generated email sounds like you."
    />
  );
}
