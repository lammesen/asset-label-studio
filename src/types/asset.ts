/**
 * Equipment categories for network/delivery assets
 */
export const EQUIPMENT_CATEGORIES = {
  NETWORKING: "networking",
  SERVERS: "servers",
  CABLING: "cabling",
  POWER: "power",
  PHYSICAL: "physical",
  IOT_EDGE: "iot-edge",
} as const;

export type EquipmentCategory = (typeof EQUIPMENT_CATEGORIES)[keyof typeof EQUIPMENT_CATEGORIES];

/**
 * Asset status values
 */
export const ASSET_STATUSES = {
  ACTIVE: "active",
  MAINTENANCE: "maintenance",
  RETIRED: "retired",
  PENDING: "pending",
  DISPOSED: "disposed",
} as const;

export type AssetStatus = (typeof ASSET_STATUSES)[keyof typeof ASSET_STATUSES];

/**
 * Core asset interface
 */
export interface Asset {
  id: string;
  tenantId: string;
  
  // Classification
  category: EquipmentCategory;
  type: string; // e.g., "router", "switch", "server"
  
  // Identification
  assetTag: string; // Internal asset tag
  serialNumber: string;
  manufacturer: string;
  model: string;
  
  // Location & Assignment
  location: string;
  department: string | null;
  assignedTo: string | null;
  
  // Status & Lifecycle
  status: AssetStatus;
  purchaseDate: Date | null;
  warrantyExpiry: Date | null;
  retiredDate: Date | null;
  
  // Notes
  notes: string | null;
  
  // Dynamic fields (category-specific)
  customFields: Record<string, unknown>;
  schemaVersion: number;
  
  // Audit
  createdBy: string;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Category-specific field definitions
 */
export interface CategoryFieldSchema {
  category: EquipmentCategory;
  version: number;
  fields: FieldDefinition[];
}

export interface FieldDefinition {
  name: string;
  label: string;
  type: "text" | "number" | "date" | "select" | "boolean";
  required: boolean;
  options?: string[]; // For select fields
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

/**
 * Default category field schemas
 */
export const CATEGORY_FIELD_SCHEMAS: Record<EquipmentCategory, CategoryFieldSchema> = {
  networking: {
    category: "networking",
    version: 1,
    fields: [
      { name: "ipAddress", label: "IP Address", type: "text", required: false },
      { name: "macAddress", label: "MAC Address", type: "text", required: false },
      { name: "firmware", label: "Firmware Version", type: "text", required: false },
      { name: "ports", label: "Number of Ports", type: "number", required: false },
    ],
  },
  servers: {
    category: "servers",
    version: 1,
    fields: [
      { name: "cpu", label: "CPU", type: "text", required: false },
      { name: "ram", label: "RAM (GB)", type: "number", required: false },
      { name: "storage", label: "Storage (TB)", type: "number", required: false },
      { name: "os", label: "Operating System", type: "text", required: false },
      { name: "rackUnit", label: "Rack Unit", type: "text", required: false },
    ],
  },
  cabling: {
    category: "cabling",
    version: 1,
    fields: [
      { name: "cableType", label: "Cable Type", type: "select", required: false, options: ["Cat5e", "Cat6", "Cat6a", "Fiber OM3", "Fiber OM4", "Fiber SM"] },
      { name: "length", label: "Length (m)", type: "number", required: false },
      { name: "portA", label: "Port A", type: "text", required: false },
      { name: "portB", label: "Port B", type: "text", required: false },
    ],
  },
  power: {
    category: "power",
    version: 1,
    fields: [
      { name: "capacity", label: "Capacity (VA)", type: "number", required: false },
      { name: "outlets", label: "Number of Outlets", type: "number", required: false },
      { name: "inputVoltage", label: "Input Voltage", type: "text", required: false },
      { name: "batteryRuntime", label: "Battery Runtime (min)", type: "number", required: false },
    ],
  },
  physical: {
    category: "physical",
    version: 1,
    fields: [
      { name: "rackUnits", label: "Rack Units (U)", type: "number", required: false },
      { name: "dimensions", label: "Dimensions", type: "text", required: false },
      { name: "weight", label: "Weight (kg)", type: "number", required: false },
      { name: "maxLoad", label: "Max Load (kg)", type: "number", required: false },
    ],
  },
  "iot-edge": {
    category: "iot-edge",
    version: 1,
    fields: [
      { name: "protocol", label: "Protocol", type: "select", required: false, options: ["MQTT", "HTTP", "Modbus", "BACnet", "Zigbee", "LoRa"] },
      { name: "sensors", label: "Sensors", type: "text", required: false },
      { name: "firmware", label: "Firmware Version", type: "text", required: false },
      { name: "connectivity", label: "Connectivity", type: "select", required: false, options: ["WiFi", "Ethernet", "Cellular", "LoRa"] },
    ],
  },
};

/**
 * Asset creation input
 */
export interface CreateAssetInput {
  category: EquipmentCategory;
  type: string;
  assetTag: string;
  serialNumber: string;
  manufacturer: string;
  model: string;
  location: string;
  department?: string;
  assignedTo?: string;
  status?: AssetStatus;
  purchaseDate?: Date;
  warrantyExpiry?: Date;
  notes?: string;
  customFields?: Record<string, unknown>;
}

/**
 * Asset update input
 */
export interface UpdateAssetInput {
  type?: string;
  assetTag?: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  location?: string;
  department?: string | null;
  assignedTo?: string | null;
  status?: AssetStatus;
  purchaseDate?: Date | null;
  warrantyExpiry?: Date | null;
  retiredDate?: Date | null;
  notes?: string | null;
  customFields?: Record<string, unknown>;
}

/**
 * Asset search filters
 */
export interface AssetFilters {
  category?: EquipmentCategory;
  status?: AssetStatus;
  location?: string;
  department?: string;
  assignedTo?: string;
  manufacturer?: string;
  search?: string; // Full-text search on tag, serial, model
}

/**
 * Asset list with pagination
 */
export interface AssetListResult {
  assets: Asset[];
  total: number;
  page: number;
  pageSize: number;
}
