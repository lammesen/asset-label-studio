import type { EquipmentCategory } from "./asset";
import type { LabelSpec, LabelFormatId } from "./label-spec";

/**
 * Label template - versioned and tenant-scoped
 */
export interface LabelTemplate {
  id: string;
  tenantId: string;
  
  // Identification
  name: string;
  description: string | null;
  
  // Categorization
  category: EquipmentCategory | null; // null for universal templates
  format: LabelFormatId;
  
  // The actual label specification
  spec: LabelSpec;
  
  // Versioning
  version: number;
  isPublished: boolean;
  publishedAt: Date | null;
  
  // System templates can't be edited
  isSystemTemplate: boolean;
  
  // Preview image (base64 or URL)
  thumbnailUrl: string | null;
  
  // Audit
  createdBy: string;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Template version history entry
 */
export interface TemplateVersion {
  id: string;
  templateId: string;
  version: number;
  spec: LabelSpec;
  createdBy: string;
  createdAt: Date;
  changeNote: string | null;
}

/**
 * Template creation input
 */
export interface CreateTemplateInput {
  name: string;
  description?: string;
  category?: EquipmentCategory;
  format: LabelFormatId;
  spec: LabelSpec;
}

/**
 * Template update input
 */
export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  category?: EquipmentCategory | null;
  format?: LabelFormatId;
  spec?: LabelSpec;
  changeNote?: string;
}

/**
 * Template publish input
 */
export interface PublishTemplateInput {
  templateId: string;
  changeNote?: string;
}

/**
 * Template filters
 */
export interface TemplateFilters {
  category?: EquipmentCategory;
  format?: LabelFormatId;
  isPublished?: boolean;
  isSystemTemplate?: boolean;
  search?: string;
}

/**
 * Template list result
 */
export interface TemplateListResult {
  templates: LabelTemplate[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Template with version history
 */
export interface TemplateWithHistory extends LabelTemplate {
  versions: TemplateVersion[];
}
