import { useState, useCallback } from "react";

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

export function useTemplates() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listTemplates = useCallback(
    async (filters: TemplateFilters & { page?: number; pageSize?: number } = {}): Promise<TemplateListResult | null> => {
      setIsLoading(true);
      setError(null);

      try {
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
          setError(data.error ?? "Failed to fetch templates");
          return null;
        }

        return await response.json();
      } catch {
        setError("Network error");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const getTemplate = useCallback(
    async (id: string, includeHistory = false): Promise<LabelTemplate | TemplateWithHistory | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const url = includeHistory ? `/api/templates/${id}?history=true` : `/api/templates/${id}`;
        const response = await fetch(url, {
          credentials: "include",
        });

        if (!response.ok) {
          const data = await response.json();
          setError(data.error ?? "Failed to fetch template");
          return null;
        }

        const data = await response.json();
        return data.template;
      } catch {
        setError("Network error");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const createTemplate = useCallback(async (input: CreateTemplateInput): Promise<LabelTemplate | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error ?? "Failed to create template");
        return null;
      }

      const data = await response.json();
      return data.template;
    } catch {
      setError("Network error");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateTemplate = useCallback(
    async (id: string, input: UpdateTemplateInput): Promise<LabelTemplate | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/templates/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
          credentials: "include",
        });

        if (!response.ok) {
          const data = await response.json();
          setError(data.error ?? "Failed to update template");
          return null;
        }

        const data = await response.json();
        return data.template;
      } catch {
        setError("Network error");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const deleteTemplate = useCallback(async (id: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error ?? "Failed to delete template");
        return false;
      }

      return true;
    } catch {
      setError("Network error");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const publishTemplate = useCallback(
    async (id: string, changeNote?: string): Promise<LabelTemplate | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/templates/${id}/publish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ changeNote }),
          credentials: "include",
        });

        if (!response.ok) {
          const data = await response.json();
          setError(data.error ?? "Failed to publish template");
          return null;
        }

        const data = await response.json();
        return data.template;
      } catch {
        setError("Network error");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const unpublishTemplate = useCallback(async (id: string): Promise<LabelTemplate | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/templates/${id}/publish`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error ?? "Failed to unpublish template");
        return null;
      }

      const data = await response.json();
      return data.template;
    } catch {
      setError("Network error");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const duplicateTemplate = useCallback(
    async (id: string, newName: string): Promise<LabelTemplate | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/templates/${id}/duplicate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName }),
          credentials: "include",
        });

        if (!response.ok) {
          const data = await response.json();
          setError(data.error ?? "Failed to duplicate template");
          return null;
        }

        const data = await response.json();
        return data.template;
      } catch {
        setError("Network error");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const getTemplateVersion = useCallback(
    async (templateId: string, version: number): Promise<TemplateVersion | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/templates/${templateId}/versions/${version}`, {
          credentials: "include",
        });

        if (!response.ok) {
          const data = await response.json();
          setError(data.error ?? "Failed to fetch version");
          return null;
        }

        const data = await response.json();
        return data.version;
      } catch {
        setError("Network error");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const revertToVersion = useCallback(
    async (templateId: string, version: number): Promise<LabelTemplate | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/templates/${templateId}/versions/${version}/revert`, {
          method: "POST",
          credentials: "include",
        });

        if (!response.ok) {
          const data = await response.json();
          setError(data.error ?? "Failed to revert version");
          return null;
        }

        const data = await response.json();
        return data.template;
      } catch {
        setError("Network error");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    isLoading,
    error,
    listTemplates,
    getTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    publishTemplate,
    unpublishTemplate,
    duplicateTemplate,
    getTemplateVersion,
    revertToVersion,
  };
}
