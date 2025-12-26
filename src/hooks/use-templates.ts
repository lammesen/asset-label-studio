import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-client";
import type {
  LabelTemplate,
  TemplateVersion,
  TemplateFilters,
  TemplateListResult,
  TemplateWithHistory,
} from "@/types/template";
import type { LabelSpec, LabelFormatId } from "@/types/label-spec";
import type { EquipmentCategory } from "@/types/asset";

interface CreateTemplateInput {
  name: string;
  description?: string;
  category?: EquipmentCategory;
  format: LabelFormatId;
  spec: LabelSpec;
}

interface UpdateTemplateInput {
  name?: string;
  description?: string | null;
  category?: EquipmentCategory | null;
  format?: LabelFormatId;
  spec?: LabelSpec;
  changeNote?: string;
}

type ListTemplateFilters = TemplateFilters & { page?: number; pageSize?: number };

async function fetchTemplates(filters: ListTemplateFilters): Promise<TemplateListResult> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  });

  const response = await fetch(`/api/templates?${params}`, {
    credentials: "include",
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error ?? "Failed to fetch templates");
  }

  return response.json();
}

async function fetchTemplate(id: string, includeHistory: boolean): Promise<LabelTemplate | TemplateWithHistory> {
  const url = includeHistory ? `/api/templates/${id}?history=true` : `/api/templates/${id}`;
  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error ?? "Failed to fetch template");
  }

  const data = await response.json();
  return data.template;
}

async function createTemplateApi(input: CreateTemplateInput): Promise<LabelTemplate> {
  const response = await fetch("/api/templates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    credentials: "include",
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error ?? "Failed to create template");
  }

  const data = await response.json();
  return data.template;
}

async function updateTemplateApi(id: string, input: UpdateTemplateInput): Promise<LabelTemplate> {
  const response = await fetch(`/api/templates/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    credentials: "include",
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error ?? "Failed to update template");
  }

  const data = await response.json();
  return data.template;
}

async function deleteTemplateApi(id: string): Promise<void> {
  const response = await fetch(`/api/templates/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error ?? "Failed to delete template");
  }
}

async function publishTemplateApi(id: string, changeNote?: string): Promise<LabelTemplate> {
  const response = await fetch(`/api/templates/${id}/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ changeNote }),
    credentials: "include",
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error ?? "Failed to publish template");
  }

  const data = await response.json();
  return data.template;
}

async function unpublishTemplateApi(id: string): Promise<LabelTemplate> {
  const response = await fetch(`/api/templates/${id}/publish`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error ?? "Failed to unpublish template");
  }

  const data = await response.json();
  return data.template;
}

async function duplicateTemplateApi(id: string, newName: string): Promise<LabelTemplate> {
  const response = await fetch(`/api/templates/${id}/duplicate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: newName }),
    credentials: "include",
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error ?? "Failed to duplicate template");
  }

  const data = await response.json();
  return data.template;
}

async function fetchTemplateVersion(templateId: string, version: number): Promise<TemplateVersion> {
  const response = await fetch(`/api/templates/${templateId}/versions/${version}`, {
    credentials: "include",
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error ?? "Failed to fetch version");
  }

  const data = await response.json();
  return data.version;
}

async function revertToVersionApi(templateId: string, version: number): Promise<LabelTemplate> {
  const response = await fetch(`/api/templates/${templateId}/versions/${version}/revert`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error ?? "Failed to revert version");
  }

  const data = await response.json();
  return data.template;
}

export function useTemplateList(filters: ListTemplateFilters = {}) {
  return useQuery({
    queryKey: queryKeys.templates.list(filters as Record<string, unknown>),
    queryFn: () => fetchTemplates(filters),
  });
}

export function useTemplate(id: string | null, includeHistory = false) {
  return useQuery({
    queryKey: queryKeys.templates.detail(id ?? ""),
    queryFn: () => fetchTemplate(id!, includeHistory),
    enabled: !!id,
  });
}

export function useTemplateVersion(templateId: string | null, version: number | null) {
  return useQuery({
    queryKey: queryKeys.templates.version(templateId ?? "", version ?? 0),
    queryFn: () => fetchTemplateVersion(templateId!, version!),
    enabled: !!templateId && version !== null,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTemplateApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.templates.lists() });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTemplateInput }) =>
      updateTemplateApi(id, input),
    onSuccess: (updatedTemplate) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.templates.lists() });
      queryClient.setQueryData(queryKeys.templates.detail(updatedTemplate.id), updatedTemplate);
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTemplateApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.templates.lists() });
    },
  });
}

export function usePublishTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, changeNote }: { id: string; changeNote?: string }) =>
      publishTemplateApi(id, changeNote),
    onSuccess: (updatedTemplate) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.templates.lists() });
      queryClient.setQueryData(queryKeys.templates.detail(updatedTemplate.id), updatedTemplate);
    },
  });
}

export function useUnpublishTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: unpublishTemplateApi,
    onSuccess: (updatedTemplate) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.templates.lists() });
      queryClient.setQueryData(queryKeys.templates.detail(updatedTemplate.id), updatedTemplate);
    },
  });
}

export function useDuplicateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, newName }: { id: string; newName: string }) =>
      duplicateTemplateApi(id, newName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.templates.lists() });
    },
  });
}

export function useRevertToVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ templateId, version }: { templateId: string; version: number }) =>
      revertToVersionApi(templateId, version),
    onSuccess: (updatedTemplate) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.templates.lists() });
      queryClient.setQueryData(queryKeys.templates.detail(updatedTemplate.id), updatedTemplate);
    },
  });
}

export function useTemplates() {
  const queryClient = useQueryClient();
  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate();
  const deleteMutation = useDeleteTemplate();
  const publishMutation = usePublishTemplate();
  const unpublishMutation = useUnpublishTemplate();
  const duplicateMutation = useDuplicateTemplate();
  const revertMutation = useRevertToVersion();

  return {
    isLoading: createMutation.isPending || updateMutation.isPending,
    error: createMutation.error?.message || updateMutation.error?.message || null,

    listTemplates: async (filters: ListTemplateFilters = {}): Promise<TemplateListResult | null> => {
      try {
        return await queryClient.fetchQuery({
          queryKey: queryKeys.templates.list(filters as Record<string, unknown>),
          queryFn: () => fetchTemplates(filters),
        });
      } catch {
        return null;
      }
    },

    getTemplate: async (id: string, includeHistory = false): Promise<LabelTemplate | TemplateWithHistory | null> => {
      try {
        return await queryClient.fetchQuery({
          queryKey: queryKeys.templates.detail(id),
          queryFn: () => fetchTemplate(id, includeHistory),
        });
      } catch {
        return null;
      }
    },

    createTemplate: async (input: CreateTemplateInput): Promise<LabelTemplate | null> => {
      try {
        return await createMutation.mutateAsync(input);
      } catch {
        return null;
      }
    },

    updateTemplate: async (id: string, input: UpdateTemplateInput): Promise<LabelTemplate | null> => {
      try {
        return await updateMutation.mutateAsync({ id, input });
      } catch {
        return null;
      }
    },

    deleteTemplate: async (id: string): Promise<boolean> => {
      try {
        await deleteMutation.mutateAsync(id);
        return true;
      } catch {
        return false;
      }
    },

    publishTemplate: async (id: string, changeNote?: string): Promise<LabelTemplate | null> => {
      try {
        return await publishMutation.mutateAsync({ id, changeNote });
      } catch {
        return null;
      }
    },

    unpublishTemplate: async (id: string): Promise<LabelTemplate | null> => {
      try {
        return await unpublishMutation.mutateAsync(id);
      } catch {
        return null;
      }
    },

    duplicateTemplate: async (id: string, newName: string): Promise<LabelTemplate | null> => {
      try {
        return await duplicateMutation.mutateAsync({ id, newName });
      } catch {
        return null;
      }
    },

    getTemplateVersion: async (templateId: string, version: number): Promise<TemplateVersion | null> => {
      try {
        return await queryClient.fetchQuery({
          queryKey: queryKeys.templates.version(templateId, version),
          queryFn: () => fetchTemplateVersion(templateId, version),
        });
      } catch {
        return null;
      }
    },

    revertToVersion: async (templateId: string, version: number): Promise<LabelTemplate | null> => {
      try {
        return await revertMutation.mutateAsync({ templateId, version });
      } catch {
        return null;
      }
    },

    invalidateTemplates: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.templates.all });
    },
  };
}
