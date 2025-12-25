import { useEffect, useCallback } from "react";
import {
  Printer,
  Download,
  XCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePrint } from "@/hooks/use-print";
import type { PrintJob, PrintJobStatus } from "@/types/print";
import { PRINT_JOB_STATUS } from "@/types/print";

interface PrintHistoryProps {
  onPrintAgain?: (job: PrintJob) => void;
}

function getStatusIcon(status: PrintJobStatus) {
  switch (status) {
    case PRINT_JOB_STATUS.PENDING:
      return <Clock className="size-4 text-muted-foreground" />;
    case PRINT_JOB_STATUS.PROCESSING:
      return <Loader2 className="size-4 animate-spin text-blue-500" />;
    case PRINT_JOB_STATUS.COMPLETED:
      return <CheckCircle className="size-4 text-green-500" />;
    case PRINT_JOB_STATUS.FAILED:
      return <AlertCircle className="size-4 text-destructive" />;
    case PRINT_JOB_STATUS.CANCELLED:
      return <XCircle className="size-4 text-muted-foreground" />;
    default:
      return null;
  }
}

function getStatusBadge(status: PrintJobStatus) {
  const variants: Record<PrintJobStatus, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "outline",
    processing: "secondary",
    completed: "default",
    failed: "destructive",
    cancelled: "outline",
  };

  return (
    <Badge variant={variants[status]} className="capitalize">
      {getStatusIcon(status)}
      <span className="ml-1">{status}</span>
    </Badge>
  );
}

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PrintHistory({ onPrintAgain }: PrintHistoryProps) {
  const {
    jobs,
    total,
    page,
    pageSize,
    isLoading,
    isRendering,
    error,
    fetchJobs,
    downloadPdf,
    cancelJob,
  } = usePrint();

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleRefresh = useCallback(() => {
    fetchJobs({}, page, pageSize);
  }, [fetchJobs, page, pageSize]);

  const handleDownload = useCallback(
    async (job: PrintJob) => {
      await downloadPdf(job.id, `labels-${job.templateName}-${job.itemCount}x.pdf`);
    },
    [downloadPdf]
  );

  const handleCancel = useCallback(
    async (jobId: string) => {
      await cancelJob(jobId);
      handleRefresh();
    },
    [cancelJob, handleRefresh]
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      fetchJobs({}, newPage, pageSize);
    },
    [fetchJobs, pageSize]
  );

  const totalPages = Math.ceil(total / pageSize);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Printer className="size-5" />
            Print History
          </CardTitle>
          <CardDescription>
            View and manage your print jobs
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
          <RefreshCw className={`mr-2 size-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="size-4" />
            {error}
          </div>
        )}

        {jobs.length === 0 && !isLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            No print jobs found
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead className="text-center">Labels</TableHead>
                    <TableHead className="text-right">Size</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>{getStatusBadge(job.status)}</TableCell>
                      <TableCell className="font-medium">{job.templateName}</TableCell>
                      <TableCell className="text-center">{job.itemCount}</TableCell>
                      <TableCell className="text-right">{formatBytes(job.outputSize)}</TableCell>
                      <TableCell>{formatDate(job.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {job.status === PRINT_JOB_STATUS.COMPLETED && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(job)}
                              disabled={isRendering}
                            >
                              <Download className="size-4" />
                            </Button>
                          )}
                          {job.status === PRINT_JOB_STATUS.PENDING && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancel(job.id)}
                            >
                              <XCircle className="size-4" />
                            </Button>
                          )}
                          {onPrintAgain && job.status === PRINT_JOB_STATUS.COMPLETED && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onPrintAgain(job)}
                            >
                              <RefreshCw className="size-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page <= 1 || isLoading}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= totalPages || isLoading}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
