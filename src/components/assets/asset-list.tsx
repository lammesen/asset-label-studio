import { useEffect, useState, useCallback, useRef } from "react";
import { 
  Search, 
  Plus, 
  Filter, 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Package,
  Server,
  Cable,
  Zap,
  Box,
  Cpu,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Database,
  SearchX,
  Upload,
  FileText
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAssets } from "@/hooks/use-assets";
import { cn } from "@/lib/utils";
import type { Asset, EquipmentCategory, AssetStatus } from "@/types/asset";
import { EQUIPMENT_CATEGORIES, ASSET_STATUSES } from "@/types/asset";
import { PageShell, PageHeader } from "@/components/ui/page-shell";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Can } from "@/components/auth/permission-gate";
import { AssetSummaryBar } from "@/components/assets/asset-summary-bar";

interface AssetListProps {
  onEditAsset: (asset: Asset) => void;
  onCreateAsset: () => void;
  onImportAssets?: () => void;
}

const CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  networking: "Networking",
  servers: "Servers",
  cabling: "Cabling",
  power: "Power",
  physical: "Physical",
  "iot-edge": "IoT/Edge",
};

const CATEGORY_ICONS: Record<EquipmentCategory, React.ElementType> = {
  networking: Server,
  servers: Box,
  cabling: Cable,
  power: Zap,
  physical: Package,
  "iot-edge": Cpu,
};

const STATUS_LABELS: Record<AssetStatus, string> = {
  active: "Active",
  maintenance: "Maintenance",
  retired: "Retired",
  pending: "Pending",
  disposed: "Disposed",
};

const STATUS_STYLES: Record<AssetStatus, string> = {
  active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  maintenance: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20",
  pending: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20",
  retired: "bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/20",
  disposed: "bg-destructive/15 text-destructive border-destructive/20",
};

const PAGE_SIZE = 10;

export function AssetList({ onEditAsset, onCreateAsset, onImportAssets }: AssetListProps) {
  const { listAssets, deleteAsset, isLoading, error } = useAssets();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<EquipmentCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<AssetStatus | "all">("all");
  const [deleteConfirmAsset, setDeleteConfirmAsset] = useState<Asset | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
    return <ErrorState message={error} onRetry={fetchAssets} fullPage />;
  }

  return (
    <PageShell>
      <PageHeader 
        title="Assets" 
        description="Manage your organization's physical and digital assets."
        breadcrumbs={[{ label: "Dashboard" }, { label: "Assets" }]}
      >
        <Can permission="asset:write">
          <Button onClick={onCreateAsset} className="shadow-sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Asset
          </Button>
        </Can>
      </PageHeader>

      <AssetSummaryBar />

      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-card p-4 rounded-lg border border-border shadow-sm">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Search by tag, serial, or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-12 bg-background"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              /
            </kbd>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Select
              value={categoryFilter}
              onValueChange={(value) => {
                setCategoryFilter(value as EquipmentCategory | "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[160px] bg-background">
                <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
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
              <SelectTrigger className="w-full sm:w-[140px] bg-background">
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
        </div>

        {/* Content */}
        {isLoading ? (
          <LoadingSkeleton variant="table" count={5} />
        ) : assets.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-card/50">
            {search || categoryFilter !== "all" || statusFilter !== "all" ? (
              <EmptyState
                icon={SearchX}
                title="No matching assets"
                description="Try adjusting your search terms or filters to find what you're looking for."
                action={
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearch("");
                      setCategoryFilter("all");
                      setStatusFilter("all");
                    }}
                  >
                    Clear Filters
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={Database}
                title="No assets yet"
                description="Get started by adding assets to your inventory. You can add them manually, import from a file, or browse templates first."
                action={
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <Can permission="asset:write">
                      <Button onClick={onCreateAsset}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Manually
                      </Button>
                    </Can>
                    {onImportAssets && (
                      <Can permission="asset:write">
                        <Button variant="outline" onClick={onImportAssets}>
                          <Upload className="h-4 w-4 mr-2" />
                          Import from CSV
                        </Button>
                      </Can>
                    )}
                    <Button variant="outline" asChild>
                      <a href="/templates">
                        <FileText className="h-4 w-4 mr-2" />
                        Browse Templates
                      </a>
                    </Button>
                  </div>
                }
              />
            )}
          </div>
        ) : (
          <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-[250px]">Asset Details</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="hidden md:table-cell">Model Info</TableHead>
                  <TableHead className="hidden lg:table-cell">Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset) => {
                  const Icon = CATEGORY_ICONS[asset.category];
                  return (
                    <TableRow key={asset.id} className="group hover:bg-muted/50 transition-colors">
                      <TableCell>
                        <div className="flex items-start gap-3">
                          <div className="mt-1 p-2 rounded-md bg-secondary text-secondary-foreground">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground">{asset.assetTag}</span>
                            <span className="text-xs text-muted-foreground font-mono mt-0.5">{asset.serialNumber}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                         <span className="text-sm font-medium">{CATEGORY_LABELS[asset.category]}</span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{asset.manufacturer}</span>
                          <span className="text-xs text-muted-foreground">{asset.model}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                         <div className="flex items-center text-sm text-muted-foreground">
                            {asset.location}
                         </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={cn("font-medium border capitalize", STATUS_STYLES[asset.status])}
                        >
                          {STATUS_LABELS[asset.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(asset.assetTag)}>
                              Copy Asset Tag
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <Can permission="asset:write">
                              <DropdownMenuItem onClick={() => onEditAsset(asset)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit Asset
                              </DropdownMenuItem>
                            </Can>
                            <Can permission="asset:delete">
                              <DropdownMenuItem 
                                onClick={() => setDeleteConfirmAsset(asset)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </Can>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-2 pt-2">
            <div className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={Boolean(deleteConfirmAsset)} onOpenChange={() => setDeleteConfirmAsset(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Asset</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete asset <span className="font-mono font-medium text-foreground">{deleteConfirmAsset?.assetTag}</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmAsset(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isLoading}>
              {isLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : "Delete Asset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
