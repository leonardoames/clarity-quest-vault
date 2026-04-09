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

const variantConfig = {
  default:  { value: "text-foreground",          icon: "text-muted-foreground bg-secondary",         bar: "bg-muted-foreground/20" },
  success:  { value: "text-success",              icon: "text-success bg-success/10",                 bar: "bg-success" },
  danger:   { value: "text-destructive",          icon: "text-destructive bg-destructive/10",         bar: "bg-destructive" },
  warning:  { value: "text-warning",              icon: "text-warning bg-warning/10",                 bar: "bg-warning" },
  primary:  { value: "text-primary",              icon: "text-primary bg-primary/10",                 bar: "bg-primary" },
};

export function StatCard({ title, value, icon: Icon, trend, trendUp, variant = "default" }: StatCardProps) {
  const cfg = variantConfig[variant];

  return (
    <div className={cn("stat-card animate-fade-up group min-h-[110px] hover:shadow-lg hover:shadow-black/30 transition-shadow", variant === "primary" && "border-primary/20")}>
      {/* Accent bar top */}
      <div className={cn("absolute top-0 left-0 h-0.5 w-0 rounded-full transition-all duration-500 group-hover:w-full", cfg.bar)} />

      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 min-w-0 flex-1">
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium truncate"
             style={{ letterSpacing: '0.08em' }}>
            {title}
          </p>
          <p
            className={cn("text-2xl font-bold tracking-tight tabular-nums", cfg.value)}
            style={{ fontFamily: 'Space Mono, monospace', letterSpacing: '-0.02em' }}
          >
            {value}
          </p>
        </div>
        <div className={cn("p-2.5 rounded-lg shrink-0 transition-all duration-300", cfg.icon)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      {trend && (
        <div className="mt-3 flex items-center gap-1.5">
          <span className={cn(
            "text-xs font-medium",
            trendUp ? "text-success" : "text-destructive"
          )}>
            {trendUp ? "▲" : "▼"} {trend}
          </span>
        </div>
      )}
    </div>
  );
}
