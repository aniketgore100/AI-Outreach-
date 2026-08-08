export interface GmailConnection {
  id: string;
  email: string;
  status: "connected" | "disconnected";
  connectedAt: string;
  disconnectedAt: string | null;
}

export interface GmailConnectionsState {
  connections: GmailConnection[];
  limit: number;
  used: number;
}
