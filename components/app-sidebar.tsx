"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, LayoutDashboard, ListChecks, Users, Network, BarChart3, Box, Plug, Bot, Settings as SettingsIcon, Zap } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTheme } from "next-themes";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { cn } from "@/lib/utils";

const OPERATING_ITEMS = [
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
  const [expanded, setExpanded] = React.useState(false);
  const [lockOpen, setLockOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [confirmLogout, setConfirmLogout] = React.useState(false);
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
  const isOpen = expanded || lockOpen;
  const canSeeSetup = user?.accessLevel === "owner" || user?.accessLevel === "admin";

  const initials = user ? user.name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase() : "?";

  function doLogout() {
    setConfirmLogout(false);
    setSettingsOpen(false);
    logout();
    router.replace("/login");
  }

  return (
    <>
      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => !lockOpen && setExpanded(false)}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a") || (e.target as HTMLElement).closest("button")) return;
          setLockOpen((v) => !v);
        }}
        className={cn(
          "fixed top-0 left-0 h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col z-50 transition-[width] duration-200 ease-out",
          isOpen ? "w-60 px-3" : "w-14 px-1.5",
          "py-3 cursor-pointer"
        )}
      >
        <div className={cn("flex items-center gap-2 px-2 py-2 font-bold text-foreground", !isOpen && "justify-center px-0")}>
          <Zap className="h-5 w-5 text-primary shrink-0" />
          {isOpen && <span className="text-base tracking-tight">Apnaops</span>}
        </div>

        <nav className="flex-1 mt-2 space-y-0.5 overflow-hidden">
          {OPERATING_ITEMS.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} Icon={item.icon} isOpen={isOpen} active={pathname.startsWith(item.href)} badge={item.badgeKey === "homeIssues" ? myOpenIssues : 0} />
          ))}

          {canSeeSetup && (<>
            <div className={cn("px-2 mt-5 mb-1 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold", !isOpen && "hidden")}>
              Setup <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full bg-muted text-[9px] tracking-wider">admin only</span>
            </div>
            {SETUP_ITEMS.map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} Icon={item.icon} isOpen={isOpen} active={pathname.startsWith(item.href)} />
            ))}
          </>)}
        </nav>

        <div className={cn("flex items-center gap-3 pt-3 mt-3 border-t border-sidebar-border", !isOpen && "justify-center")}>
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="text-[11px] font-semibold bg-gradient-to-br from-primary to-accent-foreground text-white">{initials}</AvatarFallback>
          </Avatar>
          {isOpen && (
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold truncate text-foreground">{user?.name || "—"}</p>
              <p className="text-[11px] text-muted-foreground truncate">{user?.role || user?.accessLevel || "—"}</p>
            </div>
          )}
          {isOpen && (
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={(e) => { e.stopPropagation(); setSettingsOpen(true); }} title="Settings"><SettingsIcon className="h-4 w-4" /></Button>
          )}
        </div>
      </aside>

      {/* Settings dialog with sign-out inside */}
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

      {/* Confirm sign-out */}
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

function NavLink({ href, label, Icon, isOpen, active, badge = 0 }: { href: string; label: string; Icon: React.ComponentType<{ className?: string }>; isOpen: boolean; active: boolean; badge?: number }) {
  return (
    <Link href={href} className={cn(
      "relative flex items-center gap-2.5 rounded-md text-sm font-medium leading-none transition-colors group",
      isOpen ? "px-2 py-2 justify-start" : "px-0 py-2 justify-center",
      active ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    )}>
      <Icon className={cn("shrink-0 h-[18px] w-[18px]", active && "text-sidebar-primary")} />
      {isOpen && <span className="truncate flex-1">{label}</span>}
      {badge > 0 && (
        <span className={cn(
          "absolute inline-flex items-center justify-center bg-primary text-primary-foreground rounded-full font-semibold transition-all duration-200",
          isOpen ? "right-2 top-1/2 -translate-y-1/2 min-w-[18px] h-[18px] px-1.5 text-[10px]" : "right-1.5 top-1.5 min-w-[14px] h-[14px] px-1 text-[9px] ring-2 ring-sidebar"
        )}>{badge}</span>
      )}
    </Link>
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
