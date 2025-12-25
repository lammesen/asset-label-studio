import { withAuth } from "@/api/middleware/auth";
import { requirePermission } from "@/api/middleware/permissions";
import { PERMISSIONS } from "@/types/permissions";
import {
  createTemplateSchema,
  updateTemplateSchema,
  templateFiltersSchema,
} from "@/lib/validations";
import {
  createTemplate,
  getTemplateById,
  getTemplateWithHistory,
  updateTemplate,
  deleteTemplate,
  publishTemplate,
  unpublishTemplate,
  duplicateTemplate,
  listTemplates,
  getTemplateVersion,
  revertToVersion,
} from "@/services/template-service";
import type { LabelSpec } from "@/types/label-spec";
import type { EquipmentCategory } from "@/types/asset";
import type { LabelFormatId } from "@/types/label-spec";
import type { TemplateFilters } from "@/types/template";

export const handleGetTemplates = withAuth(
  requirePermission(PERMISSIONS.TEMPLATE_READ, async (req, ctx) => {
    const url = new URL(req.url);
    const params = Object.fromEntries(url.searchParams);
    
    const parseResult = templateFiltersSchema.safeParse(params);
    if (!parseResult.success) {
      return Response.json(
        { error: "Invalid filters", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { page, pageSize, ...rawFilters } = parseResult.data;
    const filters: TemplateFilters = {
      category: rawFilters.category as EquipmentCategory | undefined,
      format: rawFilters.format as LabelFormatId | undefined,
      isPublished: rawFilters.isPublished,
      isSystemTemplate: rawFilters.isSystemTemplate,
      search: rawFilters.search,
    };
    const result = await listTemplates(ctx, filters, page, pageSize);

    return Response.json(result);
  })
);

export const handleCreateTemplate = withAuth(
  requirePermission(PERMISSIONS.TEMPLATE_WRITE, async (req, ctx) => {
    const body = await req.json();
    
    const parseResult = createTemplateSchema.safeParse(body);
    if (!parseResult.success) {
      return Response.json(
        { error: "Invalid input", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const template = await createTemplate(ctx, {
      name: parseResult.data.name,
      description: parseResult.data.description,
      category: parseResult.data.category as EquipmentCategory | undefined,
      format: parseResult.data.format as LabelFormatId,
      spec: parseResult.data.spec as LabelSpec,
    });

    return Response.json({ template }, { status: 201 });
  })
);

export function handleGetTemplate(req: Request, id: string): Response | Promise<Response> {
  return withAuth(
    requirePermission(PERMISSIONS.TEMPLATE_READ, async (r, ctx) => {
      const url = new URL(r.url);
      const includeHistory = url.searchParams.get("history") === "true";

      if (includeHistory) {
        const template = await getTemplateWithHistory(ctx, id);
        if (!template) {
          return Response.json({ error: "Template not found" }, { status: 404 });
        }
        return Response.json({ template });
      }

      const template = await getTemplateById(ctx, id);
      if (!template) {
        return Response.json({ error: "Template not found" }, { status: 404 });
      }

      return Response.json({ template });
    })
  )(req);
}

export function handleUpdateTemplate(req: Request, id: string): Response | Promise<Response> {
  return withAuth(
    requirePermission(PERMISSIONS.TEMPLATE_WRITE, async (r, ctx) => {
      const body = await r.json();
      
      const parseResult = updateTemplateSchema.safeParse(body);
      if (!parseResult.success) {
        return Response.json(
          { error: "Invalid input", details: parseResult.error.flatten() },
          { status: 400 }
        );
      }

      try {
        const template = await updateTemplate(ctx, id, {
          name: parseResult.data.name,
          description: parseResult.data.description ?? undefined,
          category: (parseResult.data.category ?? undefined) as EquipmentCategory | undefined,
          format: parseResult.data.format as LabelFormatId | undefined,
          spec: parseResult.data.spec as LabelSpec | undefined,
          changeNote: parseResult.data.changeNote,
        });

        if (!template) {
          return Response.json({ error: "Template not found" }, { status: 404 });
        }

        return Response.json({ template });
      } catch (error) {
        if (error instanceof Error && error.message.includes("system template")) {
          return Response.json({ error: error.message }, { status: 403 });
        }
        throw error;
      }
    })
  )(req);
}

export function handleDeleteTemplate(req: Request, id: string): Response | Promise<Response> {
  return withAuth(
    requirePermission(PERMISSIONS.TEMPLATE_WRITE, async (_req, ctx) => {
      try {
        const success = await deleteTemplate(ctx, id);
        if (!success) {
          return Response.json({ error: "Template not found" }, { status: 404 });
        }

        return Response.json({ success: true });
      } catch (error) {
        if (error instanceof Error && error.message.includes("system template")) {
          return Response.json({ error: error.message }, { status: 403 });
        }
        throw error;
      }
    })
  )(req);
}

export function handlePublishTemplate(req: Request, id: string): Response | Promise<Response> {
  return withAuth(
    requirePermission(PERMISSIONS.TEMPLATE_PUBLISH, async (r, ctx) => {
      const body = await r.json().catch(() => ({}));
      const changeNote = typeof body.changeNote === "string" ? body.changeNote : undefined;

      const template = await publishTemplate(ctx, id, changeNote);
      if (!template) {
        return Response.json({ error: "Template not found" }, { status: 404 });
      }

      return Response.json({ template });
    })
  )(req);
}

export function handleUnpublishTemplate(req: Request, id: string): Response | Promise<Response> {
  return withAuth(
    requirePermission(PERMISSIONS.TEMPLATE_PUBLISH, async (_req, ctx) => {
      try {
        const template = await unpublishTemplate(ctx, id);
        if (!template) {
          return Response.json({ error: "Template not found" }, { status: 404 });
        }

        return Response.json({ template });
      } catch (error) {
        if (error instanceof Error && error.message.includes("system template")) {
          return Response.json({ error: error.message }, { status: 403 });
        }
        throw error;
      }
    })
  )(req);
}

export function handleDuplicateTemplate(req: Request, id: string): Response | Promise<Response> {
  return withAuth(
    requirePermission(PERMISSIONS.TEMPLATE_WRITE, async (r, ctx) => {
      const body = await r.json();
      const newName = typeof body.name === "string" ? body.name : null;

      if (!newName) {
        return Response.json({ error: "Name is required" }, { status: 400 });
      }

      const template = await duplicateTemplate(ctx, id, newName);
      if (!template) {
        return Response.json({ error: "Template not found" }, { status: 404 });
      }

      return Response.json({ template }, { status: 201 });
    })
  )(req);
}

export function handleGetTemplateVersion(
  req: Request,
  params: { id: string; version: string }
): Response | Promise<Response> {
  return withAuth(
    requirePermission(PERMISSIONS.TEMPLATE_READ, async (_req, ctx) => {
      const versionNum = parseInt(params.version, 10);
      if (isNaN(versionNum) || versionNum < 1) {
        return Response.json({ error: "Invalid version number" }, { status: 400 });
      }

      const templateVersion = await getTemplateVersion(ctx, params.id, versionNum);
      if (!templateVersion) {
        return Response.json({ error: "Version not found" }, { status: 404 });
      }

      return Response.json({ version: templateVersion });
    })
  )(req);
}

export function handleRevertToVersion(
  req: Request,
  params: { id: string; version: string }
): Response | Promise<Response> {
  return withAuth(
    requirePermission(PERMISSIONS.TEMPLATE_WRITE, async (_req, ctx) => {
      const versionNum = parseInt(params.version, 10);
      if (isNaN(versionNum) || versionNum < 1) {
        return Response.json({ error: "Invalid version number" }, { status: 400 });
      }

      try {
        const template = await revertToVersion(ctx, params.id, versionNum);
        if (!template) {
          return Response.json({ error: "Template or version not found" }, { status: 404 });
        }

        return Response.json({ template });
      } catch (error) {
        if (error instanceof Error && error.message.includes("system template")) {
          return Response.json({ error: error.message }, { status: 403 });
        }
        throw error;
      }
    })
  )(req);
}
