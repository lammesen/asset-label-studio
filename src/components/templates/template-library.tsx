import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { 
  Plus, 
  Search, 
  FileText, 
  Copy, 
  Trash2, 
  Globe, 
  Check, 
  MoreVertical,
  Layout,
  Filter,
  SearchX,
  Lightbulb,
  ArrowUpDown,
  Layers
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useTemplates } from "@/hooks/use-templates";
import type { LabelTemplate } from "@/types/template";
import type { EquipmentCategory } from "@/types/asset";
import { EQUIPMENT_CATEGORIES } from "@/types/asset";
import { LABEL_FORMATS, type LabelFormatId } from "@/types/label-spec";
import { PageShell, PageHeader } from "@/components/ui/page-shell";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Can } from "@/components/auth/permission-gate";

interface TemplateLibraryProps {
  onEditTemplate: (template: LabelTemplate) => void;
  onCreateTemplate: () => void;
}

const CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  networking: "Networking",
  servers: "Servers",
  cabling: "Cabling",
  power: "Power",
  physical: "Physical",
  "iot-edge": "IoT/Edge",
};

const PAGE_SIZE = 12;

type SortOption = "name-asc" | "name-desc" | "updated" | "version";
type GroupOption = "none" | "category" | "format";

const SORT_LABELS: Record<SortOption, string> = {
  "name-asc": "Name A-Z",
  "name-desc": "Name Z-A",
  "updated": "Last Updated",
  "version": "Version",
};

const GROUP_LABELS: Record<GroupOption, string> = {
  "none": "No Grouping",
  "category": "By Category",
  "format": "By Format",
};

interface TemplateCardProps {
  template: LabelTemplate;
  onEdit: (template: LabelTemplate) => void;
  onDelete: (template: LabelTemplate) => void;
  onDuplicate: (template: LabelTemplate) => void;
  onPublish: (template: LabelTemplate) => void;
}

function TemplateCard({ template, onEdit, onDelete, onDuplicate, onPublish }: TemplateCardProps) {
  return (
    <Card className="group overflow-hidden hover:shadow-md transition-all duration-300 border-border/60 hover:border-border">
      <div className="aspect-[3/2] bg-muted relative overflow-hidden group-hover:bg-muted/80 transition-colors">
        {template.thumbnailUrl ? (
          <img
            src={template.thumbnailUrl}
            alt={template.name}
            className="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/20">
            <Layout className="h-16 w-16" />
          </div>
        )}
        
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="h-8 w-8 shadow-sm">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(template)}>
                <FileText className="h-4 w-4 mr-2" />
                Edit Design
              </DropdownMenuItem>
              <Can permission="template:write">
                <DropdownMenuItem onClick={() => onDuplicate(template)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
              </Can>
              <Can permission="template:publish">
                {!template.isSystemTemplate && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onPublish(template)}>
                      {template.isPublished ? (
                        <>
                          <Globe className="h-4 w-4 mr-2" />
                          Unpublish
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Publish
                        </>
                      )}
                    </DropdownMenuItem>
                  </>
                )}
              </Can>
              <Can permission="template:write">
                {!template.isSystemTemplate && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => onDelete(template)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </Can>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {template.isPublished ? (
            <Badge variant="secondary" className="bg-emerald-500/90 text-white backdrop-blur-sm border-0 font-medium shadow-sm">Published</Badge>
          ) : (
            <Badge variant="secondary" className="bg-amber-500/90 text-white backdrop-blur-sm border-0 font-medium shadow-sm">Draft</Badge>
          )}
        </div>
      </div>
      
      <CardContent className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-foreground truncate" title={template.name}>{template.name}</h3>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 min-h-[2.5em]">
            {template.description || "No description provided."}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal bg-muted/50 border-muted">
            {LABEL_FORMATS[template.format as LabelFormatId]?.name ?? template.format}
          </Badge>
          {template.category && (
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal bg-muted/50 border-muted">
              {CATEGORY_LABELS[template.category as EquipmentCategory]}
            </Badge>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0 text-xs text-muted-foreground border-t border-border/40 bg-muted/20 flex justify-between items-center h-10">
        <span>v{template.version}</span>
        <span>{new Date(template.updatedAt).toLocaleDateString()}</span>
      </CardFooter>
    </Card>
  );
}

interface TemplateGridProps {
  templates: LabelTemplate[];
  groupedTemplates: [string, LabelTemplate[]][] | null;
  onEdit: (template: LabelTemplate) => void;
  onDelete: (template: LabelTemplate) => void;
  onDuplicate: (template: LabelTemplate) => void;
  onPublish: (template: LabelTemplate) => void;
}

function TemplateGrid({ templates, groupedTemplates, onEdit, onDelete, onDuplicate, onPublish }: TemplateGridProps) {
  if (groupedTemplates) {
    return (
      <div className="space-y-8">
        {groupedTemplates.map(([groupName, groupTemplates]) => (
          <div key={groupName}>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Layers className="h-5 w-5 text-muted-foreground" />
              {groupName}
              <Badge variant="secondary" className="ml-2">{groupTemplates.length}</Badge>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {groupTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onDuplicate={onDuplicate}
                  onPublish={onPublish}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          onEdit={onEdit}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onPublish={onPublish}
        />
      ))}
    </div>
  );
}

export function TemplateLibrary({ onEditTemplate, onCreateTemplate }: TemplateLibraryProps) {
  const { listTemplates, deleteTemplate, duplicateTemplate, publishTemplate, unpublishTemplate, isLoading, error } = useTemplates();
  const { hasPermission } = useAuth();
  const [templates, setTemplates] = useState<LabelTemplate[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<EquipmentCategory | "all">("all");
  const [formatFilter, setFormatFilter] = useState<LabelFormatId | "all">("all");
  const [publishedFilter, setPublishedFilter] = useState<"all" | "published" | "draft">("all");
  const [sortOption, setSortOption] = useState<SortOption>("updated");
  const [groupOption, setGroupOption] = useState<GroupOption>("none");
  const [deleteConfirmTemplate, setDeleteConfirmTemplate] = useState<LabelTemplate | null>(null);
  const [duplicateDialogTemplate, setDuplicateDialogTemplate] = useState<LabelTemplate | null>(null);
  const [duplicateName, setDuplicateName] = useState("");
  const [showGettingStarted, setShowGettingStarted] = useState(true);
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

  const fetchTemplates = useCallback(async () => {
    const result = await listTemplates({
      search: debouncedSearch || undefined,
      category: categoryFilter === "all" ? undefined : categoryFilter,
      format: formatFilter === "all" ? undefined : formatFilter,
      isPublished: publishedFilter === "all" ? undefined : publishedFilter === "published",
      page,
      pageSize: PAGE_SIZE,
    });

    if (result) {
      setTemplates(result.templates);
      setTotal(result.total);
    }
  }, [listTemplates, debouncedSearch, categoryFilter, formatFilter, publishedFilter, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  async function handleDelete() {
    if (!deleteConfirmTemplate) return;

    const success = await deleteTemplate(deleteConfirmTemplate.id);
    if (success) {
      setDeleteConfirmTemplate(null);
      fetchTemplates();
    }
  }

  async function handleDuplicate() {
    if (!duplicateDialogTemplate || !duplicateName.trim()) return;

    const result = await duplicateTemplate(duplicateDialogTemplate.id, duplicateName.trim());
    if (result) {
      setDuplicateDialogTemplate(null);
      setDuplicateName("");
      fetchTemplates();
    }
  }

  async function handlePublish(template: LabelTemplate) {
    if (template.isPublished) {
      await unpublishTemplate(template.id);
    } else {
      await publishTemplate(template.id);
    }
    fetchTemplates();
  }

  function openDuplicateDialog(template: LabelTemplate) {
    setDuplicateDialogTemplate(template);
    setDuplicateName(`${template.name} (Copy)`);
  }

  const sortedTemplates = useMemo(() => {
    const sorted = [...templates].sort((a, b) => {
      switch (sortOption) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "updated":
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case "version":
          return b.version - a.version;
        default:
          return 0;
      }
    });
    return sorted;
  }, [templates, sortOption]);

  const groupedTemplates = useMemo(() => {
    if (groupOption === "none") {
      return null;
    }

    const groups: Record<string, LabelTemplate[]> = {};
    
    for (const template of sortedTemplates) {
      let groupKey: string;
      
      if (groupOption === "category") {
        groupKey = template.category 
          ? (CATEGORY_LABELS[template.category as EquipmentCategory] ?? "Other")
          : "Universal";
      } else {
        const format = LABEL_FORMATS[template.format as LabelFormatId];
        groupKey = format?.name ?? template.format;
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey]!.push(template);
    }

    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [sortedTemplates, groupOption]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (error) {
    return <ErrorState message={error} onRetry={fetchTemplates} fullPage />;
  }

  return (
    <PageShell>
      <PageHeader
        title="Templates"
        description="Design and manage label templates for your assets."
        breadcrumbs={[{ label: "Dashboard" }, { label: "Templates" }]}
      >
        <Can permission="template:write">
          <Button onClick={onCreateTemplate} className="shadow-sm">
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </Can>
      </PageHeader>

      {showGettingStarted && templates.length === 0 && !isLoading && !search && categoryFilter === "all" && formatFilter === "all" && publishedFilter === "all" && hasPermission("template:write") && (
        <Alert className="mb-4 border-primary/20 bg-primary/5">
          <Lightbulb className="h-4 w-4 text-primary" />
          <AlertTitle className="text-primary">Getting Started with Templates</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            Templates define how your asset labels look. Create a template first, then you can print labels for any of your assets using that design.
            <div className="mt-3 flex items-center gap-3">
              <Button size="sm" onClick={onCreateTemplate}>
                <Plus className="h-4 w-4 mr-1" />
                Create Your First Template
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowGettingStarted(false)}>
                Dismiss
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-card p-4 rounded-lg border border-border shadow-sm">
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-12 bg-background"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              /
            </kbd>
          </div>

          <div className="flex flex-wrap gap-2 w-full lg:w-auto">
            <Select
              value={categoryFilter}
              onValueChange={(value) => {
                setCategoryFilter(value as EquipmentCategory | "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[140px] bg-background">
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
              value={formatFilter}
              onValueChange={(value) => {
                setFormatFilter(value as LabelFormatId | "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[140px] bg-background">
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Formats</SelectItem>
                {Object.entries(LABEL_FORMATS).map(([id, format]) => (
                  <SelectItem key={id} value={id}>
                    {format.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={publishedFilter}
              onValueChange={(value) => {
                setPublishedFilter(value as "all" | "published" | "draft");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[130px] bg-background">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Drafts</SelectItem>
              </SelectContent>
            </Select>

            <div className="h-6 w-px bg-border hidden lg:block" />

            <Select
              value={sortOption}
              onValueChange={(value) => setSortOption(value as SortOption)}
            >
              <SelectTrigger className="w-[140px] bg-background">
                <ArrowUpDown className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={groupOption}
              onValueChange={(value) => setGroupOption(value as GroupOption)}
            >
              <SelectTrigger className="w-[140px] bg-background">
                <Layers className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(GROUP_LABELS) as [GroupOption, string][]).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <LoadingSkeleton variant="card-grid" count={6} />
        ) : templates.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-card/50">
            {search || categoryFilter !== "all" || formatFilter !== "all" || publishedFilter !== "all" ? (
              <EmptyState
                icon={SearchX}
                title="No matching templates"
                description="Try adjusting your search terms or filters."
                action={
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearch("");
                      setCategoryFilter("all");
                      setFormatFilter("all");
                      setPublishedFilter("all");
                    }}
                  >
                    Clear Filters
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={FileText}
                title="No templates found"
                description="Get started by creating your first label template."
                action={
                  <Can permission="template:write">
                    <Button onClick={onCreateTemplate}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Template
                    </Button>
                  </Can>
                }
              />
            )}
          </div>
        ) : (
          <TemplateGrid
            templates={groupedTemplates ? [] : sortedTemplates}
            groupedTemplates={groupedTemplates}
            onEdit={onEditTemplate}
            onDelete={setDeleteConfirmTemplate}
            onDuplicate={openDuplicateDialog}
            onPublish={handlePublish}
          />
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-6 border-t border-border">
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
                Previous
              </Button>
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
      </div>

      <Dialog open={Boolean(deleteConfirmTemplate)} onOpenChange={() => setDeleteConfirmTemplate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteConfirmTemplate?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmTemplate(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
              {isLoading ? "Deleting..." : "Delete Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(duplicateDialogTemplate)} onOpenChange={() => setDuplicateDialogTemplate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate Template</DialogTitle>
            <DialogDescription>
              Create a copy of "{duplicateDialogTemplate?.name}" with a new name.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="duplicate-name" className="text-sm font-medium">
                New Template Name
              </label>
              <Input
                id="duplicate-name"
                value={duplicateName}
                onChange={(e) => setDuplicateName(e.target.value)}
                placeholder="Enter template name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateDialogTemplate(null)}>
              Cancel
            </Button>
            <Button onClick={handleDuplicate} disabled={isLoading || !duplicateName.trim()}>
              {isLoading ? "Duplicating..." : "Duplicate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
