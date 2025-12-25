import { useState, useEffect } from "react";

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
import { useAssets } from "@/hooks/use-assets";
import { cn } from "@/lib/utils";
import type { Asset, EquipmentCategory, AssetStatus } from "@/types/asset";
import { EQUIPMENT_CATEGORIES, ASSET_STATUSES, CATEGORY_FIELD_SCHEMAS } from "@/types/asset";

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

export function AssetForm({ asset, open, onOpenChange, onSuccess }: AssetFormProps) {
  const { createAsset, updateAsset, isLoading, error } = useAssets();
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const isEditMode = Boolean(asset);

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
        purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate).toISOString().split("T")[0] : "",
        warrantyExpiry: asset.warrantyExpiry ? new Date(asset.warrantyExpiry).toISOString().split("T")[0] : "",
        notes: asset.notes ?? "",
        customFields: (asset.customFields as Record<string, string | number | boolean>) ?? {},
      });
    } else {
      setFormData(INITIAL_FORM_DATA);
    }
    setFormErrors({});
  }, [asset, open]);

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

    if (!validateForm()) return;

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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Asset" : "Add New Asset"}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update the asset information below."
              : "Fill in the details to create a new asset."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Basic Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">
                  Category <span className="text-red-500">*</span>
                </Label>
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
                <Label htmlFor="type">
                  Type <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="type"
                  placeholder="e.g., Router, Switch, Server"
                  value={formData.type}
                  onChange={(e) => handleInputChange("type", e.target.value)}
                  className={cn(formErrors.type && "border-red-500")}
                />
                {formErrors.type && <p className="text-sm text-red-500">{formErrors.type}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="assetTag">
                  Asset Tag <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="assetTag"
                  placeholder="e.g., NET-001"
                  value={formData.assetTag}
                  onChange={(e) => handleInputChange("assetTag", e.target.value)}
                  className={cn(formErrors.assetTag && "border-red-500")}
                />
                {formErrors.assetTag && <p className="text-sm text-red-500">{formErrors.assetTag}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="serialNumber">
                  Serial Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="serialNumber"
                  placeholder="e.g., SN123456789"
                  value={formData.serialNumber}
                  onChange={(e) => handleInputChange("serialNumber", e.target.value)}
                  className={cn(formErrors.serialNumber && "border-red-500")}
                />
                {formErrors.serialNumber && <p className="text-sm text-red-500">{formErrors.serialNumber}</p>}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Product Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="manufacturer">
                  Manufacturer <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="manufacturer"
                  placeholder="e.g., Cisco, Dell, HP"
                  value={formData.manufacturer}
                  onChange={(e) => handleInputChange("manufacturer", e.target.value)}
                  className={cn(formErrors.manufacturer && "border-red-500")}
                />
                {formErrors.manufacturer && <p className="text-sm text-red-500">{formErrors.manufacturer}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">
                  Model <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="model"
                  placeholder="e.g., Catalyst 9300"
                  value={formData.model}
                  onChange={(e) => handleInputChange("model", e.target.value)}
                  className={cn(formErrors.model && "border-red-500")}
                />
                {formErrors.model && <p className="text-sm text-red-500">{formErrors.model}</p>}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Location & Assignment</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">
                  Location <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="location"
                  placeholder="e.g., Building A, Rack 12"
                  value={formData.location}
                  onChange={(e) => handleInputChange("location", e.target.value)}
                  className={cn(formErrors.location && "border-red-500")}
                />
                {formErrors.location && <p className="text-sm text-red-500">{formErrors.location}</p>}
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

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="assignedTo">Assigned To</Label>
                <Input
                  id="assignedTo"
                  placeholder="e.g., John Smith"
                  value={formData.assignedTo}
                  onChange={(e) => handleInputChange("assignedTo", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Status & Dates</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">
                  Status <span className="text-red-500">*</span>
                </Label>
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
          </div>

          {categorySchema && categorySchema.fields.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900">
                {CATEGORY_LABELS[formData.category]} Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {categorySchema.fields.map((field) => (
                  <div key={field.name} className="space-y-2">
                    <Label htmlFor={field.name}>
                      {field.label}
                      {field.required && <span className="text-red-500"> *</span>}
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
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Notes</h3>
            <Textarea
              placeholder="Additional notes about this asset..."
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  {isEditMode ? "Saving..." : "Creating..."}
                </span>
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
