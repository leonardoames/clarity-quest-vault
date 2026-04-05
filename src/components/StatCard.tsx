import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  variant?: "default" | "success" | "danger" | "warning" | "primary";
}

const variantStyles = {
  default: "text-foreground",
  success: "text-success",
  danger: "text-destructive",
  warning: "text-warning",
  primary: "text-primary",
};

export function StatCard({ title, value, icon: Icon, trend, trendUp, variant = "default" }: StatCardProps) {
  return (
    <div className="stat-card animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={cn("text-2xl font-bold tracking-tight", variantStyles[variant])}>
            {value}
          </p>
        </div>
        <div className={cn("p-2 rounded-lg bg-secondary", variantStyles[variant])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {trend && (
        <p className={cn("text-xs mt-3", trendUp ? "text-success" : "text-destructive")}>
          {trend}
        </p>
      )}
    </div>
  );
}
