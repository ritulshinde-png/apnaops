import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({ icon: Icon, title, subtitle, action, className }: { icon?: LucideIcon; title: string; subtitle: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-dashed bg-card p-10 text-center", className)}>
      {Icon && <Icon className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />}
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1.5 leading-relaxed">{subtitle}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
