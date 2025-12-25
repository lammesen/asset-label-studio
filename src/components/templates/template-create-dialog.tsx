import { useState } from "react";

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
import { LABEL_FORMATS, type LabelFormatId } from "@/types/label-spec";
import { EQUIPMENT_CATEGORIES, type EquipmentCategory } from "@/types/asset";

interface TemplateCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateTemplate: (config: TemplateConfig) => void;
}

export interface TemplateConfig {
  name: string;
  format: LabelFormatId;
  category: EquipmentCategory | null;
}

const CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  networking: "Networking",
  servers: "Servers",
  cabling: "Cabling",
  power: "Power",
  physical: "Physical",
  "iot-edge": "IoT/Edge",
};

export function TemplateCreateDialog({
  open,
  onOpenChange,
  onCreateTemplate,
}: TemplateCreateDialogProps) {
  const [name, setName] = useState("New Template");
  const [format, setFormat] = useState<LabelFormatId>("avery-5160");
  const [category, setCategory] = useState<EquipmentCategory | "none">("none");

  function handleCreate() {
    onCreateTemplate({
      name: name.trim() || "New Template",
      format,
      category: category === "none" ? null : category,
    });
    resetForm();
  }

  function resetForm() {
    setName("New Template");
    setFormat("avery-5160");
    setCategory("none");
  }

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  }

  const selectedFormat = LABEL_FORMATS[format];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Template</DialogTitle>
          <DialogDescription>
            Configure your label template settings before designing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">Template Name</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter template name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="label-format">Label Format</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as LabelFormatId)}>
              <SelectTrigger id="label-format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LABEL_FORMATS).map(([id, formatConfig]) => (
                  <SelectItem key={id} value={id}>
                    {formatConfig.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              {selectedFormat.dimensions.width} × {selectedFormat.dimensions.height}{" "}
              {selectedFormat.dimensions.unit}
              {selectedFormat.labelsPerSheet > 1 &&
                ` (${selectedFormat.labelsPerSheet} per sheet)`}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category (Optional)</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as EquipmentCategory | "none")}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Universal (All Categories)</SelectItem>
                {Object.values(EQUIPMENT_CATEGORIES).map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Assign to a specific equipment category or leave universal.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim()}>
            Create Template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
