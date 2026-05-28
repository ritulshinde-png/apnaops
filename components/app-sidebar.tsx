"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, LayoutDashboard, ListChecks, Users, Network, BarChart3, Box, Plug, Bot, Settings as SettingsIcon, Zap, PanelLeftOpen, PanelLeftClose } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTheme } from "next-themes";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { cn } from "@/lib/utils";

const WORKSPACE_ITEMS = [
  { href: "/home", label: "My Home", icon: Home, badgeKey: "homeIssues" as const },
  { href: "/dashboard", label: "My Dashboard", icon: LayoutDashboard },
  { href: "/actions", label: "My Actions", icon: ListChecks },
];

const SETUP_ITEMS = [
  { href: "/users", label: "Users", icon: Users },
  { href: "/roles", label: "Roles & Permissions", icon: Network },
  { href: "/metrics", label: "Metrics Catalog", icon: BarChart3 },
  { href: "/dimensions", label: "Dimensions", icon: Box },
  { href: "/connectors", label: "Connectors", icon: Plug },
  { href: "/agents", label: "Agents & Schedules", icon: Bot },
];

export function AppSidebar() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [confirmLogout, setConfirmLogout] = React.useState(false);
  const pendingCollapseRef = React.useRef(false);
  const asideRef = React.useRef<HTMLElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const user = useCurrentUser();
  const logout = useAppStore((s) => s.logout);
  const issues = useAppStore((s) => s.issues);
  const myOpenIssues = user
    ? user.accessLevel === "owner" || user.accessLevel === "admin"
      ? issues.filter((i) => i.status !== "resolved" && i.status !== "rejected").length
      : issues.filter((i) => i.owner === user.name && i.status !== "resolved" && i.status !== "rejected").length
    : 0;
  const canSeeSetup = user?.accessLevel === "owner" || user?.accessLevel === "admin";
  const initials = user ? user.name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase() : "?";

  // Collapse on any click outside the sidebar.
  React.useEffect(() => {
    if (!isOpen) return;
    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node | null;
      if (!t) return;
      if (asideRef.current && asideRef.current.contains(t)) return;
      // Ignore clicks inside floating UI rendered in a portal (dialogs, popovers).
      const el = t as HTMLElement;
      if (el.closest?.("[role='dialog'],[data-radix-popper-content-wrapper]")) return;
      setIsOpen(false);
      pendingCollapseRef.current = false;
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isOpen]);

  function doLogout() {
    setConfirmLogout(false);
    setSettingsOpen(false);
    logout();
    router.replace("/login");
  }

  return (
    <>
      <aside
        ref={asideRef}
        onClick={(e) => {
          const t = e.target as HTMLElement;
          if (isOpen) {
            // Clicked a nav tile while expanded → collapse once the cursor leaves.
            if (t.closest("a")) pendingCollapseRef.current = true;
            return;
          }
          if (t.closest("a") || t.closest("button")) return;
          setIsOpen(true);
        }}
        onMouseLeave={() => {
          if (pendingCollapseRef.current) {
            pendingCollapseRef.current = false;
            setIsOpen(false);
          }
        }}
        className={cn(
          "fixed top-0 left-0 h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col z-50 px-1.5 py-3 transition-[width] duration-300 ease-in-out",
          isOpen ? "w-60" : "w-14 cursor-pointer"
        )}
      >
        <div className="flex items-center pl-3 pr-2 py-2 font-bold text-foreground">
          <Zap className="h-5 w-5 text-primary shrink-0" />
          <RevealText isOpen={isOpen} className="text-base tracking-tight">Apnaops</RevealText>
        </div>

        <nav className="flex-1 mt-0.5 space-y-0.5">
          <SectionLabel isOpen={isOpen} label="Workspace" first />
          {WORKSPACE_ITEMS.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              Icon={item.icon}
              isOpen={isOpen}
              active={pathname.startsWith(item.href)}
              badge={item.badgeKey === "homeIssues" ? myOpenIssues : 0}
            />
          ))}

          {canSeeSetup && (
            <>
              <SectionLabel isOpen={isOpen} label="Setup" chip="admin only" />
              {SETUP_ITEMS.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  Icon={item.icon}
                  isOpen={isOpen}
                  active={pathname.startsWith(item.href)}
                />
              ))}
            </>
          )}
        </nav>

        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="relative flex items-center rounded-md text-sm font-medium leading-5 transition-colors group pl-3 pr-2 py-2 mb-2 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
          aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          <span className="relative shrink-0 h-[18px] w-[18px]">
            <PanelLeftOpen className={cn("absolute inset-0 h-[18px] w-[18px] transition-opacity duration-200", isOpen ? "opacity-0" : "opacity-100")} />
            <PanelLeftClose className={cn("absolute inset-0 h-[18px] w-[18px] transition-opacity duration-200", isOpen ? "opacity-100" : "opacity-0")} />
          </span>
          <RevealText isOpen={isOpen}>{isOpen ? "Collapse" : "Expand"}</RevealText>
          {!isOpen && <CollapsedTooltip label="Expand" />}
        </button>

        <div className="flex items-center pt-3 pl-2 pr-2 border-t border-sidebar-border">
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarFallback className="text-[10px] font-semibold bg-gradient-to-br from-primary to-accent-foreground text-white">{initials}</AvatarFallback>
          </Avatar>
          <RevealText isOpen={isOpen} className="flex-1 min-w-0 flex flex-col leading-tight">
            <span className="text-[13px] font-semibold truncate text-foreground">{user?.name || "—"}</span>
            <span className="text-[11px] text-muted-foreground truncate">{user?.role || user?.accessLevel || "—"}</span>
          </RevealText>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className={cn(
              "shrink-0 inline-flex items-center justify-center rounded-md h-8 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-all duration-300 ease-in-out overflow-hidden",
              isOpen ? "w-8 ml-1 opacity-100" : "w-0 ml-0 opacity-0 pointer-events-none"
            )}
            aria-label="Settings"
            title="Settings"
          >
            <SettingsIcon className="h-4 w-4" />
          </button>
        </div>
      </aside>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Settings</DialogTitle><DialogDescription>Theme, account.</DialogDescription></DialogHeader>
          <ThemeRow />
          <div className="border-t pt-4 mt-2">
            <p className="text-sm font-medium mb-2">Account</p>
            <Button variant="outline" className="w-full justify-start gap-2 text-foreground hover:text-destructive" onClick={() => setConfirmLogout(true)}>
              <LogoutIcon /> Sign out ({user?.name || "—"})
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmLogout} onOpenChange={setConfirmLogout}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Do you really want to sign out?</DialogTitle><DialogDescription>You&apos;ll be signed out from <b className="text-foreground">{user?.name}</b> and returned to the sign-in screen.</DialogDescription></DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmLogout(false)}>Cancel</Button>
            <Button variant="destructive" onClick={doLogout}>Yes, sign out</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function NavLink({ href, label, Icon, isOpen, active, badge = 0 }: {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  isOpen: boolean;
  active: boolean;
  badge?: number;
}) {
  const [suppressTooltip, setSuppressTooltip] = React.useState(false);
  return (
    <Link
      href={href}
      onClick={() => setSuppressTooltip(true)}
      onMouseLeave={() => setSuppressTooltip(false)}
      className={cn(
        "relative flex items-center rounded-md text-sm font-medium leading-5 transition-colors group pl-3 pr-2 py-2",
        active
          ? "bg-primary text-primary-foreground font-semibold"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-primary"
      )}
    >
      <Icon className="shrink-0 h-[18px] w-[18px] transition-colors" />
      <RevealText isOpen={isOpen}>{label}</RevealText>
      {badge > 0 && (
        <span className={cn(
          "absolute inline-flex items-center justify-center rounded-full font-semibold transition-all duration-300 ease-in-out",
          active ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground",
          isOpen
            ? "right-2 top-1/2 -translate-y-1/2 min-w-[18px] h-[18px] px-1.5 text-[10px]"
            : cn(
                "right-1.5 top-1.5 min-w-[14px] h-[14px] px-1 text-[10px] ring-2",
                active ? "ring-primary" : "ring-sidebar"
              )
        )}>{badge}</span>
      )}
      {!isOpen && <CollapsedTooltip label={label} suppress={suppressTooltip} />}
    </Link>
  );
}

function RevealText({ isOpen, children, className }: { isOpen: boolean; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out",
        isOpen ? "max-w-[220px] opacity-100 ml-2.5" : "max-w-0 opacity-0 ml-0",
        className
      )}
    >
      {children}
    </span>
  );
}

function SectionLabel({ isOpen, label, chip, first }: { isOpen: boolean; label: string; chip?: string; first?: boolean }) {
  return (
    <div className={cn("relative h-7 mb-0.5 flex items-center", first ? "mt-1" : "mt-3")}>
      <div
        className={cn(
          "absolute left-2 right-2 h-px bg-sidebar-border transition-opacity duration-200",
          isOpen ? "opacity-0" : "opacity-100"
        )}
      />
      <span
        className={cn(
          "relative overflow-hidden whitespace-nowrap pl-3 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold transition-all duration-300 ease-in-out flex items-center",
          isOpen ? "max-w-[240px] opacity-100" : "max-w-0 opacity-0"
        )}
      >
        {label}
        {chip && (
          <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full bg-muted text-[9px] tracking-wider normal-case font-medium">{chip}</span>
        )}
      </span>
    </div>
  );
}

function CollapsedTooltip({ label, suppress }: { label: string; suppress?: boolean }) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2.5 z-[200] whitespace-nowrap rounded-md bg-foreground px-2.5 py-1.5 text-[12px] font-medium text-background shadow-lg transition-opacity duration-150",
        suppress ? "opacity-0" : "opacity-0 group-hover:opacity-100"
      )}
    >
      <svg
        aria-hidden="true"
        width="7"
        height="12"
        viewBox="0 0 7 12"
        className="absolute right-full top-1/2 -translate-y-1/2 mr-[-0.5px] text-foreground"
      >
        <path
          d="M6.5 0V12L0.385799 6.7593C-0.0798122 6.3602 -0.0798122 5.6398 0.385799 5.2407L6.5 0Z"
          fill="currentColor"
        />
      </svg>
      <span className="relative">{label}</span>
    </span>
  );
}

function ThemeRow() {
  const { theme, setTheme } = useTheme();
  return (
    <div>
      <p className="text-sm font-medium mb-2">Theme</p>
      <Tabs value={theme === "dark" ? "dark" : "light"} onValueChange={(v) => setTheme(v)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="light">Light</TabsTrigger>
          <TabsTrigger value="dark">Dark</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 12.5v1A1.5 1.5 0 0 1 8.5 15h-5A1.5 1.5 0 0 1 2 13.5v-11A1.5 1.5 0 0 1 3.5 1h5A1.5 1.5 0 0 1 10 2.5v1" />
      <path d="M14 8H6" />
      <path d="M11.5 5.5L14 8l-2.5 2.5" />
    </svg>
  );
}
