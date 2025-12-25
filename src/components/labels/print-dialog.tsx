import { useState, useEffect, useCallback } from "react";
import { Printer, FileText, Download, X, Loader2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { usePrint } from "@/hooks/use-print";
import { LABEL_FORMATS } from "@/types/label-spec";
import type { LabelTemplate } from "@/types/template";
import type { Asset } from "@/types/asset";

interface PrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: LabelTemplate[];
  assets: Asset[];
  selectedTemplateId?: string;
  selectedAssetIds?: string[];
}

export function PrintDialog({
  open,
  onOpenChange,
  templates,
  assets,
  selectedTemplateId,
  selectedAssetIds = [],
}: PrintDialogProps) {
  const { createJob, renderJob, preview, isCreating, isRendering, error, clearError } = usePrint();

  const [templateId, setTemplateId] = useState<string>(selectedTemplateId ?? "");
  const [assetIds, setAssetIds] = useState<string[]>(selectedAssetIds);
  const [copies, setCopies] = useState(1);
  const [useSheetLayout, setUseSheetLayout] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (selectedTemplateId) setTemplateId(selectedTemplateId);
  }, [selectedTemplateId]);

  useEffect(() => {
    if (selectedAssetIds.length > 0) setAssetIds(selectedAssetIds);
  }, [selectedAssetIds]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleClose = useCallback(() => {
    clearError();
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    onOpenChange(false);
  }, [clearError, onOpenChange, previewUrl]);

  const handlePreview = useCallback(async () => {
    if (!templateId || assetIds.length === 0) return;

    const firstAssetId = assetIds[0];
    if (!firstAssetId) return;

    const blob = await preview(templateId, firstAssetId);
    if (blob) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(blob));
    }
  }, [templateId, assetIds, preview, previewUrl]);

  const handlePrint = useCallback(async () => {
    if (!templateId || assetIds.length === 0) return;

    const job = await createJob({
      templateId,
      assetIds,
      options: {
        copies,
        useSheetLayout,
      },
    });

    if (!job) return;

    const blob = await renderJob(job.id);
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url);
    if (printWindow) {
      printWindow.addEventListener("load", () => {
        printWindow.print();
      });
    }

    handleClose();
  }, [templateId, assetIds, copies, useSheetLayout, createJob, renderJob, handleClose]);

  const handleDownload = useCallback(async () => {
    if (!templateId || assetIds.length === 0) return;

    const job = await createJob({
      templateId,
      assetIds,
      options: {
        copies,
        useSheetLayout,
      },
    });

    if (!job) return;

    const blob = await renderJob(job.id);
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `labels-${assetIds.length}x-${new Date().toISOString().slice(0, 10)}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    handleClose();
  }, [templateId, assetIds, copies, useSheetLayout, createJob, renderJob, handleClose]);

  const selectedTemplate = templates.find((t) => t.id === templateId);
  const formatInfo = selectedTemplate
    ? LABEL_FORMATS[selectedTemplate.format as keyof typeof LABEL_FORMATS]
    : null;

  const publishedTemplates = templates.filter((t) => t.isPublished);
  const isValid = templateId && assetIds.length > 0;
  const isProcessing = isCreating || isRendering;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="size-5" />
            Print Labels
          </DialogTitle>
          <DialogDescription>
            Generate and print labels for selected assets
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="template">Template</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger id="template" className="w-full">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {publishedTemplates.length === 0 ? (
                    <SelectItem value="" disabled>
                      No published templates
                    </SelectItem>
                  ) : (
                    publishedTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {formatInfo && (
                <p className="text-xs text-muted-foreground">
                  {formatInfo.name} - {formatInfo.dimensions.width}×{formatInfo.dimensions.height}
                  {formatInfo.dimensions.unit}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="copies">Copies</Label>
              <Input
                id="copies"
                type="number"
                min={1}
                max={100}
                value={copies}
                onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Selected Assets ({assetIds.length})</Label>
            {assetIds.length === 0 ? (
              <p className="text-sm text-muted-foreground">No assets selected</p>
            ) : (
              <div className="max-h-32 overflow-auto rounded-md border p-2">
                <div className="flex flex-wrap gap-1">
                  {assetIds.slice(0, 10).map((id) => {
                    const asset = assets.find((a) => a.id === id);
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs"
                      >
                        {asset?.assetTag ?? id.slice(0, 8)}
                        <button
                          type="button"
                          onClick={() => setAssetIds((prev) => prev.filter((i) => i !== id))}
                          className="hover:text-destructive"
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    );
                  })}
                  {assetIds.length > 10 && (
                    <span className="text-xs text-muted-foreground">
                      +{assetIds.length - 10} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {formatInfo && formatInfo.labelsPerSheet > 1 && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sheetLayout"
                checked={useSheetLayout}
                onChange={(e) => setUseSheetLayout(e.target.checked)}
                className="size-4 rounded border-input"
              />
              <Label htmlFor="sheetLayout" className="text-sm font-normal">
                Use sheet layout ({formatInfo.labelsPerSheet} labels per sheet)
              </Label>
            </div>
          )}

          {previewUrl && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="aspect-[3/2] overflow-hidden rounded-md border bg-muted">
                <iframe src={previewUrl} className="size-full" title="Label Preview" />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button variant="outline" onClick={handlePreview} disabled={!isValid || isProcessing}>
            {isRendering ? <Loader2 className="mr-2 size-4 animate-spin" /> : <FileText className="mr-2 size-4" />}
            Preview
          </Button>
          <Button variant="outline" onClick={handleDownload} disabled={!isValid || isProcessing}>
            {isProcessing ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Download className="mr-2 size-4" />}
            Download PDF
          </Button>
          <Button onClick={handlePrint} disabled={!isValid || isProcessing}>
            {isProcessing ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Printer className="mr-2 size-4" />}
            Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
