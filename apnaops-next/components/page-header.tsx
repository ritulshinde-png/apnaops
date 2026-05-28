import { cn } from "@/lib/utils";

export function PageHeader({ title, subtitle, actions, chip, className }: { title: string; subtitle?: string; actions?: React.ReactNode; chip?: React.ReactNode; className?: string }) {
  return (
    <header className={cn("mb-6", className)}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {chip}
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      </div>
      {subtitle && <p className="text-sm text-muted-foreground mt-1.5">{subtitle}</p>}
    </header>
  );
}
