import { getStatusConfig } from "@/lib/mock-data";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = getStatusConfig(status);
  return (
    <span className={`status-badge ${config.className}`}>
      {config.label}
    </span>
  );
}
