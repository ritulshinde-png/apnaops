import * as React from "react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, subtitle, actions, rightBlock, chip, className }: { title: React.ReactNode; subtitle?: string; actions?: React.ReactNode; rightBlock?: React.ReactNode; chip?: React.ReactNode; className?: string }) {
  return (
    <header className={cn("mb-6", className)}>
      {rightBlock ? (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">{title}</h1>
              {chip}
            </div>
            {subtitle && <p className="text-sm text-muted-foreground mt-1.5">{subtitle}</p>}
          </div>
          <div className="shrink-0">{rightBlock}</div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">{title}</h1>
              {chip}
            </div>
            {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
          </div>
          {subtitle && <p className="text-sm text-muted-foreground mt-1.5">{subtitle}</p>}
        </>
      )}
    </header>
  );
}
