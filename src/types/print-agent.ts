export const PRINT_DELIVERY_METHODS = {
  PDF: "pdf",
  AGENT: "agent",
  CLOUD: "cloud",
} as const;

export type PrintDeliveryMethod = (typeof PRINT_DELIVERY_METHODS)[keyof typeof PRINT_DELIVERY_METHODS];

export const AGENT_STATUS = {
  ONLINE: "online",
  OFFLINE: "offline",
  ERROR: "error",
} as const;

export type AgentStatus = (typeof AGENT_STATUS)[keyof typeof AGENT_STATUS];

export const PRINTER_LANGUAGES = {
  PDF: "pdf",
  ZPL: "zpl",
  EPL: "epl",
} as const;

export type PrinterLanguage = (typeof PRINTER_LANGUAGES)[keyof typeof PRINTER_LANGUAGES];

export const DISPATCH_STATUS = {
  QUEUED: "queued",
  SENT: "sent",
  ACK: "ack",
  PRINTING: "printing",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type DispatchStatus = (typeof DISPATCH_STATUS)[keyof typeof DISPATCH_STATUS];

export interface PrintAgentCapabilities {
  languages: PrinterLanguage[];
  maxDpi?: number;
  supportsBatch?: boolean;
}

export interface PrintAgent {
  id: string;
  tenantId: string;
  name: string;
  status: AgentStatus;
  lastSeenAt: Date | null;
  version: string | null;
  capabilities: PrintAgentCapabilities;
  createdBy: string;
  createdAt: Date;
}

export interface PrintAgentPrinter {
  id: string;
  tenantId: string;
  agentId: string;
  name: string;
  location: string | null;
  driver: string | null;
  languages: PrinterLanguage[];
  dpi: number | null;
  isDefault: boolean;
}

export interface PrintDispatch {
  id: string;
  tenantId: string;
  printJobId: string;
  agentId: string | null;
  printerId: string | null;
  payloadFormat: PrinterLanguage;
  status: DispatchStatus;
  attempts: number;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentHelloMessage {
  type: "hello";
  agentName: string;
  version: string;
  printers: PrinterInfo[];
}

export interface PrinterInfo {
  name: string;
  location?: string;
  driver?: string;
  languages: PrinterLanguage[];
  dpi?: number;
  isDefault?: boolean;
}

export interface ServerPrintCommand {
  type: "print";
  dispatchId: string;
  format: PrinterLanguage;
  data: string;
}

export interface AgentStatusEvent {
  type: "status";
  dispatchId: string;
  status: DispatchStatus;
  error?: string;
}

export interface AgentHeartbeat {
  type: "heartbeat";
  timestamp: number;
}

export type AgentMessage = AgentHelloMessage | AgentStatusEvent | AgentHeartbeat;
export type ServerMessage = ServerPrintCommand | { type: "ping" };

export interface CreateDispatchInput {
  printJobId: string;
  agentId: string;
  printerId: string;
  format: PrinterLanguage;
}

export interface PrintAgentListResult {
  agents: PrintAgent[];
  total: number;
  page: number;
  pageSize: number;
}
