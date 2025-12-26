import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-client";
import { apiGet, apiPost, apiDelete } from "@/lib/api-client";
import type {
  PrintJob,
  PrintJobItem,
  PrintJobFilters,
  PrintJobListResult,
  CreatePrintJobInput,
} from "@/types/print";

async function fetchJobs(
  filters: PrintJobFilters,
  page: number,
  pageSize: number
): Promise<PrintJobListResult> {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.templateId) params.set("templateId", filters.templateId);
  if (filters.createdBy) params.set("createdBy", filters.createdBy);
  if (filters.startDate) params.set("startDate", filters.startDate.toISOString());
  if (filters.endDate) params.set("endDate", filters.endDate.toISOString());
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));

  const response = await apiGet(`/api/print/jobs?${params}`);

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error ?? "Failed to fetch print jobs");
  }

  return response.json();
}

async function fetchJob(id: string): Promise<PrintJob> {
  const response = await apiGet(`/api/print/jobs/${id}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Print job not found");
    }
    const data = await response.json();
    throw new Error(data.error ?? "Failed to fetch print job");
  }

  const { job } = await response.json();
  return job;
}

async function fetchJobItems(jobId: string): Promise<PrintJobItem[]> {
  const response = await apiGet(`/api/print/jobs/${jobId}/items`);

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error ?? "Failed to fetch job items");
  }

  const { items } = await response.json();
  return items;
}

async function createJobApi(input: CreatePrintJobInput): Promise<PrintJob> {
  const response = await apiPost("/api/print/jobs", input);

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error ?? "Failed to create print job");
  }

  const { job } = await response.json();
  return job;
}

async function renderJobApi(jobId: string): Promise<Blob> {
  const response = await apiGet(`/api/print/jobs/${jobId}/pdf`);

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error ?? "Failed to render print job");
  }

  return response.blob();
}

async function cancelJobApi(jobId: string): Promise<PrintJob> {
  const response = await apiDelete(`/api/print/jobs/${jobId}`);

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error ?? "Failed to cancel print job");
  }

  const { job } = await response.json();
  return job;
}

async function previewApi(templateId: string, assetId: string): Promise<Blob> {
  const response = await apiPost("/api/print/preview", { templateId, assetId });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error ?? "Failed to generate preview");
  }

  return response.blob();
}

export function usePrintJobList(
  filters: PrintJobFilters = {},
  page = 1,
  pageSize = 20
) {
  return useQuery({
    queryKey: queryKeys.print.jobList({ ...filters, page, pageSize } as Record<string, unknown>),
    queryFn: () => fetchJobs(filters, page, pageSize),
  });
}

export function usePrintJob(id: string | null) {
  return useQuery({
    queryKey: queryKeys.print.job(id ?? ""),
    queryFn: () => fetchJob(id!),
    enabled: !!id,
  });
}

export function usePrintJobItems(jobId: string | null) {
  return useQuery({
    queryKey: queryKeys.print.jobItems(jobId ?? ""),
    queryFn: () => fetchJobItems(jobId!),
    enabled: !!jobId,
  });
}

export function useCreatePrintJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createJobApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.print.jobs() });
    },
  });
}

export function useRenderPrintJob() {
  return useMutation({
    mutationFn: renderJobApi,
  });
}

export function useCancelPrintJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelJobApi,
    onSuccess: (updatedJob) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.print.jobs() });
      queryClient.setQueryData(queryKeys.print.job(updatedJob.id), updatedJob);
    },
  });
}

export function usePreviewLabel() {
  return useMutation({
    mutationFn: ({ templateId, assetId }: { templateId: string; assetId: string }) =>
      previewApi(templateId, assetId),
  });
}

export function usePrint() {
  const queryClient = useQueryClient();
  const createMutation = useCreatePrintJob();
  const renderMutation = useRenderPrintJob();
  const cancelMutation = useCancelPrintJob();
  const previewMutation = usePreviewLabel();

  return {
    jobs: [] as PrintJob[],
    currentJob: null as PrintJob | null,
    currentJobItems: [] as PrintJobItem[],
    total: 0,
    page: 1,
    pageSize: 20,
    isLoading: false,
    isCreating: createMutation.isPending,
    isRendering: renderMutation.isPending || previewMutation.isPending,
    error: createMutation.error?.message || renderMutation.error?.message || null,

    fetchJobs: async (
      filters: PrintJobFilters = {},
      page = 1,
      pageSize = 20
    ): Promise<void> => {
      await queryClient.fetchQuery({
        queryKey: queryKeys.print.jobList({ ...filters, page, pageSize } as Record<string, unknown>),
        queryFn: () => fetchJobs(filters, page, pageSize),
      });
    },

    fetchJob: async (id: string): Promise<PrintJob | null> => {
      try {
        return await queryClient.fetchQuery({
          queryKey: queryKeys.print.job(id),
          queryFn: () => fetchJob(id),
        });
      } catch {
        return null;
      }
    },

    fetchJobItems: async (jobId: string): Promise<PrintJobItem[]> => {
      try {
        return await queryClient.fetchQuery({
          queryKey: queryKeys.print.jobItems(jobId),
          queryFn: () => fetchJobItems(jobId),
        });
      } catch {
        return [];
      }
    },

    createJob: async (input: CreatePrintJobInput): Promise<PrintJob | null> => {
      try {
        return await createMutation.mutateAsync(input);
      } catch {
        return null;
      }
    },

    renderJob: async (jobId: string): Promise<Blob | null> => {
      try {
        return await renderMutation.mutateAsync(jobId);
      } catch {
        return null;
      }
    },

    cancelJob: async (jobId: string): Promise<boolean> => {
      try {
        await cancelMutation.mutateAsync(jobId);
        return true;
      } catch {
        return false;
      }
    },

    preview: async (templateId: string, assetId: string): Promise<Blob | null> => {
      try {
        return await previewMutation.mutateAsync({ templateId, assetId });
      } catch {
        return null;
      }
    },

    downloadPdf: async (jobId: string, filename?: string): Promise<void> => {
      const blob = await renderMutation.mutateAsync(jobId);
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename ?? `print-job-${jobId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },

    clearError: () => {
      createMutation.reset();
      renderMutation.reset();
      cancelMutation.reset();
      previewMutation.reset();
    },

    invalidatePrintJobs: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.print.all });
    },
  };
}
