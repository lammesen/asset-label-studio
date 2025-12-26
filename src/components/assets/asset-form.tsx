import { useState, useEffect } from "react";
import { Loader2, HelpCircle, FileText, X } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAssets } from "@/hooks/use-assets";
import { useTemplateList } from "@/hooks/use-templates";
import { cn } from "@/lib/utils";
import type { Asset, EquipmentCategory, AssetStatus } from "@/types/asset";
import { EQUIPMENT_CATEGORIES, ASSET_STATUSES, CATEGORY_FIELD_SCHEMAS } from "@/types/asset";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

interface AssetFormProps {
  asset?: Asset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
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

const CATEGORY_DESCRIPTIONS: Record<EquipmentCategory, string> = {
  networking: "Network switches, routers, firewalls, access points, and related equipment",
  servers: "Physical and virtual servers, blade systems, and compute infrastructure",
  cabling: "Network cables, patch panels, fiber optics, and cable management",
  power: "UPS systems, PDUs, generators, and power distribution equipment",
  physical: "Racks, enclosures, cooling systems, and physical infrastructure",
  "iot-edge": "IoT devices, edge computing units, sensors, and embedded systems",
};

const STATUS_DESCRIPTIONS: Record<AssetStatus, string> = {
  active: "Asset is currently deployed and in active use",
  maintenance: "Asset is undergoing scheduled or unscheduled maintenance",
  pending: "Asset is awaiting deployment, setup, or configuration",
  retired: "Asset has been decommissioned but not yet disposed",
  disposed: "Asset has been permanently removed from inventory",
};

interface FormData {
  category: EquipmentCategory;
  type: string;
  assetTag: string;
  serialNumber: string;
  manufacturer: string;
  model: string;
  location: string;
  department: string;
  assignedTo: string;
  status: AssetStatus;
  purchaseDate: string;
  warrantyExpiry: string;
  notes: string;
  customFields: Record<string, string | number | boolean>;
}

const INITIAL_FORM_DATA: FormData = {
  category: "networking",
  type: "",
  assetTag: "",
  serialNumber: "",
  manufacturer: "",
  model: "",
  location: "",
  department: "",
  assignedTo: "",
  status: "pending",
  purchaseDate: "",
  warrantyExpiry: "",
  notes: "",
  customFields: {},
};

const DRAFT_STORAGE_KEY = "asset-form-draft";

export function AssetForm({ asset, open, onOpenChange, onSuccess }: AssetFormProps) {
  const { createAsset, updateAsset, isLoading, error } = useAssets();
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState("general");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [categoryFromTemplate, setCategoryFromTemplate] = useState(false);
  const [restoredFromDraft, setRestoredFromDraft] = useState(false);

  const isEditMode = Boolean(asset);
  
  const { data: publishedTemplatesForQuickFill } = useTemplateList({ 
    isPublished: true, 
    pageSize: 50 
  });

  useEffect(() => {
    if (asset) {
      setFormData({
        category: asset.category,
        type: asset.type,
        assetTag: asset.assetTag,
        serialNumber: asset.serialNumber,
        manufacturer: asset.manufacturer,
        model: asset.model,
        location: asset.location,
        department: asset.department ?? "",
        assignedTo: asset.assignedTo ?? "",
        status: asset.status,
        purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate).toISOString().split("T")[0] ?? "" : "",
        warrantyExpiry: asset.warrantyExpiry ? new Date(asset.warrantyExpiry).toISOString().split("T")[0] ?? "" : "",
        notes: asset.notes ?? "",
        customFields: (asset.customFields as Record<string, string | number | boolean>) ?? {},
      });
    } else {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft && open) {
        try {
          const parsed = JSON.parse(savedDraft) as FormData;
          setFormData(parsed);
          setRestoredFromDraft(true);
        } catch {
          setFormData(INITIAL_FORM_DATA);
          setRestoredFromDraft(false);
        }
      } else {
        setFormData(INITIAL_FORM_DATA);
        setRestoredFromDraft(false);
      }
      setSelectedTemplateId(null);
      setCategoryFromTemplate(false);
    }
    setFormErrors({});
    setActiveTab("general");
  }, [asset, open]);

  useEffect(() => {
    if (!isEditMode && open) {
      const hasData = Object.entries(formData).some(([key, value]) => {
        if (key === "category" || key === "status") return false;
        if (key === "customFields") return Object.keys(value as Record<string, unknown>).length > 0;
        return typeof value === "string" && value.trim() !== "";
      });
      
      if (hasData) {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(formData));
      }
    }
  }, [formData, isEditMode, open]);

  function handleTemplateSelect(templateId: string | null) {
    if (!templateId) {
      setSelectedTemplateId(null);
      setCategoryFromTemplate(false);
      setFormData((prev) => ({ ...prev, category: INITIAL_FORM_DATA.category }));
      return;
    }

    const template = publishedTemplatesForQuickFill?.templates.find((t) => t.id === templateId);
    if (template) {
      setSelectedTemplateId(templateId);
      if (template.category) {
        setFormData((prev) => ({ ...prev, category: template.category as EquipmentCategory }));
        setCategoryFromTemplate(true);
      } else {
        setCategoryFromTemplate(false);
      }
    }
  }

  function handleClearDraft() {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setFormData(INITIAL_FORM_DATA);
    setRestoredFromDraft(false);
    setSelectedTemplateId(null);
    setCategoryFromTemplate(false);
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};

    if (!formData.type.trim()) errors.type = "Type is required";
    if (!formData.assetTag.trim()) errors.assetTag = "Asset tag is required";
    if (!formData.serialNumber.trim()) errors.serialNumber = "Serial number is required";
    if (!formData.manufacturer.trim()) errors.manufacturer = "Manufacturer is required";
    if (!formData.model.trim()) errors.model = "Model is required";
    if (!formData.location.trim()) errors.location = "Location is required";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) {
      // Find the tab with the error and switch to it if needed
      // Currently all required fields are in 'general', so this is simple
      return;
    }

    const input = {
      category: formData.category,
      type: formData.type.trim(),
      assetTag: formData.assetTag.trim(),
      serialNumber: formData.serialNumber.trim(),
      manufacturer: formData.manufacturer.trim(),
      model: formData.model.trim(),
      location: formData.location.trim(),
      department: formData.department.trim() || undefined,
      assignedTo: formData.assignedTo.trim() || undefined,
      status: formData.status,
      purchaseDate: formData.purchaseDate || undefined,
      warrantyExpiry: formData.warrantyExpiry || undefined,
      notes: formData.notes.trim() || undefined,
      customFields: Object.keys(formData.customFields).length > 0 ? formData.customFields : undefined,
    };

    const result = isEditMode
      ? await updateAsset(asset!.id, input)
      : await createAsset(input);

    if (result) {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      onSuccess();
      onOpenChange(false);
    }
  }

  function handleInputChange(field: keyof FormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  }

  function handleCustomFieldChange(fieldName: string, value: string | number | boolean) {
    setFormData((prev) => ({
      ...prev,
      customFields: { ...prev.customFields, [fieldName]: value },
    }));
  }

  const categorySchema = CATEGORY_FIELD_SCHEMAS[formData.category];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b bg-muted/20">
          <DialogTitle>{isEditMode ? "Edit Asset" : "Add New Asset"}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update asset details and status."
              : "Register a new asset in the system."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-2">
             {error && (
              <div className="mb-4 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                {error}
              </div>
            )}

            {!isEditMode && publishedTemplatesForQuickFill && publishedTemplatesForQuickFill.templates.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Start from Template (Optional)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedTemplateId ?? ""}
                    onValueChange={(value) => handleTemplateSelect(value || null)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Choose a template to auto-fill category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {publishedTemplatesForQuickFill.templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex items-center gap-2">
                            <span>{template.name}</span>
                            {template.category && (
                              <Badge variant="outline" className="text-xs">
                                {CATEGORY_LABELS[template.category]}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedTemplateId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleTemplateSelect(null)}
                      className="h-10 w-10 shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {categoryFromTemplate && (
                  <Alert className="mt-3 py-2">
                    <AlertDescription className="text-xs">
                      Category auto-filled from template. You can still change it below.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {!isEditMode && restoredFromDraft && (
              <Alert className="mb-6 py-2">
                <AlertDescription className="flex items-center justify-between">
                  <span className="text-xs">Restored from your previous draft.</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearDraft}
                    className="h-6 text-xs px-2"
                  >
                    Clear Draft
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent mb-6">
                <TabsTrigger 
                  value="general" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                >
                  General
                </TabsTrigger>
                <TabsTrigger 
                  value="details" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                >
                  Details & Location
                </TabsTrigger>
                {categorySchema && categorySchema.fields.length > 0 && (
                  <TabsTrigger 
                    value="specs" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                  >
                    Specifications
                  </TabsTrigger>
                )}
                <TabsTrigger 
                  value="notes" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                >
                  Notes
                </TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-6">
                <TooltipProvider delayDuration={300}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="category">Category <span className="text-destructive">*</span></Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <p className="font-medium mb-1">Asset Categories</p>
                          <p className="text-xs text-muted-foreground">
                            {CATEGORY_DESCRIPTIONS[formData.category]}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => handleInputChange("category", value)}
                      disabled={isEditMode}
                    >
                      <SelectTrigger className={cn(isEditMode && "opacity-50")}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(EQUIPMENT_CATEGORIES).map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {CATEGORY_LABELS[cat]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="status">Status <span className="text-destructive">*</span></Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <p className="font-medium mb-1">Asset Status</p>
                          <p className="text-xs text-muted-foreground">
                            {STATUS_DESCRIPTIONS[formData.status]}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => handleInputChange("status", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(ASSET_STATUSES).map((status) => (
                          <SelectItem key={status} value={status}>
                            {STATUS_LABELS[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="assetTag">Asset Tag <span className="text-destructive">*</span></Label>
                    <Input
                      id="assetTag"
                      placeholder="e.g., NET-001"
                      value={formData.assetTag}
                      onChange={(e) => handleInputChange("assetTag", e.target.value)}
                      className={cn(formErrors.assetTag && "border-destructive focus-visible:ring-destructive")}
                    />
                    {formErrors.assetTag && <p className="text-xs text-destructive font-medium">{formErrors.assetTag}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="serialNumber">Serial Number <span className="text-destructive">*</span></Label>
                    <Input
                      id="serialNumber"
                      placeholder="e.g., SN123456789"
                      value={formData.serialNumber}
                      onChange={(e) => handleInputChange("serialNumber", e.target.value)}
                      className={cn(formErrors.serialNumber && "border-destructive focus-visible:ring-destructive")}
                    />
                    {formErrors.serialNumber && <p className="text-xs text-destructive font-medium">{formErrors.serialNumber}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="manufacturer">Manufacturer <span className="text-destructive">*</span></Label>
                    <Input
                      id="manufacturer"
                      placeholder="e.g., Cisco"
                      value={formData.manufacturer}
                      onChange={(e) => handleInputChange("manufacturer", e.target.value)}
                      className={cn(formErrors.manufacturer && "border-destructive focus-visible:ring-destructive")}
                    />
                    {formErrors.manufacturer && <p className="text-xs text-destructive font-medium">{formErrors.manufacturer}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="model">Model <span className="text-destructive">*</span></Label>
                    <Input
                      id="model"
                      placeholder="e.g., Catalyst 9300"
                      value={formData.model}
                      onChange={(e) => handleInputChange("model", e.target.value)}
                      className={cn(formErrors.model && "border-destructive focus-visible:ring-destructive")}
                    />
                    {formErrors.model && <p className="text-xs text-destructive font-medium">{formErrors.model}</p>}
                  </div>

                   <div className="space-y-2">
                    <Label htmlFor="type">Type <span className="text-destructive">*</span></Label>
                    <Input
                      id="type"
                      placeholder="e.g., Router, Switch, Server"
                      value={formData.type}
                      onChange={(e) => handleInputChange("type", e.target.value)}
                      className={cn(formErrors.type && "border-destructive focus-visible:ring-destructive")}
                    />
                    {formErrors.type && <p className="text-xs text-destructive font-medium">{formErrors.type}</p>}
                  </div>
                </div>
                </TooltipProvider>
              </TabsContent>

              <TabsContent value="details" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 md:col-span-2">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Location Information</h3>
                    <Separator />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location <span className="text-destructive">*</span></Label>
                    <Input
                      id="location"
                      placeholder="e.g., Building A, Rack 12"
                      value={formData.location}
                      onChange={(e) => handleInputChange("location", e.target.value)}
                      className={cn(formErrors.location && "border-destructive focus-visible:ring-destructive")}
                    />
                    {formErrors.location && <p className="text-xs text-destructive font-medium">{formErrors.location}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      placeholder="e.g., IT, Operations"
                      value={formData.department}
                      onChange={(e) => handleInputChange("department", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="assignedTo">Assigned To</Label>
                    <Input
                      id="assignedTo"
                      placeholder="e.g., John Smith"
                      value={formData.assignedTo}
                      onChange={(e) => handleInputChange("assignedTo", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2 mt-4">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Warranty & Purchase</h3>
                    <Separator />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="purchaseDate">Purchase Date</Label>
                    <Input
                      id="purchaseDate"
                      type="date"
                      value={formData.purchaseDate}
                      onChange={(e) => handleInputChange("purchaseDate", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="warrantyExpiry">Warranty Expiry</Label>
                    <Input
                      id="warrantyExpiry"
                      type="date"
                      value={formData.warrantyExpiry}
                      onChange={(e) => handleInputChange("warrantyExpiry", e.target.value)}
                    />
                  </div>
                </div>
              </TabsContent>

              {categorySchema && categorySchema.fields.length > 0 && (
                <TabsContent value="specs" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {categorySchema.fields.map((field) => (
                      <div key={field.name} className="space-y-2">
                        <Label htmlFor={field.name}>
                          {field.label}
                          {field.required && <span className="text-destructive"> *</span>}
                        </Label>
                        {field.type === "select" && field.options ? (
                          <Select
                            value={(formData.customFields[field.name] as string) ?? ""}
                            onValueChange={(value) => handleCustomFieldChange(field.name, value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                            </SelectTrigger>
                            <SelectContent>
                              {field.options.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : field.type === "number" ? (
                          <Input
                            id={field.name}
                            type="number"
                            value={(formData.customFields[field.name] as number) ?? ""}
                            onChange={(e) =>
                              handleCustomFieldChange(field.name, e.target.value ? Number(e.target.value) : "")
                            }
                          />
                        ) : (
                          <Input
                            id={field.name}
                            type={field.type === "date" ? "date" : "text"}
                            value={(formData.customFields[field.name] as string) ?? ""}
                            onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </TabsContent>
              )}

              <TabsContent value="notes">
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional notes about this asset..."
                    value={formData.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    rows={8}
                    className="resize-none"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="px-6 py-4 border-t bg-muted/20 flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditMode ? "Saving..." : "Creating..."}
                </>
              ) : isEditMode ? (
                "Save Changes"
              ) : (
                "Create Asset"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
