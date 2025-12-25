import { useEffect, useState, useCallback } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAssets } from "@/hooks/use-assets";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import type { Asset, EquipmentCategory, AssetStatus } from "@/types/asset";
import { EQUIPMENT_CATEGORIES, ASSET_STATUSES } from "@/types/asset";

interface AssetListProps {
  onEditAsset: (asset: Asset) => void;
  onCreateAsset: () => void;
}

const CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  networking: "Networking",
  servers: "Servers",
  cabling: "Cabling",
  power: "Power",
  physical: "Physical",
  "iot-edge": "IoT/Edge",
};

const STATUS_LABELS: Record<AssetStatus, string> = {
  active: "Active",
  maintenance: "Maintenance",
  retired: "Retired",
  pending: "Pending",
  disposed: "Disposed",
};

const STATUS_COLORS: Record<AssetStatus, string> = {
  active: "bg-green-100 text-green-800 hover:bg-green-100",
  maintenance: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  pending: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  retired: "bg-gray-100 text-gray-800 hover:bg-gray-100",
  disposed: "bg-red-100 text-red-800 hover:bg-red-100",
};

const CATEGORY_COLORS: Record<EquipmentCategory, string> = {
  networking: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  servers: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  cabling: "bg-orange-100 text-orange-800 hover:bg-orange-100",
  power: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  physical: "bg-gray-100 text-gray-800 hover:bg-gray-100",
  "iot-edge": "bg-teal-100 text-teal-800 hover:bg-teal-100",
};

const PAGE_SIZE = 10;

export function AssetList({ onEditAsset, onCreateAsset }: AssetListProps) {
  const { listAssets, deleteAsset, isLoading, error } = useAssets();
  const { hasPermission } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<EquipmentCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<AssetStatus | "all">("all");
  const [deleteConfirmAsset, setDeleteConfirmAsset] = useState<Asset | null>(null);

  const canWrite = hasPermission("asset:write");
  const canDelete = hasPermission("asset:delete");

  const fetchAssets = useCallback(async () => {
    const result = await listAssets({
      search: debouncedSearch || undefined,
      category: categoryFilter === "all" ? undefined : categoryFilter,
      status: statusFilter === "all" ? undefined : statusFilter,
      page,
      pageSize: PAGE_SIZE,
    });

    if (result) {
      setAssets(result.assets);
      setTotal(result.total);
    }
  }, [listAssets, debouncedSearch, categoryFilter, statusFilter, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  async function handleDeleteConfirm() {
    if (!deleteConfirmAsset) return;

    const success = await deleteAsset(deleteConfirmAsset.id);
    if (success) {
      setDeleteConfirmAsset(null);
      fetchAssets();
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-red-100 p-3 mb-4">
          <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load assets</h3>
        <p className="text-sm text-gray-500 mb-4">{error}</p>
        <Button onClick={fetchAssets}>Try again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <Input
              placeholder="Search assets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select
            value={categoryFilter}
            onValueChange={(value) => {
              setCategoryFilter(value as EquipmentCategory | "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {Object.values(EQUIPMENT_CATEGORIES).map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value as AssetStatus | "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.values(ASSET_STATUSES).map((status) => (
                <SelectItem key={status} value={status}>
                  {STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {canWrite && (
          <Button onClick={onCreateAsset} className="w-full sm:w-auto">
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Asset
          </Button>
        )}
      </div>

      <div className="bg-white rounded-lg border">
        {isLoading && assets.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <svg className="animate-spin h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        ) : assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-gray-100 p-3 mb-4">
              <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No assets found</h3>
            <p className="text-sm text-gray-500 mb-4">
              {search || categoryFilter !== "all" || statusFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Get started by adding your first asset"}
            </p>
            {canWrite && !search && categoryFilter === "all" && statusFilter === "all" && (
              <Button onClick={onCreateAsset}>
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Asset
              </Button>
            )}
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset Tag</TableHead>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="hidden md:table-cell">Manufacturer/Model</TableHead>
                  <TableHead className="hidden lg:table-cell">Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell className="font-medium">{asset.assetTag}</TableCell>
                    <TableCell className="font-mono text-sm">{asset.serialNumber}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn("font-normal", CATEGORY_COLORS[asset.category])}>
                        {CATEGORY_LABELS[asset.category]}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">{asset.type}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div>
                        <div className="font-medium">{asset.manufacturer}</div>
                        <div className="text-sm text-gray-500">{asset.model}</div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">{asset.location}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn("font-normal", STATUS_COLORS[asset.status])}>
                        {STATUS_LABELS[asset.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canWrite && (
                          <Button variant="ghost" size="sm" onClick={() => onEditAsset(asset)} aria-label={`Edit ${asset.assetTag}`}>
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </Button>
                        )}
                        {canDelete && (
                          <Button variant="ghost" size="sm" onClick={() => setDeleteConfirmAsset(asset)} aria-label={`Delete ${asset.assetTag}`}>
                            <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="text-sm text-gray-500">
                  Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, total)} of {total} assets
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-500">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={Boolean(deleteConfirmAsset)} onOpenChange={() => setDeleteConfirmAsset(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Asset</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete asset "{deleteConfirmAsset?.assetTag}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmAsset(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isLoading}>
              {isLoading ? "Deleting..." : "Delete Asset"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
