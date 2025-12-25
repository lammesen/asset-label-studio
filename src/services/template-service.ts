import { eq, and, desc, ilike, or, count } from "drizzle-orm";
import { labelTemplates, templateVersions } from "@/db/schema";
import { withTenant } from "@/lib/tenant";
import type { TenantContext } from "@/types/tenant";
import type {
  LabelTemplate,
  TemplateVersion,
  CreateTemplateInput,
  UpdateTemplateInput,
  TemplateFilters,
  TemplateListResult,
  TemplateWithHistory,
} from "@/types/template";
import type { LabelSpec } from "@/types/label-spec";
import { labelSpecSchema } from "@/lib/validations";

function mapTemplateRow(row: typeof labelTemplates.$inferSelect): LabelTemplate {
  const specResult = labelSpecSchema.safeParse(row.spec);
  const validSpec = specResult.success ? specResult.data : row.spec;
  
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    description: row.description,
    category: row.category as LabelTemplate["category"],
    format: row.format as LabelTemplate["format"],
    spec: validSpec as LabelSpec,
    version: row.version,
    isPublished: row.isPublished,
    publishedAt: row.publishedAt,
    isSystemTemplate: row.isSystemTemplate,
    thumbnailUrl: row.thumbnailUrl,
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapVersionRow(row: typeof templateVersions.$inferSelect): TemplateVersion {
  return {
    id: row.id,
    templateId: row.templateId,
    version: row.version,
    spec: row.spec as LabelSpec,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    changeNote: row.changeNote,
  };
}

export async function createTemplate(
  ctx: TenantContext,
  input: CreateTemplateInput
): Promise<LabelTemplate> {
  return withTenant(ctx.tenantId, async (tx) => {
    const specWithMeta: LabelSpec = {
      ...input.spec,
      id: crypto.randomUUID(),
      version: "1",
    };

    const [template] = await tx
      .insert(labelTemplates)
      .values({
        tenantId: ctx.tenantId,
        name: input.name,
        description: input.description ?? null,
        category: input.category ?? null,
        format: input.format,
        spec: specWithMeta,
        version: 1,
        isPublished: false,
        isSystemTemplate: false,
        createdBy: ctx.userId,
      })
      .returning();

    if (!template) {
      throw new Error("Failed to create template");
    }

    await tx.insert(templateVersions).values({
      tenantId: ctx.tenantId,
      templateId: template.id,
      version: 1,
      spec: specWithMeta,
      createdBy: ctx.userId,
      changeNote: "Initial version",
    });

    return mapTemplateRow(template);
  });
}

export async function getTemplateById(
  ctx: TenantContext,
  id: string
): Promise<LabelTemplate | null> {
  return withTenant(ctx.tenantId, async (tx) => {
    const [template] = await tx
      .select()
      .from(labelTemplates)
      .where(and(eq(labelTemplates.id, id), eq(labelTemplates.tenantId, ctx.tenantId)));

    return template ? mapTemplateRow(template) : null;
  });
}

export async function getTemplateWithHistory(
  ctx: TenantContext,
  id: string
): Promise<TemplateWithHistory | null> {
  return withTenant(ctx.tenantId, async (tx) => {
    const [template] = await tx
      .select()
      .from(labelTemplates)
      .where(and(eq(labelTemplates.id, id), eq(labelTemplates.tenantId, ctx.tenantId)));

    if (!template) return null;

    const versions = await tx
      .select()
      .from(templateVersions)
      .where(
        and(
          eq(templateVersions.templateId, id),
          eq(templateVersions.tenantId, ctx.tenantId)
        )
      )
      .orderBy(desc(templateVersions.version));

    return {
      ...mapTemplateRow(template),
      versions: versions.map(mapVersionRow),
    };
  });
}

export async function updateTemplate(
  ctx: TenantContext,
  id: string,
  input: UpdateTemplateInput
): Promise<LabelTemplate | null> {
  return withTenant(ctx.tenantId, async (tx) => {
    const [existing] = await tx
      .select()
      .from(labelTemplates)
      .where(and(eq(labelTemplates.id, id), eq(labelTemplates.tenantId, ctx.tenantId)));

    if (!existing) return null;

    if (existing.isSystemTemplate) {
      throw new Error("Cannot modify system templates");
    }

    const updates: Partial<typeof labelTemplates.$inferInsert> = {
      updatedBy: ctx.userId,
      updatedAt: new Date(),
    };

    if (input.name !== undefined) updates.name = input.name;
    if (input.description !== undefined) updates.description = input.description;
    if (input.category !== undefined) updates.category = input.category;
    if (input.format !== undefined) updates.format = input.format;

    let newVersion = existing.version;

    if (input.spec !== undefined) {
      newVersion = existing.version + 1;
      const specWithMeta: LabelSpec = {
        ...input.spec,
        id: existing.spec && typeof existing.spec === "object" && "id" in existing.spec
          ? (existing.spec as LabelSpec).id
          : crypto.randomUUID(),
        version: String(newVersion),
      };
      updates.spec = specWithMeta;
      updates.version = newVersion;

      await tx.insert(templateVersions).values({
        tenantId: ctx.tenantId,
        templateId: id,
        version: newVersion,
        spec: specWithMeta,
        createdBy: ctx.userId,
        changeNote: input.changeNote ?? null,
      });
    }

    const [updated] = await tx
      .update(labelTemplates)
      .set(updates)
      .where(and(eq(labelTemplates.id, id), eq(labelTemplates.tenantId, ctx.tenantId)))
      .returning();

    return updated ? mapTemplateRow(updated) : null;
  });
}

export async function deleteTemplate(
  ctx: TenantContext,
  id: string
): Promise<boolean> {
  return withTenant(ctx.tenantId, async (tx) => {
    const [existing] = await tx
      .select()
      .from(labelTemplates)
      .where(and(eq(labelTemplates.id, id), eq(labelTemplates.tenantId, ctx.tenantId)));

    if (!existing) return false;

    if (existing.isSystemTemplate) {
      throw new Error("Cannot delete system templates");
    }

    await tx
      .delete(labelTemplates)
      .where(and(eq(labelTemplates.id, id), eq(labelTemplates.tenantId, ctx.tenantId)));

    return true;
  });
}

export async function publishTemplate(
  ctx: TenantContext,
  id: string,
  changeNote?: string
): Promise<LabelTemplate | null> {
  return withTenant(ctx.tenantId, async (tx) => {
    const [existing] = await tx
      .select()
      .from(labelTemplates)
      .where(and(eq(labelTemplates.id, id), eq(labelTemplates.tenantId, ctx.tenantId)));

    if (!existing) return null;

    const [updated] = await tx
      .update(labelTemplates)
      .set({
        isPublished: true,
        publishedAt: new Date(),
        updatedBy: ctx.userId,
        updatedAt: new Date(),
      })
      .where(and(eq(labelTemplates.id, id), eq(labelTemplates.tenantId, ctx.tenantId)))
      .returning();

    if (changeNote) {
      await tx
        .update(templateVersions)
        .set({ changeNote })
        .where(
          and(
            eq(templateVersions.templateId, id),
            eq(templateVersions.version, existing.version),
            eq(templateVersions.tenantId, ctx.tenantId)
          )
        );
    }

    return updated ? mapTemplateRow(updated) : null;
  });
}

export async function unpublishTemplate(
  ctx: TenantContext,
  id: string
): Promise<LabelTemplate | null> {
  return withTenant(ctx.tenantId, async (tx) => {
    const [existing] = await tx
      .select()
      .from(labelTemplates)
      .where(and(eq(labelTemplates.id, id), eq(labelTemplates.tenantId, ctx.tenantId)));

    if (!existing) return null;

    if (existing.isSystemTemplate) {
      throw new Error("Cannot unpublish system templates");
    }

    const [updated] = await tx
      .update(labelTemplates)
      .set({
        isPublished: false,
        updatedBy: ctx.userId,
        updatedAt: new Date(),
      })
      .where(and(eq(labelTemplates.id, id), eq(labelTemplates.tenantId, ctx.tenantId)))
      .returning();

    return updated ? mapTemplateRow(updated) : null;
  });
}

export async function duplicateTemplate(
  ctx: TenantContext,
  id: string,
  newName: string
): Promise<LabelTemplate | null> {
  return withTenant(ctx.tenantId, async (tx) => {
    const [existing] = await tx
      .select()
      .from(labelTemplates)
      .where(and(eq(labelTemplates.id, id), eq(labelTemplates.tenantId, ctx.tenantId)));

    if (!existing) return null;

    const specWithMeta: LabelSpec = {
      ...(existing.spec as LabelSpec),
      id: crypto.randomUUID(),
      version: "1",
    };

    const [newTemplate] = await tx
      .insert(labelTemplates)
      .values({
        tenantId: ctx.tenantId,
        name: newName,
        description: existing.description,
        category: existing.category,
        format: existing.format,
        spec: specWithMeta,
        version: 1,
        isPublished: false,
        isSystemTemplate: false,
        createdBy: ctx.userId,
      })
      .returning();

    if (!newTemplate) {
      throw new Error("Failed to duplicate template");
    }

    await tx.insert(templateVersions).values({
      tenantId: ctx.tenantId,
      templateId: newTemplate.id,
      version: 1,
      spec: specWithMeta,
      createdBy: ctx.userId,
      changeNote: `Duplicated from "${existing.name}"`,
    });

    return mapTemplateRow(newTemplate);
  });
}

export async function listTemplates(
  ctx: TenantContext,
  filters: TemplateFilters = {},
  page = 1,
  pageSize = 20
): Promise<TemplateListResult> {
  return withTenant(ctx.tenantId, async (tx) => {
    const conditions = [eq(labelTemplates.tenantId, ctx.tenantId)];

    if (filters.category) {
      conditions.push(eq(labelTemplates.category, filters.category));
    }

    if (filters.format) {
      conditions.push(eq(labelTemplates.format, filters.format));
    }

    if (filters.isPublished !== undefined) {
      conditions.push(eq(labelTemplates.isPublished, filters.isPublished));
    }

    if (filters.isSystemTemplate !== undefined) {
      conditions.push(eq(labelTemplates.isSystemTemplate, filters.isSystemTemplate));
    }

    if (filters.search) {
      conditions.push(
        or(
          ilike(labelTemplates.name, `%${filters.search}%`),
          ilike(labelTemplates.description, `%${filters.search}%`)
        )!
      );
    }

    const whereClause = and(...conditions);

    const [countResult] = await tx
      .select({ count: count() })
      .from(labelTemplates)
      .where(whereClause);

    const templates = await tx
      .select()
      .from(labelTemplates)
      .where(whereClause)
      .orderBy(desc(labelTemplates.updatedAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      templates: templates.map(mapTemplateRow),
      total: countResult?.count ?? 0,
      page,
      pageSize,
    };
  });
}

export async function getTemplateVersion(
  ctx: TenantContext,
  templateId: string,
  version: number
): Promise<TemplateVersion | null> {
  return withTenant(ctx.tenantId, async (tx) => {
    const [templateVersion] = await tx
      .select()
      .from(templateVersions)
      .where(
        and(
          eq(templateVersions.templateId, templateId),
          eq(templateVersions.version, version),
          eq(templateVersions.tenantId, ctx.tenantId)
        )
      );

    return templateVersion ? mapVersionRow(templateVersion) : null;
  });
}

export async function revertToVersion(
  ctx: TenantContext,
  templateId: string,
  version: number
): Promise<LabelTemplate | null> {
  return withTenant(ctx.tenantId, async (tx) => {
    const [targetVersion] = await tx
      .select()
      .from(templateVersions)
      .where(
        and(
          eq(templateVersions.templateId, templateId),
          eq(templateVersions.version, version),
          eq(templateVersions.tenantId, ctx.tenantId)
        )
      );

    if (!targetVersion) return null;

    const [existing] = await tx
      .select()
      .from(labelTemplates)
      .where(and(eq(labelTemplates.id, templateId), eq(labelTemplates.tenantId, ctx.tenantId)));

    if (!existing) return null;

    if (existing.isSystemTemplate) {
      throw new Error("Cannot modify system templates");
    }

    const newVersion = existing.version + 1;
    const specWithMeta: LabelSpec = {
      ...(targetVersion.spec as LabelSpec),
      version: String(newVersion),
    };

    await tx.insert(templateVersions).values({
      tenantId: ctx.tenantId,
      templateId,
      version: newVersion,
      spec: specWithMeta,
      createdBy: ctx.userId,
      changeNote: `Reverted to version ${version}`,
    });

    const [updated] = await tx
      .update(labelTemplates)
      .set({
        spec: specWithMeta,
        version: newVersion,
        updatedBy: ctx.userId,
        updatedAt: new Date(),
      })
      .where(and(eq(labelTemplates.id, templateId), eq(labelTemplates.tenantId, ctx.tenantId)))
      .returning();

    return updated ? mapTemplateRow(updated) : null;
  });
}
