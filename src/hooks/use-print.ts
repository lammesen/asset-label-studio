import { useState, useCallback } from "react";

import { apiFetch, apiGet, apiPost, apiDelete } from "@/lib/api-client";
import type {
  PrintJob,
  PrintJobItem,
  PrintJobFilters,
  PrintJobListResult,
  CreatePrintJobInput,
} from "@/types/print";

interface UsePrintState {
  jobs: PrintJob[];
  currentJob: PrintJob | null;
  currentJobItems: PrintJobItem[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  isCreating: boolean;
  isRendering: boolean;
  error: string | null;
}

interface UsePrintActions {
  fetchJobs: (filters?: PrintJobFilters, page?: number, pageSize?: number) => Promise<void>;
  fetchJob: (id: string) => Promise<PrintJob | null>;
  fetchJobItems: (jobId: string) => Promise<PrintJobItem[]>;
  createJob: (input: CreatePrintJobInput) => Promise<PrintJob | null>;
  renderJob: (jobId: string) => Promise<Blob | null>;
  cancelJob: (jobId: string) => Promise<boolean>;
  preview: (templateId: string, assetId: string) => Promise<Blob | null>;
  downloadPdf: (jobId: string, filename?: string) => Promise<void>;
  clearError: () => void;
}

export function usePrint(): UsePrintState & UsePrintActions {
  const [state, setState] = useState<UsePrintState>({
    jobs: [],
    currentJob: null,
    currentJobItems: [],
    total: 0,
    page: 1,
    pageSize: 20,
    isLoading: false,
    isCreating: false,
    isRendering: false,
    error: null,
  });

  const fetchJobs = useCallback(async (
    filters: PrintJobFilters = {},
    page = 1,
    pageSize = 20
  ): Promise<void> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
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

      const result: PrintJobListResult = await response.json();
      
      setState((prev) => ({
        ...prev,
        jobs: result.jobs,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        isLoading: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }));
    }
  }, []);

  const fetchJob = useCallback(async (id: string): Promise<PrintJob | null> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await apiGet(`/api/print/jobs/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setState((prev) => ({ ...prev, isLoading: false, currentJob: null }));
          return null;
        }
        const data = await response.json();
        throw new Error(data.error ?? "Failed to fetch print job");
      }

      const { job } = await response.json();
      
      setState((prev) => ({
        ...prev,
        currentJob: job,
        isLoading: false,
      }));

      return job;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }));
      return null;
    }
  }, []);

  const fetchJobItems = useCallback(async (jobId: string): Promise<PrintJobItem[]> => {
    try {
      const response = await apiGet(`/api/print/jobs/${jobId}/items`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to fetch job items");
      }

      const { items } = await response.json();
      
      setState((prev) => ({
        ...prev,
        currentJobItems: items,
      }));

      return items;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Unknown error",
      }));
      return [];
    }
  }, []);

  const createJob = useCallback(async (input: CreatePrintJobInput): Promise<PrintJob | null> => {
    setState((prev) => ({ ...prev, isCreating: true, error: null }));

    try {
      const response = await apiPost("/api/print/jobs", input);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to create print job");
      }

      const { job } = await response.json();

      setState((prev) => ({
        ...prev,
        jobs: [job, ...prev.jobs],
        currentJob: job,
        isCreating: false,
      }));

      return job;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isCreating: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }));
      return null;
    }
  }, []);

  const renderJob = useCallback(async (jobId: string): Promise<Blob | null> => {
    setState((prev) => ({ ...prev, isRendering: true, error: null }));

    try {
      const response = await apiGet(`/api/print/jobs/${jobId}/pdf`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to render print job");
      }

      const blob = await response.blob();

      setState((prev) => ({ ...prev, isRendering: false }));

      return blob;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isRendering: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }));
      return null;
    }
  }, []);

  const cancelJob = useCallback(async (jobId: string): Promise<boolean> => {
    try {
      const response = await apiDelete(`/api/print/jobs/${jobId}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to cancel print job");
      }

      const { job } = await response.json();

      setState((prev) => ({
        ...prev,
        jobs: prev.jobs.map((j) => (j.id === jobId ? job : j)),
        currentJob: prev.currentJob?.id === jobId ? job : prev.currentJob,
      }));

      return true;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Unknown error",
      }));
      return false;
    }
  }, []);

  const preview = useCallback(async (templateId: string, assetId: string): Promise<Blob | null> => {
    setState((prev) => ({ ...prev, isRendering: true, error: null }));

    try {
      const response = await apiPost("/api/print/preview", { templateId, assetId });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to generate preview");
      }

      const blob = await response.blob();

      setState((prev) => ({ ...prev, isRendering: false }));

      return blob;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isRendering: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }));
      return null;
    }
  }, []);

  const downloadPdf = useCallback(async (jobId: string, filename?: string): Promise<void> => {
    const blob = await renderJob(jobId);
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename ?? `print-job-${jobId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [renderJob]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    fetchJobs,
    fetchJob,
    fetchJobItems,
    createJob,
    renderJob,
    cancelJob,
    preview,
    downloadPdf,
    clearError,
  };
}
