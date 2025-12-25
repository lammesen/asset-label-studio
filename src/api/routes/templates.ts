import { requirePermission } from "@/api/middleware/permissions";
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

export async function handleGetTemplates(req: Request): Promise<Response> {
  return requirePermission("template:read", req, async (ctx) => {
    const url = new URL(req.url);
    const params = Object.fromEntries(url.searchParams);
    
    const parseResult = templateFiltersSchema.safeParse(params);
    if (!parseResult.success) {
      return Response.json(
        { error: "Invalid filters", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { page, pageSize, ...filters } = parseResult.data;
    const result = await listTemplates(ctx, filters, page, pageSize);

    return Response.json(result);
  });
}

export async function handleCreateTemplate(req: Request): Promise<Response> {
  return requirePermission("template:write", req, async (ctx) => {
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
  });
}

export async function handleGetTemplate(req: Request, id: string): Promise<Response> {
  return requirePermission("template:read", req, async (ctx) => {
    const url = new URL(req.url);
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
  });
}

export async function handleUpdateTemplate(req: Request, id: string): Promise<Response> {
  return requirePermission("template:write", req, async (ctx) => {
    const body = await req.json();
    
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
        description: parseResult.data.description,
        category: parseResult.data.category as EquipmentCategory | null | undefined,
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
  });
}

export async function handleDeleteTemplate(req: Request, id: string): Promise<Response> {
  return requirePermission("template:write", req, async (ctx) => {
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
  });
}

export async function handlePublishTemplate(req: Request, id: string): Promise<Response> {
  return requirePermission("template:publish", req, async (ctx) => {
    const body = await req.json().catch(() => ({}));
    const changeNote = typeof body.changeNote === "string" ? body.changeNote : undefined;

    const template = await publishTemplate(ctx, id, changeNote);
    if (!template) {
      return Response.json({ error: "Template not found" }, { status: 404 });
    }

    return Response.json({ template });
  });
}

export async function handleUnpublishTemplate(req: Request, id: string): Promise<Response> {
  return requirePermission("template:publish", req, async (ctx) => {
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
  });
}

export async function handleDuplicateTemplate(req: Request, id: string): Promise<Response> {
  return requirePermission("template:write", req, async (ctx) => {
    const body = await req.json();
    const newName = typeof body.name === "string" ? body.name : null;

    if (!newName) {
      return Response.json({ error: "Name is required" }, { status: 400 });
    }

    const template = await duplicateTemplate(ctx, id, newName);
    if (!template) {
      return Response.json({ error: "Template not found" }, { status: 404 });
    }

    return Response.json({ template }, { status: 201 });
  });
}

export async function handleGetTemplateVersion(
  req: Request,
  id: string,
  version: string
): Promise<Response> {
  return requirePermission("template:read", req, async (ctx) => {
    const versionNum = parseInt(version, 10);
    if (isNaN(versionNum) || versionNum < 1) {
      return Response.json({ error: "Invalid version number" }, { status: 400 });
    }

    const templateVersion = await getTemplateVersion(ctx, id, versionNum);
    if (!templateVersion) {
      return Response.json({ error: "Version not found" }, { status: 404 });
    }

    return Response.json({ version: templateVersion });
  });
}

export async function handleRevertToVersion(
  req: Request,
  id: string,
  version: string
): Promise<Response> {
  return requirePermission("template:write", req, async (ctx) => {
    const versionNum = parseInt(version, 10);
    if (isNaN(versionNum) || versionNum < 1) {
      return Response.json({ error: "Invalid version number" }, { status: 400 });
    }

    try {
      const template = await revertToVersion(ctx, id, versionNum);
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
  });
}
