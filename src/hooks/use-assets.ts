import { useState, useCallback } from "react";

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

export function useAssets() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listAssets = useCallback(async (filters: AssetFilters = {}): Promise<AssetListResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
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
        setError(data.error ?? "Failed to fetch assets");
        return null;
      }

      return await response.json();
    } catch {
      setError("Network error");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getAsset = useCallback(async (id: string): Promise<Asset | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/assets/${id}`, {
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error ?? "Failed to fetch asset");
        return null;
      }

      const data = await response.json();
      return data.asset;
    } catch {
      setError("Network error");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createAsset = useCallback(async (input: CreateAssetInput): Promise<Asset | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error ?? "Failed to create asset");
        return null;
      }

      const data = await response.json();
      return data.asset;
    } catch {
      setError("Network error");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateAsset = useCallback(async (id: string, input: UpdateAssetInput): Promise<Asset | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/assets/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error ?? "Failed to update asset");
        return null;
      }

      const data = await response.json();
      return data.asset;
    } catch {
      setError("Network error");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteAsset = useCallback(async (id: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/assets/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error ?? "Failed to delete asset");
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

  const getStats = useCallback(async (): Promise<AssetStats | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/assets/stats", {
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error ?? "Failed to fetch stats");
        return null;
      }

      const data = await response.json();
      return data.stats;
    } catch {
      setError("Network error");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    listAssets,
    getAsset,
    createAsset,
    updateAsset,
    deleteAsset,
    getStats,
  };
}
