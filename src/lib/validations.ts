import { z } from "zod";
import { EQUIPMENT_CATEGORIES, ASSET_STATUSES } from "@/types/asset";
import { LABEL_FORMATS } from "@/types/label-spec";
import { ROLES } from "@/types/permissions";

const equipmentCategoryValues = Object.values(EQUIPMENT_CATEGORIES) as [string, ...string[]];
const assetStatusValues = Object.values(ASSET_STATUSES) as [string, ...string[]];
const roleValues = Object.values(ROLES) as [string, ...string[]];
const labelFormatValues = Object.keys(LABEL_FORMATS) as [string, ...string[]];

export const createAssetSchema = z.object({
  category: z.enum(equipmentCategoryValues),
  type: z.string().min(1).max(100),
  assetTag: z.string().min(1).max(100),
  serialNumber: z.string().min(1).max(255),
  manufacturer: z.string().min(1).max(255),
  model: z.string().min(1).max(255),
  location: z.string().min(1).max(255),
  department: z.string().max(255).optional(),
  assignedTo: z.string().max(255).optional(),
  status: z.enum(assetStatusValues).optional().default("pending"),
  purchaseDate: z.string().datetime().optional(),
  warrantyExpiry: z.string().datetime().optional(),
  notes: z.string().optional(),
  customFields: z.record(z.unknown()).optional().default({}),
});

export const updateAssetSchema = z.object({
  type: z.string().min(1).max(100).optional(),
  assetTag: z.string().min(1).max(100).optional(),
  serialNumber: z.string().min(1).max(255).optional(),
  manufacturer: z.string().min(1).max(255).optional(),
  model: z.string().min(1).max(255).optional(),
  location: z.string().min(1).max(255).optional(),
  department: z.string().max(255).nullable().optional(),
  assignedTo: z.string().max(255).nullable().optional(),
  status: z.enum(assetStatusValues).optional(),
  purchaseDate: z.string().datetime().nullable().optional(),
  warrantyExpiry: z.string().datetime().nullable().optional(),
  retiredDate: z.string().datetime().nullable().optional(),
  notes: z.string().nullable().optional(),
  customFields: z.record(z.unknown()).optional(),
});

export const assetFiltersSchema = z.object({
  category: z.enum(equipmentCategoryValues).optional(),
  status: z.enum(assetStatusValues).optional(),
  location: z.string().optional(),
  department: z.string().optional(),
  assignedTo: z.string().optional(),
  manufacturer: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(255),
  password: z.string().min(8).max(128),
  role: z.enum(roleValues),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).max(255).optional(),
  role: z.enum(roleValues).optional(),
  isActive: z.boolean().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8).max(128),
});

export const userFiltersSchema = z.object({
  role: z.enum(roleValues).optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

const textStyleSchema = z.object({
  fontFamily: z.string().max(100),
  fontSize: z.number().min(4).max(72),
  fontWeight: z.enum(["normal", "bold"]),
  fontStyle: z.enum(["normal", "italic"]),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  textAlign: z.enum(["left", "center", "right"]),
  verticalAlign: z.enum(["top", "middle", "bottom"]),
  lineHeight: z.number().optional(),
  letterSpacing: z.number().optional(),
  textTransform: z.enum(["none", "uppercase", "lowercase", "capitalize"]).optional(),
});

const barcodeStyleSchema = z.object({
  format: z.enum(["CODE128", "CODE39", "EAN13", "EAN8", "UPC", "ITF14", "MSI", "pharmacode"]),
  displayValue: z.boolean(),
  fontSize: z.number().min(4).max(24),
  textAlign: z.enum(["left", "center", "right"]),
  background: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  lineColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  width: z.number().min(1).max(4),
  height: z.number().min(5).max(50),
});

const qrcodeStyleSchema = z.object({
  errorCorrectionLevel: z.enum(["L", "M", "Q", "H"]),
  margin: z.number().min(0).max(10),
  darkColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  lightColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

const imageStyleSchema = z.object({
  objectFit: z.enum(["contain", "cover", "fill"]),
  opacity: z.number().min(0).max(1),
});

const elementStyleSchema = z.object({
  fontFamily: z.string().max(100).optional(),
  fontSize: z.number().min(4).max(72).optional(),
  fontWeight: z.enum(["normal", "bold"]).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  textAlign: z.enum(["left", "center", "right"]).optional(),
  fill: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  stroke: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  strokeWidth: z.number().min(0).max(10).optional(),
  borderRadius: z.number().min(0).max(50).optional(),
  objectFit: z.enum(["contain", "cover", "fill"]).optional(),
  opacity: z.number().min(0).max(1).optional(),
});

const fieldConditionSchema = z.object({
  field: z.string(),
  operator: z.enum(["eq", "neq", "contains", "empty", "notEmpty"]),
  value: z.string().optional(),
});

const baseFieldSchema = z.object({
  id: z.string(),
  source: z.string().max(255),
  fallback: z.string().max(255).optional(),
  position: z.object({ x: z.number(), y: z.number() }),
  size: z.object({ width: z.number().positive(), height: z.number().positive() }),
  rotation: z.number().min(-180).max(180).optional(),
  visible: z.boolean().optional(),
  condition: fieldConditionSchema.optional(),
});

const textFieldSchema = baseFieldSchema.extend({
  type: z.literal("text"),
  style: textStyleSchema,
});

const dateFieldSchema = baseFieldSchema.extend({
  type: z.literal("date"),
  style: textStyleSchema,
});

const barcodeFieldSchema = baseFieldSchema.extend({
  type: z.literal("barcode"),
  style: barcodeStyleSchema,
});

const qrcodeFieldSchema = baseFieldSchema.extend({
  type: z.literal("qrcode"),
  style: qrcodeStyleSchema,
});

const imageFieldSchema = baseFieldSchema.extend({
  type: z.literal("image"),
  style: imageStyleSchema,
});

const labelFieldSchema = z.discriminatedUnion("type", [
  textFieldSchema,
  dateFieldSchema,
  barcodeFieldSchema,
  qrcodeFieldSchema,
  imageFieldSchema,
]);

const labelElementSchema = z.object({
  id: z.string(),
  type: z.enum(["text", "line", "rect", "image", "logo"]),
  position: z.object({ x: z.number(), y: z.number() }),
  size: z.object({ width: z.number().positive(), height: z.number().positive() }),
  rotation: z.number().min(-180).max(180).optional(),
  content: z.string().max(1000).optional(),
  style: elementStyleSchema,
  visible: z.boolean().optional(),
});

const MAX_FIELDS = 50;
const MAX_ELEMENTS = 50;

export const labelSpecSchema = z.object({
  id: z.string().optional(),
  version: z.string().optional(),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  dimensions: z.object({
    width: z.number().positive().max(500),
    height: z.number().positive().max(500),
    unit: z.enum(["mm", "in"]),
  }),
  dpi: z.number().int().min(72).max(600),
  margins: z.object({
    top: z.number().min(0).max(50),
    right: z.number().min(0).max(50),
    bottom: z.number().min(0).max(50),
    left: z.number().min(0).max(50),
  }),
  fields: z.array(labelFieldSchema).max(MAX_FIELDS),
  elements: z.array(labelElementSchema).max(MAX_ELEMENTS),
});

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  category: z.enum(equipmentCategoryValues).optional(),
  format: z.enum(labelFormatValues),
  spec: labelSpecSchema,
});

export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  category: z.enum(equipmentCategoryValues).nullable().optional(),
  format: z.enum(labelFormatValues).optional(),
  spec: labelSpecSchema.optional(),
  changeNote: z.string().optional(),
});

export const templateFiltersSchema = z.object({
  category: z.enum(equipmentCategoryValues).optional(),
  format: z.enum(labelFormatValues).optional(),
  isPublished: z.coerce.boolean().optional(),
  isSystemTemplate: z.coerce.boolean().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;
export type AssetFiltersInput = z.infer<typeof assetFiltersSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UserFiltersInput = z.infer<typeof userFiltersSchema>;
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type TemplateFiltersInput = z.infer<typeof templateFiltersSchema>;
