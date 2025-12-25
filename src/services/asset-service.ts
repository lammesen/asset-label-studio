import { db, schema } from "@/db";
import { eq, and, or, ilike, desc, count } from "drizzle-orm";

import type { TenantContext } from "@/types/tenant";
import type { Asset, AssetListResult, EquipmentCategory, AssetStatus } from "@/types/asset";
import type { CreateAssetInput, UpdateAssetInput, AssetFiltersInput } from "@/lib/validations";
import { createAuditLog } from "./audit-service";
import { AUDIT_ACTIONS } from "@/types/audit";

function mapRowToAsset(row: typeof schema.assets.$inferSelect): Asset {
  return {
    id: row.id,
    tenantId: row.tenantId,
    category: row.category as EquipmentCategory,
    type: row.type,
    assetTag: row.assetTag,
    serialNumber: row.serialNumber,
    manufacturer: row.manufacturer,
    model: row.model,
    location: row.location,
    department: row.department,
    assignedTo: row.assignedTo,
    status: row.status as AssetStatus,
    purchaseDate: row.purchaseDate ? new Date(row.purchaseDate) : null,
    warrantyExpiry: row.warrantyExpiry ? new Date(row.warrantyExpiry) : null,
    retiredDate: row.retiredDate ? new Date(row.retiredDate) : null,
    notes: row.notes,
    customFields: row.customFields as Record<string, unknown>,
    schemaVersion: row.schemaVersion,
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function createAsset(
  ctx: TenantContext,
  input: CreateAssetInput
): Promise<Asset> {
  const [row] = await db
    .insert(schema.assets)
    .values({
      tenantId: ctx.tenantId,
      category: input.category,
      type: input.type,
      assetTag: input.assetTag,
      serialNumber: input.serialNumber,
      manufacturer: input.manufacturer,
      model: input.model,
      location: input.location,
      department: input.department ?? null,
      assignedTo: input.assignedTo ?? null,
      status: input.status ?? "pending",
      purchaseDate: input.purchaseDate ?? null,
      warrantyExpiry: input.warrantyExpiry ?? null,
      notes: input.notes ?? null,
      customFields: input.customFields ?? {},
      createdBy: ctx.userId,
    })
    .returning();

  await createAuditLog(ctx, {
    action: AUDIT_ACTIONS.ASSET_CREATED,
    resourceType: "asset",
    resourceId: row.id,
    details: { assetTag: input.assetTag, category: input.category },
  });

  return mapRowToAsset(row);
}

export async function getAssetById(
  ctx: TenantContext,
  assetId: string
): Promise<Asset | null> {
  const [row] = await db
    .select()
    .from(schema.assets)
    .where(
      and(
        eq(schema.assets.id, assetId),
        eq(schema.assets.tenantId, ctx.tenantId)
      )
    )
    .limit(1);

  return row ? mapRowToAsset(row) : null;
}

export async function updateAsset(
  ctx: TenantContext,
  assetId: string,
  input: UpdateAssetInput
): Promise<Asset | null> {
  const existing = await getAssetById(ctx, assetId);
  if (!existing) return null;

  const updateData: Record<string, unknown> = {
    updatedBy: ctx.userId,
    updatedAt: new Date(),
  };

  if (input.type !== undefined) updateData.type = input.type;
  if (input.assetTag !== undefined) updateData.assetTag = input.assetTag;
  if (input.serialNumber !== undefined) updateData.serialNumber = input.serialNumber;
  if (input.manufacturer !== undefined) updateData.manufacturer = input.manufacturer;
  if (input.model !== undefined) updateData.model = input.model;
  if (input.location !== undefined) updateData.location = input.location;
  if (input.department !== undefined) updateData.department = input.department;
  if (input.assignedTo !== undefined) updateData.assignedTo = input.assignedTo;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.purchaseDate !== undefined) updateData.purchaseDate = input.purchaseDate;
  if (input.warrantyExpiry !== undefined) updateData.warrantyExpiry = input.warrantyExpiry;
  if (input.retiredDate !== undefined) updateData.retiredDate = input.retiredDate;
  if (input.notes !== undefined) updateData.notes = input.notes;
  if (input.customFields !== undefined) updateData.customFields = input.customFields;

  const [row] = await db
    .update(schema.assets)
    .set(updateData)
    .where(
      and(
        eq(schema.assets.id, assetId),
        eq(schema.assets.tenantId, ctx.tenantId)
      )
    )
    .returning();

  if (!row) return null;

  const statusChanged = input.status && input.status !== existing.status;
  await createAuditLog(ctx, {
    action: statusChanged ? AUDIT_ACTIONS.ASSET_STATUS_CHANGED : AUDIT_ACTIONS.ASSET_UPDATED,
    resourceType: "asset",
    resourceId: assetId,
    details: statusChanged
      ? { oldStatus: existing.status, newStatus: input.status }
      : { fields: Object.keys(input) },
  });

  return mapRowToAsset(row);
}

export async function deleteAsset(
  ctx: TenantContext,
  assetId: string
): Promise<boolean> {
  const existing = await getAssetById(ctx, assetId);
  if (!existing) return false;

  await db
    .delete(schema.assets)
    .where(
      and(
        eq(schema.assets.id, assetId),
        eq(schema.assets.tenantId, ctx.tenantId)
      )
    );

  await createAuditLog(ctx, {
    action: AUDIT_ACTIONS.ASSET_DELETED,
    resourceType: "asset",
    resourceId: assetId,
    details: { assetTag: existing.assetTag, category: existing.category },
  });

  return true;
}

export async function listAssets(
  ctx: TenantContext,
  filters: AssetFiltersInput
): Promise<AssetListResult> {
  const conditions = [eq(schema.assets.tenantId, ctx.tenantId)];

  if (filters.category) {
    conditions.push(eq(schema.assets.category, filters.category));
  }
  if (filters.status) {
    conditions.push(eq(schema.assets.status, filters.status));
  }
  if (filters.location) {
    conditions.push(ilike(schema.assets.location, `%${filters.location}%`));
  }
  if (filters.department) {
    conditions.push(ilike(schema.assets.department, `%${filters.department}%`));
  }
  if (filters.assignedTo) {
    conditions.push(ilike(schema.assets.assignedTo, `%${filters.assignedTo}%`));
  }
  if (filters.manufacturer) {
    conditions.push(ilike(schema.assets.manufacturer, `%${filters.manufacturer}%`));
  }
  if (filters.search) {
    const searchTerm = `%${filters.search}%`;
    conditions.push(
      or(
        ilike(schema.assets.assetTag, searchTerm),
        ilike(schema.assets.serialNumber, searchTerm),
        ilike(schema.assets.model, searchTerm),
        ilike(schema.assets.manufacturer, searchTerm)
      )!
    );
  }

  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(schema.assets)
      .where(and(...conditions))
      .orderBy(desc(schema.assets.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ total: count() })
      .from(schema.assets)
      .where(and(...conditions)),
  ]);

  return {
    assets: rows.map(mapRowToAsset),
    total: countResult[0]?.total ?? 0,
    page,
    pageSize,
  };
}

export async function getAssetStats(ctx: TenantContext): Promise<{
  total: number;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
}> {
  const assets = await db
    .select({
      category: schema.assets.category,
      status: schema.assets.status,
    })
    .from(schema.assets)
    .where(eq(schema.assets.tenantId, ctx.tenantId));

  const byCategory: Record<string, number> = {};
  const byStatus: Record<string, number> = {};

  for (const asset of assets) {
    byCategory[asset.category] = (byCategory[asset.category] ?? 0) + 1;
    byStatus[asset.status] = (byStatus[asset.status] ?? 0) + 1;
  }

  return {
    total: assets.length,
    byCategory,
    byStatus,
  };
}
