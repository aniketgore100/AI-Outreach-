import { Inbox as InboxIcon } from "lucide-react";

import { ComingSoonPage } from "@/components/dashboard/coming-soon-page";

export default function Page() {
  return (
    <ComingSoonPage
      icon={InboxIcon}
      title="Inbox"
      description="See every reply from your connected Gmail accounts in one unified, threaded view."
    />
  );
}
