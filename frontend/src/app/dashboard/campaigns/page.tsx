import { Megaphone } from "lucide-react";

import { ComingSoonPage } from "@/components/dashboard/coming-soon-page";

export default function Page() {
  return (
    <ComingSoonPage
      icon={Megaphone}
      title="Campaigns"
      description="Build multi-step outreach sequences and launch them straight to your lead lists."
    />
  );
}
