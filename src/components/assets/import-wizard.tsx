import { useState, useCallback } from "react";
import { 
  Upload, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  X,
  ArrowRight,
  ArrowLeft
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { cn } from "@/lib/utils";

interface ImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type Step = "upload" | "mapping" | "preview" | "importing" | "complete";

const ASSET_FIELDS = [
  { value: "assetTag", label: "Asset Tag", required: true },
  { value: "serialNumber", label: "Serial Number", required: true },
  { value: "category", label: "Category", required: true },
  { value: "type", label: "Type", required: true },
  { value: "manufacturer", label: "Manufacturer", required: true },
  { value: "model", label: "Model", required: true },
  { value: "location", label: "Location", required: true },
  { value: "status", label: "Status", required: false },
  { value: "department", label: "Department", required: false },
  { value: "assignedTo", label: "Assigned To", required: false },
  { value: "purchaseDate", label: "Purchase Date", required: false },
  { value: "warrantyExpiry", label: "Warranty Expiry", required: false },
  { value: "notes", label: "Notes", required: false },
  { value: "_skip", label: "Skip this column", required: false },
];

interface ColumnMapping {
  column: string;
  to: string;
}

interface ImportResult {
  total: number;
  imported: number;
  errors: number;
  errorDetails: Array<{ row: number; message: string }>;
}

export function ImportWizard({ open, onOpenChange, onSuccess }: ImportWizardProps) {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<string[][]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const resetState = useCallback(() => {
    setStep("upload");
    setFile(null);
    setColumns([]);
    setPreviewData([]);
    setColumnMappings([]);
    setIsLoading(false);
    setError(null);
    setResult(null);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onOpenChange(false);
  }, [resetState, onOpenChange]);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setError(null);
    setFile(selectedFile);

    const validTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    const ext = selectedFile.name.split(".").pop()?.toLowerCase();

    if (!validTypes.includes(selectedFile.type) && !["csv", "xlsx", "xls"].includes(ext ?? "")) {
      setError("Please select a CSV or Excel file (.csv, .xlsx, .xls)");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("File size exceeds 10MB limit");
      return;
    }

    setIsLoading(true);

    try {
      const text = await selectedFile.text();
      const lines = text.split("\n").filter((line) => line.trim());

      if (lines.length < 2) {
        setError("File must contain at least a header row and one data row");
        setIsLoading(false);
        return;
      }

      const headerLine = lines[0] ?? "";
      const detectedColumns = headerLine.split(",").map((col) => col.trim().replace(/^"|"$/g, ""));
      setColumns(detectedColumns);

      const preview = lines.slice(1, 6).map((line) => {
        const values: string[] = [];
        let current = "";
        let inQuotes = false;

        for (const char of line) {
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === "," && !inQuotes) {
            values.push(current.trim());
            current = "";
          } else {
            current += char;
          }
        }
        values.push(current.trim());
        return values;
      });
      setPreviewData(preview);

      const autoMappings = detectedColumns.map((col) => {
        const normalized = col.toLowerCase().replace(/[^a-z0-9]/g, "");
        const match = ASSET_FIELDS.find((field) => {
          const fieldNorm = field.label.toLowerCase().replace(/[^a-z0-9]/g, "");
          const valueNorm = field.value.toLowerCase();
          return normalized === fieldNorm || normalized === valueNorm || normalized.includes(fieldNorm);
        });
        return { column: col, to: match?.value ?? "_skip" };
      });
      setColumnMappings(autoMappings);

      setStep("mapping");
    } catch {
      setError("Failed to parse file. Please ensure it's a valid CSV file.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFileSelect(droppedFile);
      }
    },
    [handleFileSelect]
  );

  const handleMappingChange = useCallback((column: string, to: string) => {
    setColumnMappings((prev) =>
      prev.map((m) => (m.column === column ? { ...m, to } : m))
    );
  }, []);

  const validateMappings = useCallback(() => {
    const required = ASSET_FIELDS.filter((f) => f.required).map((f) => f.value);
    const mapped = columnMappings.filter((m) => m.to !== "_skip").map((m) => m.to);
    const missing = required.filter((r) => !mapped.includes(r));
    return missing;
  }, [columnMappings]);

  const handleImport = useCallback(async () => {
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setStep("importing");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const mapping = {
        entity: "asset" as const,
        columns: columnMappings
          .filter((m) => m.to !== "_skip")
          .map((m) => ({
            column: m.column,
            to: m.to,
            required: ASSET_FIELDS.find((f) => f.value === m.to)?.required ?? false,
          })),
      };
      formData.append("mapping", JSON.stringify(mapping));

      const response = await fetch("/api/imports", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Import failed");
      }

      const data = await response.json();
      const job = data.job;

      let pollAttempts = 0;
      const maxAttempts = 30;

      const checkStatus = async (): Promise<void> => {
        pollAttempts++;
        const statusRes = await fetch(`/api/imports/${job.id}`, {
          credentials: "include",
        });
        const statusData = await statusRes.json();
        const status = statusData.job.status;

        if (status === "completed") {
          setResult({
            total: statusData.job.totalRows ?? 0,
            imported: statusData.job.processedRows ?? 0,
            errors: statusData.job.failedRows ?? 0,
            errorDetails: [],
          });
          setStep("complete");
        } else if (status === "failed") {
          throw new Error(statusData.job.errorMessage ?? "Import failed");
        } else if (pollAttempts < maxAttempts) {
          await new Promise((r) => setTimeout(r, 1000));
          return checkStatus();
        } else {
          throw new Error("Import timed out");
        }
      };

      await checkStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      setStep("mapping");
    } finally {
      setIsLoading(false);
    }
  }, [file, columnMappings]);

  const missingRequired = validateMappings();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Assets from File</DialogTitle>
          <DialogDescription>
            {step === "upload" && "Upload a CSV or Excel file containing your asset data."}
            {step === "mapping" && "Map your file columns to asset fields."}
            {step === "preview" && "Review the data before importing."}
            {step === "importing" && "Importing your assets..."}
            {step === "complete" && "Import completed!"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {step === "upload" && (
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                "cursor-pointer hover:border-primary hover:bg-primary/5"
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <input
                id="file-input"
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
              />
              {isLoading ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-12 w-12 text-primary animate-spin" />
                  <p className="text-muted-foreground">Processing file...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 rounded-full bg-muted">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">Drop your file here or click to browse</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Supports CSV and Excel files up to 10MB
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === "mapping" && (
            <div className="space-y-4">
              {file && (
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {columns.length} columns detected, {previewData.length} rows preview
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={resetState}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {missingRequired.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Missing Required Fields</AlertTitle>
                  <AlertDescription>
                    Please map the following required fields:{" "}
                    {missingRequired
                      .map((f) => ASSET_FIELDS.find((af) => af.value === f)?.label)
                      .join(", ")}
                  </AlertDescription>
                </Alert>
              )}

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">File Column</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Maps To</TableHead>
                      <TableHead className="w-[200px]">Preview</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {columns.map((col, idx) => (
                      <TableRow key={col}>
                        <TableCell className="font-medium">{col}</TableCell>
                        <TableCell>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={columnMappings.find((m) => m.column === col)?.to ?? "_skip"}
                            onValueChange={(value) => handleMappingChange(col, value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ASSET_FIELDS.map((field) => (
                                <SelectItem key={field.value} value={field.value}>
                                  {field.label}
                                  {field.required && " *"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {previewData[0]?.[idx] ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {step === "importing" && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
              <p className="font-medium">Importing assets...</p>
              <p className="text-sm text-muted-foreground mt-1">
                This may take a few moments depending on file size.
              </p>
            </div>
          )}

          {step === "complete" && result && (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center py-8">
                <div className="p-4 rounded-full bg-emerald-500/10 mb-4">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                </div>
                <p className="font-medium text-lg">Import Complete</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-2xl font-bold">{result.total}</p>
                  <p className="text-sm text-muted-foreground">Total Rows</p>
                </div>
                <div className="p-4 bg-emerald-500/10 rounded-lg text-center">
                  <p className="text-2xl font-bold text-emerald-600">{result.imported}</p>
                  <p className="text-sm text-muted-foreground">Imported</p>
                </div>
                {result.errors > 0 && (
                  <div className="p-4 bg-destructive/10 rounded-lg text-center">
                    <p className="text-2xl font-bold text-destructive">{result.errors}</p>
                    <p className="text-sm text-muted-foreground">Errors</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {error && step !== "importing" && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          {step === "upload" && (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}

          {step === "mapping" && (
            <>
              <Button variant="outline" onClick={resetState}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={missingRequired.length > 0 || isLoading}
              >
                Import {previewData.length > 0 ? `(${previewData.length}+ rows)` : ""}
              </Button>
            </>
          )}

          {step === "complete" && (
            <Button
              onClick={() => {
                onSuccess();
                handleClose();
              }}
            >
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
