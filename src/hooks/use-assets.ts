import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-client";
import type { Asset, EquipmentCategory, AssetStatus } from "@/types/asset";

interface AssetListResult {
  assets: Asset[];
  total: number;
  page: number;
  pageSize: number;
}

interface AssetFilters {
  category?: EquipmentCategory;
  status?: AssetStatus;
  location?: string;
  department?: string;
  assignedTo?: string;
  manufacturer?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

interface AssetStats {
  total: number;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
}

interface CreateAssetInput {
  category: EquipmentCategory;
  type: string;
  assetTag: string;
  serialNumber: string;
  manufacturer: string;
  model: string;
  location: string;
  department?: string;
  assignedTo?: string;
  status?: AssetStatus;
  purchaseDate?: string;
  warrantyExpiry?: string;
  notes?: string;
  customFields?: Record<string, unknown>;
}

interface UpdateAssetInput {
  type?: string;
  assetTag?: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  location?: string;
  department?: string | null;
  assignedTo?: string | null;
  status?: AssetStatus;
  purchaseDate?: string | null;
  warrantyExpiry?: string | null;
  retiredDate?: string | null;
  notes?: string | null;
  customFields?: Record<string, unknown>;
}

async function fetchAssets(filters: AssetFilters): Promise<AssetListResult> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  });

  const response = await fetch(`/api/assets?${params}`, {
    credentials: "include",
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error ?? "Failed to fetch assets");
  }

  return response.json();
}

async function fetchAsset(id: string): Promise<Asset> {
  const response = await fetch(`/api/assets/${id}`, {
    credentials: "include",
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error ?? "Failed to fetch asset");
  }

  const data = await response.json();
  return data.asset;
}

async function fetchAssetStats(): Promise<AssetStats> {
  const response = await fetch("/api/assets/stats", {
    credentials: "include",
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error ?? "Failed to fetch stats");
  }

  const data = await response.json();
  return data.stats;
}

async function createAssetApi(input: CreateAssetInput): Promise<Asset> {
  const response = await fetch("/api/assets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    credentials: "include",
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error ?? "Failed to create asset");
  }

  const data = await response.json();
  return data.asset;
}

async function updateAssetApi(id: string, input: UpdateAssetInput): Promise<Asset> {
  const response = await fetch(`/api/assets/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    credentials: "include",
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error ?? "Failed to update asset");
  }

  const data = await response.json();
  return data.asset;
}

async function deleteAssetApi(id: string): Promise<void> {
  const response = await fetch(`/api/assets/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error ?? "Failed to delete asset");
  }
}

export function useAssetList(filters: AssetFilters = {}) {
  return useQuery({
    queryKey: queryKeys.assets.list(filters as Record<string, unknown>),
    queryFn: () => fetchAssets(filters),
  });
}

export function useAsset(id: string | null) {
  return useQuery({
    queryKey: queryKeys.assets.detail(id ?? ""),
    queryFn: () => fetchAsset(id!),
    enabled: !!id,
  });
}

export function useAssetStats() {
  return useQuery({
    queryKey: queryKeys.assets.stats(),
    queryFn: fetchAssetStats,
  });
}

export function useCreateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAssetApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.stats() });
    },
  });
}

export function useUpdateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAssetInput }) =>
      updateAssetApi(id, input),
    onSuccess: (updatedAsset) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.lists() });
      queryClient.setQueryData(queryKeys.assets.detail(updatedAsset.id), updatedAsset);
    },
  });
}

export function useDeleteAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAssetApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.stats() });
    },
  });
}

export function useAssets() {
  const queryClient = useQueryClient();
  const createMutation = useCreateAsset();
  const updateMutation = useUpdateAsset();
  const deleteMutation = useDeleteAsset();

  return {
    isLoading: false,
    error: null,
    listAssets: async (filters: AssetFilters = {}): Promise<AssetListResult | null> => {
      try {
        return await queryClient.fetchQuery({
          queryKey: queryKeys.assets.list(filters as Record<string, unknown>),
          queryFn: () => fetchAssets(filters),
        });
      } catch {
        return null;
      }
    },
    getAsset: async (id: string): Promise<Asset | null> => {
      try {
        return await queryClient.fetchQuery({
          queryKey: queryKeys.assets.detail(id),
          queryFn: () => fetchAsset(id),
        });
      } catch {
        return null;
      }
    },
    createAsset: async (input: CreateAssetInput): Promise<Asset | null> => {
      try {
        return await createMutation.mutateAsync(input);
      } catch {
        return null;
      }
    },
    updateAsset: async (id: string, input: UpdateAssetInput): Promise<Asset | null> => {
      try {
        return await updateMutation.mutateAsync({ id, input });
      } catch {
        return null;
      }
    },
    deleteAsset: async (id: string): Promise<boolean> => {
      try {
        await deleteMutation.mutateAsync(id);
        return true;
      } catch {
        return false;
      }
    },
    getStats: async (): Promise<AssetStats | null> => {
      try {
        return await queryClient.fetchQuery({
          queryKey: queryKeys.assets.stats(),
          queryFn: fetchAssetStats,
        });
      } catch {
        return null;
      }
    },
    invalidateAssets: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.all });
    },
  };
}
