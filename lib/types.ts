export type AccessLevel = "owner" | "admin" | "operator";
export type GeoType = "Global" | "State" | "City" | "Store";

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  accessLevel: AccessLevel;
  geoType: GeoType | "";
  geoName: string;
  password?: string;
  active: boolean;
}

export interface Role {
  id: string;
  name: string;
  parent: string | null;
  metrics: string[];
}

export interface Metric {
  id: string;
  name: string;
  dataSource: string;
  baseTables: string;
  queryTemplate?: string;
  stdGran: string;
  refreshInterval: string;
  dimensions: string[];
  ownerRoles: string[];
  active: boolean;
}

export type ThresholdTier = "P0" | "P1" | "Other";
export type ThresholdOperator = "gt" | "lt" | "gte" | "lte" | "eq" | "between";
export interface Threshold {
  id: string;
  metric: string;
  tier: ThresholdTier;
  customTier?: string;
  operator: ThresholdOperator;
  value: number;
  value2?: number;
  scopeType: "Global" | "State" | "City" | "Store";
  scopeName?: string;
  updatedAt: string;
  updatedBy: string;
}

export type DimensionType = "geo" | "time" | "project" | "channel" | "custom";
export interface Dimension {
  id: string;
  name: string;
  type: DimensionType;
  levels: string[];
  values: Record<string, string[]>;
  lastCrawled: string | null;
}

export type LocationType = "Global" | "State" | "City" | "Store";
export interface LocationNode {
  name: string;
  type: LocationType;
  children: string[];
}

export interface Standup {
  id: string;
  name: string;
  time: string;
  timezone: string;
  cadence: string;
  meetLink: string | null;
  meetingId?: string | null;
  attendees: string[];
  lastSyncedAt: string | null;
  syncDirty?: boolean;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  ts: string;
  text: string;
  edited: boolean;
}

export type IssueSeverity = "p0" | "p1" | "ok";
export type IssueStatus = "open" | "working" | "resolved" | "rejected" | "reassigned" | null;
export interface Issue {
  id: string;
  metric: string;
  locId: string;
  severity: IssueSeverity;
  value: string;
  delta: string;
  threshold: string;
  transition?: string;
  transitionLabel?: string;
  what: string;
  fix: string;
  owner: string;
  forUser?: boolean;
  hypotheses: { h: string; c: number }[];
  actionDraft: string;
  status: IssueStatus;
  openedAt: string;
  updatedAt: string;
  comments: Comment[];
  ownerOrphaned?: boolean;
  city?: string;
  state?: string;
}

export interface Actionable {
  title: string;
  owner: string;
  due: string;
  lastUpdate: string;
  ago: string;
  sev: string;
  locId: string;
}

export interface AgentDef {
  id: string;
  isSystem: boolean;
  name: string;
  description: string;
  trigger: "cron" | "event" | "manual" | "worker";
  kind: "cron" | "oneshot" | "worker" | "manual";
  schedule: string;
  context: string[];
  instructions: string;
  rules: string[];
  knowledge: string[];
  outputs: string[];
  rateLimit?: { perHour: number; perMinPerChannel: number };
  lastRun: string;
  status: "success" | "fail" | "retrying" | "paused" | "running";
  paused: boolean;
  running?: boolean;
}

export interface Connector {
  id: string;
  name: string;
  type: string;
  config: Record<string, string>;
  secretRef?: string;
  status: "connected" | "failed" | "untested";
  lastTestedAt: string | null;
  active: boolean;
}

export interface MyActionEntry {
  ts: string;
  kind: string;
  icon?: string;
  text: string;
  meta?: string;
  issueId?: string;
  actor?: string;
}

export interface DashFilters {
  metric: string;
  dateRange: string;
  breakdown: string;
  myMetrics: boolean;
  search: string;
  sortBy: { key: string; dir: "asc" | "desc" } | null;
  statusFilter: "all" | "issues" | "good";
}

export interface SessionState {
  authenticated: boolean;
  stage: "email" | "first-time" | "password" | null;
  pendingUserId: string | null;
}
