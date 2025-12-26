import { useEffect, useState } from "react";
import { Package, CheckCircle, Wrench, Clock, TrendingUp } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAssets } from "@/hooks/use-assets";

interface AssetStats {
  total: number;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
}

interface StatItemProps {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  isEmpty?: boolean;
}

function StatItem({ label, value, icon: Icon, color, isEmpty }: StatItemProps) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn(
        "p-2 rounded-lg",
        isEmpty ? "bg-muted" : color
      )}>
        <Icon className={cn(
          "h-4 w-4",
          isEmpty ? "text-muted-foreground" : "text-white"
        )} />
      </div>
      <div className="flex flex-col">
        <span className={cn(
          "text-2xl font-bold tabular-nums",
          isEmpty ? "text-muted-foreground" : "text-foreground"
        )}>
          {isEmpty ? "—" : value.toLocaleString()}
        </span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

export function AssetSummaryBar() {
  const { getStats } = useAssets();
  const [stats, setStats] = useState<AssetStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      setIsLoading(true);
      const result = await getStats();
      setStats(result);
      setIsLoading(false);
    }
    loadStats();
  }, [getStats]);

  const isEmpty = !stats || stats.total === 0;
  const activeCount = stats?.byStatus?.active ?? 0;
  const maintenanceCount = stats?.byStatus?.maintenance ?? 0;
  const pendingCount = stats?.byStatus?.pending ?? 0;

  if (isLoading) {
    return (
      <Card className="p-4 mb-4">
        <div className="flex items-center justify-between gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted animate-pulse" />
              <div className="flex flex-col gap-1">
                <div className="h-6 w-12 bg-muted rounded animate-pulse" />
                <div className="h-3 w-16 bg-muted rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 mb-4">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <StatItem
          label="Total Assets"
          value={stats?.total ?? 0}
          icon={Package}
          color="bg-primary"
          isEmpty={isEmpty}
        />
        <div className="hidden sm:block h-8 w-px bg-border" />
        <StatItem
          label="Active"
          value={activeCount}
          icon={CheckCircle}
          color="bg-emerald-500"
          isEmpty={isEmpty}
        />
        <div className="hidden sm:block h-8 w-px bg-border" />
        <StatItem
          label="Maintenance"
          value={maintenanceCount}
          icon={Wrench}
          color="bg-amber-500"
          isEmpty={isEmpty}
        />
        <div className="hidden sm:block h-8 w-px bg-border" />
        <StatItem
          label="Pending"
          value={pendingCount}
          icon={Clock}
          color="bg-blue-500"
          isEmpty={isEmpty}
        />
        {isEmpty && (
          <>
            <div className="hidden lg:block h-8 w-px bg-border" />
            <div className="hidden lg:flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span>Add assets to see metrics</span>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
