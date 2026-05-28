import type { User, Role, Metric, Threshold, Dimension, LocationNode, Standup, Issue, Actionable, AgentDef, Connector, MyActionEntry } from "./types";
import { tsMinus } from "./utils";

// ===== Locations (abbreviated from prototype — Jharkhand / West Bengal / Chhattisgarh) =====
export const SEED_LOCATIONS: Record<string, LocationNode> = {
  global: { name: "Global", type: "Global", children: ["JH", "WB", "CG"] },
  JH: { name: "Jharkhand", type: "State", children: ["JH_ranchi", "JH_jamshedpur", "JH_hazaribagh"] },
  WB: { name: "West Bengal", type: "State", children: ["WB_kolkata", "WB_asansol", "WB_durgapur"] },
  CG: { name: "Chhattisgarh", type: "State", children: ["CG_raipur", "CG_bilaspur", "CG_korba"] },
  JH_ranchi: { name: "Ranchi", type: "City", children: ["st_280", "st_274", "st_270", "st_269", "st_286", "st_390"] },
  JH_jamshedpur: { name: "Jamshedpur", type: "City", children: ["st_315", "st_427", "st_457"] },
  JH_hazaribagh: { name: "Hazaribagh", type: "City", children: ["st_290", "st_292"] },
  WB_kolkata: { name: "Kolkata", type: "City", children: ["st_396", "st_307", "st_357", "st_465"] },
  WB_asansol: { name: "Asansol", type: "City", children: ["st_335", "st_339"] },
  WB_durgapur: { name: "Durgapur", type: "City", children: ["st_294", "st_345"] },
  CG_raipur: { name: "Raipur", type: "City", children: ["st_300", "st_310", "st_311"] },
  CG_bilaspur: { name: "Bilaspur", type: "City", children: ["st_378", "st_435"] },
  CG_korba: { name: "Korba", type: "City", children: ["st_203", "st_445"] },
  st_280: { name: "Lalpur RNC (280)", type: "Store", children: [] },
  st_274: { name: "Pe Pee Compound RNC (274)", type: "Store", children: [] },
  st_270: { name: "Kathal More RNC (270)", type: "Store", children: [] },
  st_269: { name: "Cheshire Home Rd RNC (269)", type: "Store", children: [] },
  st_286: { name: "Hindpiri RNC (286)", type: "Store", children: [] },
  st_390: { name: "Bariatu Housing RNC (390)", type: "Store", children: [] },
  st_315: { name: "Baradwari JSR (315)", type: "Store", children: [] },
  st_427: { name: "Ghat Rd Kadma JSR (427)", type: "Store", children: [] },
  st_457: { name: "E W Link A Rd Sonari JSR (457)", type: "Store", children: [] },
  st_290: { name: "Babugaoun Chowk HZB (290)", type: "Store", children: [] },
  st_292: { name: "Sindoor HZB (292)", type: "Store", children: [] },
  st_396: { name: "Hooghly St Rd KOL (396)", type: "Store", children: [] },
  st_307: { name: "Chinsura KOL (307)", type: "Store", children: [] },
  st_357: { name: "Barasat KOL (357)", type: "Store", children: [] },
  st_465: { name: "Upper Hatia Rd Hatia (465)", type: "Store", children: [] },
  st_335: { name: "New SB Gorai ASL (335)", type: "Store", children: [] },
  st_339: { name: "New Court More ASL (339)", type: "Store", children: [] },
  st_294: { name: "Saptrishi Park DGP (294)", type: "Store", children: [] },
  st_345: { name: "Benachity DGP (345)", type: "Store", children: [] },
  st_300: { name: "New Samta Colony RPR (300)", type: "Store", children: [] },
  st_310: { name: "Kabir Nagar RPR (310)", type: "Store", children: [] },
  st_311: { name: "Devendra Nagar RPR (311)", type: "Store", children: [] },
  st_378: { name: "Tikrapara Mannu Chowk BPR (378)", type: "Store", children: [] },
  st_435: { name: "New Gaurav Path Ameri BPR (435)", type: "Store", children: [] },
  st_203: { name: "Kosabadi KRB (203)", type: "Store", children: [] },
  st_445: { name: "New Dadar Rd RSS Nagar KRB (445)", type: "Store", children: [] },
};

export const SEED_USERS: User[] = [
  { id: "u0", name: "Ritul Shinde", email: "ritul.shinde@apnamart.in", role: "Owner", accessLevel: "owner", geoType: "Global", geoName: "Global", password: "apnaops123", active: true },
  { id: "u1", name: "Rohit Kumar", email: "rohit@apnamart.in", role: "Area Manager", accessLevel: "admin", geoType: "City", geoName: "Ranchi", password: "demo123", active: true },
  { id: "u2", name: "Vikram Singh", email: "vikram@apnamart.in", role: "Satellite Manager", accessLevel: "operator", geoType: "Store", geoName: "280", active: true },
  { id: "u3", name: "Anita Roy", email: "anita@apnamart.in", role: "Fleet Manager", accessLevel: "operator", geoType: "City", geoName: "Ranchi", active: true },
  { id: "u4", name: "Suresh Mahto", email: "suresh@apnamart.in", role: "Satellite Manager", accessLevel: "operator", geoType: "Store", geoName: "465", active: true },
  { id: "u5", name: "Priya Das", email: "priya@apnamart.in", role: "Store Ops Lead", accessLevel: "admin", geoType: "State", geoName: "Jharkhand, West Bengal", active: true },
];

export const SEED_ROLES: Role[] = [
  { id: "r-owner", name: "Owner", parent: null, metrics: ["Fill Rate", "Serviceability %", "Surge %", "Rider Avail", "Picker Drop", "Rider Discipline"] },
  { id: "r-admin", name: "Admin", parent: "r-owner", metrics: ["Fill Rate", "Serviceability %", "Surge %", "Rider Avail", "Picker Drop", "Rider Discipline"] },
  { id: "r1", name: "Ops Head", parent: "r-admin", metrics: ["Fill Rate", "Serv %", "Surge %", "Rider Avail", "Picker Drop", "Rider Discipline"] },
  { id: "r2", name: "Rider Ops Lead", parent: "r1", metrics: ["Serv %", "Surge %", "Rider Avail", "Rider Discipline"] },
  { id: "r3", name: "Store Ops Lead", parent: "r1", metrics: ["Fill Rate", "Picker Drop"] },
  { id: "r4", name: "Fleet Manager", parent: "r2", metrics: ["Rider Login", "Rider Avail", "Rider Discipline"] },
  { id: "r5", name: "Area Manager", parent: "r3", metrics: ["Fill Rate", "Picker Drop"] },
  { id: "r6", name: "Satellite Manager", parent: "r5", metrics: ["Fill Rate", "Picker Drop", "Picker Performance"] },
];

export const SEED_CONNECTORS: Connector[] = [
  { id: "c-mirror", name: "Mirror PG", type: "postgres", config: { host: "mirror.prod.apnamart.in", port: "5432", database: "apna_ops", user: "apnaops_ro" }, secretRef: "vault://apnaops/mirror-pg/ro", status: "connected", lastTestedAt: "2026-05-25 06:00", active: true },
  { id: "c-bq", name: "BigQuery", type: "bigquery", config: { project: "apnamart-prod", dataset: "ops_dwh" }, secretRef: "vault://apnaops/bq/service-account", status: "connected", lastTestedAt: "2026-05-25 06:00", active: true },
];

export const SEED_METRICS: Metric[] = [
  { id: "m1", name: "Fill Rate", dataSource: "Mirror PG", baseTables: "orders, order_items, stock_snapshots", stdGran: "Store × Item · daily", refreshInterval: "1h", dimensions: ["geo", "time"], ownerRoles: ["Satellite Manager", "Area Manager"], active: true },
  { id: "m2", name: "Serviceability %", dataSource: "Mirror PG", baseTables: "orders, rider_logins", stdGran: "Store × Hour", refreshInterval: "15m", dimensions: ["geo", "time"], ownerRoles: ["Fleet Manager"], active: true },
  { id: "m3", name: "Surge %", dataSource: "Mirror PG", baseTables: "orders", stdGran: "Store × Hour", refreshInterval: "15m", dimensions: ["geo", "time"], ownerRoles: ["Fleet Manager"], active: true },
  { id: "m4", name: "Rider Avail", dataSource: "Mirror PG", baseTables: "rider_logins", stdGran: "Rider × Hour", refreshInterval: "15m", dimensions: ["geo", "time"], ownerRoles: ["Fleet Manager", "Rider Ops Lead"], active: true },
  { id: "m5", name: "Picker Drop", dataSource: "BigQuery", baseTables: "picker_actions, order_items", stdGran: "Picker × Item × Day", refreshInterval: "1h", dimensions: ["geo", "time"], ownerRoles: ["Satellite Manager"], active: true },
  { id: "m6", name: "Rider Discipline", dataSource: "Mirror PG", baseTables: "rider_attendance", stdGran: "Rider × Week", refreshInterval: "daily", dimensions: ["geo", "time"], ownerRoles: ["Fleet Manager"], active: true },
];

export const SEED_THRESHOLDS: Threshold[] = [
  { id: "t1", metric: "Fill Rate", tier: "P0", operator: "lt", value: 96, scopeType: "Global", updatedAt: "2026-05-25 10:00", updatedBy: "Ritul" },
  { id: "t2", metric: "Fill Rate", tier: "P1", operator: "between", value: 96, value2: 98, scopeType: "Global", updatedAt: "2026-05-25 10:00", updatedBy: "Ritul" },
  { id: "t3", metric: "Serviceability %", tier: "P0", operator: "lt", value: 92, scopeType: "Global", updatedAt: "2026-05-25 10:00", updatedBy: "Ritul" },
  { id: "t4", metric: "Picker Drop", tier: "P1", operator: "gt", value: 5, scopeType: "Global", updatedAt: "2026-05-25 10:00", updatedBy: "Ritul" },
];

export const SEED_DIMENSIONS: Dimension[] = [
  { id: "geo", name: "Geography", type: "geo", levels: ["Global", "State", "City", "Store"], values: { Global: ["Global"], State: ["Jharkhand", "West Bengal", "Chhattisgarh"], City: ["Hazaribagh", "Jamshedpur", "Ranchi", "Asansol", "Durgapur", "Kolkata", "Bilaspur", "Korba", "Raipur"], Store: ["Lalpur RNC (280)", "Upper Hatia Rd (465)", "Hooghly St Rd KOL (396)", "Devendra Nagar RPR (311)"] }, lastCrawled: "2026-05-25 09:00" },
  { id: "time", name: "Time", type: "time", levels: ["Year", "Quarter", "Month", "Week", "Day", "Hour"], values: { Year: ["2026", "2025", "2024"], Quarter: ["Q1", "Q2", "Q3", "Q4"], Day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] }, lastCrawled: "2026-05-25 09:00" },
  { id: "channel", name: "Channel", type: "channel", levels: ["Channel"], values: { Channel: ["Online", "Offline"] }, lastCrawled: "2026-05-23 14:00" },
];

export const SEED_STANDUPS: Standup[] = [
  { id: "sd1", name: "Daily Ops Standup · Ranchi", time: "09:30", timezone: "IST", cadence: "Weekdays", meetLink: "https://meet.google.com/abc-defg-hij", meetingId: "gcal_abc", attendees: ["u0", "u1", "u3", "u5"], lastSyncedAt: "2026-05-24 06:00", syncDirty: false },
  { id: "sd2", name: "Rider Ops Daily", time: "11:00", timezone: "IST", cadence: "Daily", meetLink: "https://meet.google.com/xyz-rstu-vwx", meetingId: "gcal_xyz", attendees: ["u0", "u3"], lastSyncedAt: "2026-05-24 06:00", syncDirty: false },
];

export const SEED_ISSUES: Issue[] = [
  { id: "i1", metric: "Fill Rate", locId: "st_280", severity: "p0", value: "94.2%", delta: "-3.6pp vs yest", threshold: "<98%", transition: "above_to_below", transitionLabel: "Above → Below", what: "Picker shortage 11–14h (2 of 4 logged in); 12 dairy SKUs OOS", fix: "S-04: reassign picker from Argora 12–15h, prioritise dairy restock by 16:00", owner: "Rohit Kumar", forUser: true, hypotheses: [{ h: "Picker shortage 11–14h (2 of 4 logged in)", c: 0.74 }, { h: "High SKU drop on dairy category (12 SKUs OOS)", c: 0.58 }, { h: "Order spike from promo push at 12:30", c: 0.31 }], actionDraft: "Reassign picker @Vikram from Argora 12–15h · Restock dairy SKUs (12) by 16:00", status: null, openedAt: tsMinus(3, 0), updatedAt: tsMinus(0, 2), comments: [{ id: "c1_1", userId: "u3", userName: "Anita Roy", ts: tsMinus(0, 4), text: "@Vikram Singh I can pull a rider from Argora 12–15h. Need a confirm from store.", edited: false }, { id: "c1_2", userId: "u2", userName: "Vikram Singh", ts: tsMinus(0, 3), text: "Confirmed. Sending Aman over. Dairy restock truck arrives 15:30.", edited: false }] },
  { id: "i2", metric: "Serviceability %", locId: "st_465", severity: "p1", value: "95.3%", delta: "-1.4pp vs yest", threshold: "94–96%", transition: "above_to_below", transitionLabel: "Above → Below", what: "Surge fell short — 4 of 7 required riders logged in; rain 13:00–14:30", fix: "S-11: activate 3 standby riders; surge incentive 14–18h", owner: "Anita Roy", forUser: true, hypotheses: [{ h: "Surge fell short — only 4 of 7 required riders logged in", c: 0.81 }, { h: "Rain in Hatia 13:00–14:30 affecting delivery times", c: 0.42 }], actionDraft: "Activate 3 standby riders for Hatia · Apply surge incentive 14–18h", status: null, openedAt: tsMinus(1, 0), updatedAt: tsMinus(0, 5), comments: [] },
  { id: "i3", metric: "Rider Discipline", locId: "JH_ranchi", severity: "p1", value: "2 defaulters", delta: "+1 vs last week", threshold: ">1 miss / 7d", transition: "below_to_worse", transitionLabel: "Worsening", what: "Rider #4521: 3 no-shows Wed/Thu; Rider #4738: 2 late logins", fix: "S-07: replacement for #4521 (HR handoff); verbal warning for #4738", owner: "Anita Roy", forUser: true, hypotheses: [{ h: "Rider #4521 — 3 no-shows this week; pattern: Wed/Thu", c: 0.92 }], actionDraft: "Replace #4521 (HR handoff) · Warn #4738, recheck next Mon", status: null, openedAt: tsMinus(5, 0), updatedAt: tsMinus(0, 18), comments: [] },
  { id: "i4", metric: "Picker Drop", locId: "st_270", severity: "p1", value: "7.2%", delta: "+2.3pp vs yest", threshold: ">5%", transition: "below_to_worse", transitionLabel: "Worsening", what: "Bakery SKU mis-pick pattern — 3 of 5 pickers contributing", fix: "S-19: bakery-category retraining for affected pickers this week", owner: "Vikram Singh", forUser: false, hypotheses: [{ h: "Bakery SKU mis-pick pattern", c: 0.78 }], actionDraft: "Schedule bakery retraining", status: null, openedAt: tsMinus(2, 0), updatedAt: tsMinus(0, 9), comments: [] },
  { id: "i5", metric: "Fill Rate", locId: "st_274", severity: "p1", value: "98.6%", delta: "-0.6pp vs yest", threshold: "98–99%", transition: "above_to_below", transitionLabel: "Above → Below", what: "Trending down 3 days · approaching P0", fix: "S-04: pre-emptive restock + picker reshuffle", owner: "Vikram Singh", forUser: true, hypotheses: [{ h: "Stock-out trending up across snacks category", c: 0.55 }], actionDraft: "Pre-emptive restock · Reshuffle pickers", status: null, openedAt: tsMinus(3, 0), updatedAt: tsMinus(0, 14), comments: [] },
  { id: "i6", metric: "Serviceability %", locId: "st_311", severity: "p1", value: "93.0%", delta: "-1.5pp vs yest", threshold: "94–96%", transition: "below_to_worse", transitionLabel: "Worsening", what: "Rider shortfall during peak — 2 below required", fix: "S-13: standby pool for next 3 evenings", owner: "Anita Roy", forUser: false, hypotheses: [{ h: "Rider shortfall peak hours", c: 0.71 }], actionDraft: "Activate standby pool · 3 evenings", status: null, openedAt: tsMinus(1, 0), updatedAt: tsMinus(0, 4), comments: [] },
  { id: "i7", metric: "Fill Rate", locId: "st_396", severity: "ok", value: "99.1%", delta: "+1.0pp vs yest", threshold: "<98%", transition: "below_to_better", transitionLabel: "Recovering", what: "Recovered above threshold after restock action yesterday", fix: "No action needed · log outcome for Rule Book", owner: "Manoj Verma", forUser: false, hypotheses: [{ h: "Restock action S-04 yielded result", c: 0.88 }], actionDraft: "Log outcome · close issue", status: null, openedAt: tsMinus(4, 0), updatedAt: tsMinus(0, 20), comments: [] },
  { id: "i8", metric: "Surge %", locId: "st_290", severity: "p1", value: "17.2%", delta: "+2.4pp vs yest", threshold: ">15%", transition: "above_to_below", transitionLabel: "Above → Below", what: "Demand spike 18:00–20:00, rider supply lag", fix: "S-13: standby pool activation + surge incentive", owner: "Anita Roy", forUser: false, hypotheses: [{ h: "Demand spike 18:00–20:00", c: 0.76 }], actionDraft: "Activate standby · evening surge", status: null, openedAt: tsMinus(0, 1), updatedAt: tsMinus(0, 1), comments: [] },
];

export const SEED_ACTIONABLES: Actionable[] = [
  { title: "Restock Amul Toned Milk 1L — Lalpur RNC", owner: "You", due: "Today", lastUpdate: "Marked in-progress at 19:40", ago: "18h", sev: "p1", locId: "st_280" },
  { title: "Investigate fill rate drop — Pe Pee Compound", owner: "Vikram", due: "Today", lastUpdate: "No update yet", ago: "24h", sev: "p0", locId: "st_274" },
  { title: "Onboard 2 new riders — Hatia zone", owner: "Fleet Mgr Anita", due: "24 May", lastUpdate: "1 onboarded, 1 pending", ago: "4h", sev: "muted", locId: "st_465" },
];

export const SEED_AGENTS: AgentDef[] = [
  { id: "a-eval", isSystem: true, name: "Evaluation engine", description: "Tag state + transition against thresholds. Opens Issues on breach.", trigger: "cron", kind: "cron", schedule: "every 10 min", context: ["Snapshot store", "Ontology DB (thresholds)", "Locations"], instructions: "Every cycle, fetch latest snapshot for each enabled (metric × location). Compare against active threshold. If transition crosses threshold, open Issue.", rules: ["Never duplicate Issues for same (metric × location).", "Skip stale locations; flag instead.", "For P0 transitions, enqueue immediate notification."], knowledge: ["HLD §1.4 Agent Layer"], outputs: ["Issues + RCAs", "Audit log"], lastRun: "2m ago", status: "success", paused: false },
  { id: "a-rca", isSystem: true, name: "RCA agent", description: "Walks data + Rule Book + Outline. Produces ranked hypotheses.", trigger: "event", kind: "oneshot", schedule: "per Issue (one-shot)", context: ["Snapshot store", "Rule Book", "Outline workspace"], instructions: "When an Issue opens, load ±2h snapshot. Search Rule Book for similar patterns. Pull Outline context. Produce ranked hypotheses with confidence + evidence.", rules: ["Cite snapshot rows or Rule Book entry as evidence.", "Cap hypotheses at 5."], knowledge: ["Rule Book", "Outline · AI Systems"], outputs: ["RCARun on the Issue", "Audit log"], lastRun: "1m ago", status: "success", paused: false },
  { id: "a-sol", isSystem: true, name: "Solution agent", description: "Matches RCARun to Rule Book entry; drafts candidate when nothing matches.", trigger: "event", kind: "oneshot", schedule: "per RCARun", context: ["RCARun", "Rule Book"], instructions: "Given RCARun, look up top hypothesis and search Rule Book. If match, attach as Suggestion. Else draft a candidate.", rules: ["Drafted candidates never auto-promote.", "If multiple matches, pick highest success_rate."], knowledge: ["Rule Book schema"], outputs: ["Suggestion", "Rule Book candidate"], lastRun: "1m ago", status: "success", paused: false },
  { id: "a-brief", isSystem: true, name: "Briefing assembler", description: "Packs each user's My Home: open issues + RCAs + standups.", trigger: "cron", kind: "cron", schedule: "T-15 + daily 06:00 IST", context: ["Issues + RCAs", "Standups", "Users"], instructions: "For each user, build personalised My Home: today's standups + open issues in their (role × geo) + RCAs.", rules: ["Never include issues outside user's scope.", "Cap shown issues at 10."], knowledge: ["HLD §3.3"], outputs: ["My Home payload"], lastRun: "45m ago", status: "success", paused: false },
  { id: "a-cal", isSystem: true, name: "Calendar-sync agent", description: "Creates Meet links and invites attendees on Sync Meetings click.", trigger: "event", kind: "oneshot", schedule: "admin clicks Sync Meetings", context: ["Standups", "Users"], instructions: "For each Standup without meet_link, call Google Calendar API. Add attendees. Capture Meet URL + last_synced_at.", rules: ["Retry 3× on rate-limit.", "Never re-create if meet_link exists — only update attendees."], knowledge: ["Google Calendar API"], outputs: ["Standup updated"], lastRun: "2h ago", status: "success", paused: false },
  { id: "a-status", isSystem: true, name: "Status-update agent", description: "Captures user clicks on issue action buttons.", trigger: "event", kind: "oneshot", schedule: "per click", context: ["Issues", "My Actions"], instructions: "On click, update Issue status and append My Actions entry. Feed Rule Book candidate when relevant.", rules: ["Never override owner without reassign payload."], knowledge: ["Issue state machine"], outputs: ["Issue", "My Actions", "Rule Book candidate"], lastRun: "5m ago", status: "success", paused: false },
  { id: "a-rb", isSystem: true, name: "Rule Book editor agent", description: "Captures Edit RCA / Edit Fix as Rule Book candidate.", trigger: "event", kind: "oneshot", schedule: "per edit", context: ["Issues", "Rule Book"], instructions: "Capture user edit as candidate; queue for curation.", rules: ["Never overwrite a standard entry directly."], knowledge: ["Rule Book schema"], outputs: ["Rule Book candidate"], lastRun: "12m ago", status: "success", paused: false },
  { id: "a-chase", isSystem: true, name: "Chase agent", description: "Nudges stalled actionables.", trigger: "worker", kind: "worker", schedule: "continuous loop", context: ["Actionables", "Users"], instructions: "Watch for actionables stalled > SLA. Send nudges (Slack/Email).", rules: ["Cap nudges at 2/day per owner."], knowledge: [], outputs: ["Slack / Email"], lastRun: "3m ago", status: "success", paused: false },
  { id: "a-ot", isSystem: true, name: "Outcome tracker", description: "Correlates applied fix to metric recovery.", trigger: "cron", kind: "cron", schedule: "every 30 min", context: ["Issues", "Snapshot store", "Rule Book"], instructions: "Watch post-fix metric movement. Update success_rate on Rule Book entries.", rules: ["Window of 24h for recovery measurement."], knowledge: [], outputs: ["Rule Book success_rate"], lastRun: "20m ago", status: "success", paused: false },
  { id: "a-cur", isSystem: true, name: "Curation worker", description: "Promotes high-confidence Rule Book drafts.", trigger: "cron", kind: "cron", schedule: "nightly", context: ["Rule Book"], instructions: "At 02:00 IST, promote drafts with success_rate ≥ threshold to standard.", rules: ["Never auto-demote without manual override."], knowledge: [], outputs: ["Rule Book promotions"], lastRun: "12h ago", status: "success", paused: false },
  { id: "a-dc", isSystem: true, name: "Dimension crawler", description: "Re-reads source tables to refresh dimension value lists.", trigger: "cron", kind: "cron", schedule: "nightly", context: ["Dimensions", "Source tables"], instructions: "Read source tables. Diff against current values. Update.", rules: ["Skip dimensions marked manual."], knowledge: [], outputs: ["Dimensions"], lastRun: "12h ago", status: "success", paused: false },
  { id: "a-conn-fr", isSystem: true, name: "Connector · Fill Rate", description: "Pulls Fill Rate snapshots.", trigger: "cron", kind: "cron", schedule: "every 1 h", context: ["Mirror PG"], instructions: "Per metric.refresh_interval, fetch + map + write to snapshot store.", rules: ["Schema drift → alert; backfill on miss."], knowledge: [], outputs: ["Snapshot store"], lastRun: "12m ago", status: "success", paused: false },
  { id: "a-conn-srv", isSystem: true, name: "Connector · Serviceability %", description: "Pulls Serviceability snapshots.", trigger: "cron", kind: "cron", schedule: "every 15 min", context: ["Mirror PG"], instructions: "Per metric.refresh_interval, fetch + write.", rules: ["Schema drift → alert."], knowledge: [], outputs: ["Snapshot store"], lastRun: "2m ago", status: "success", paused: false },
  { id: "a-conn-pd", isSystem: true, name: "Connector · Picker Drop", description: "Pulls Picker Drop snapshots.", trigger: "cron", kind: "cron", schedule: "every 1 h", context: ["BigQuery"], instructions: "Per metric.refresh_interval, fetch + write.", rules: ["BQ rate-limit backoff, max 5 retries."], knowledge: [], outputs: ["Snapshot store"], lastRun: "30m ago", status: "success", paused: false },
  { id: "a-roll", isSystem: true, name: "Daily-log roller", description: "Creates today's daily-log doc; locks yesterday's.", trigger: "cron", kind: "cron", schedule: "00:00 IST daily", context: ["Outline workspace"], instructions: "Each day at midnight, create today's sub-doc from template; switch yesterday's to read-only.", rules: ["Never re-create today's doc if exists."], knowledge: ["Outline doc schema"], outputs: ["Outline writeback"], lastRun: "17h ago", status: "success", paused: false },
];

export const SEED_ACTIONS: MyActionEntry[] = [
  { ts: "2026-05-24 09:18", kind: "resolved", text: "Marked issue resolved · Fill Rate at Lalpur RNC (280)", meta: "P0 issue · fix S-04 applied", issueId: "i1" },
  { ts: "2026-05-24 09:05", kind: "issue", text: "Working on it · Serv % at Upper Hatia Rd Hatia RNC (465)", meta: "P1 issue", issueId: "i2" },
  { ts: "2026-05-24 08:50", kind: "actionable", text: "Updated actionable · Restock Amul Toned Milk 1L — Lalpur", meta: "In progress · 18h since update", issueId: "i1" },
  { ts: "2026-05-24 08:42", kind: "editrca", text: "Accepted RCA suggestion · Picker shortage at Lalpur", meta: "Agent confidence 74%", issueId: "i1" },
  { ts: "2026-05-23 19:40", kind: "actionable", text: "Created actionable · Restock Amul Toned Milk 1L — Lalpur", meta: "Due today · assigned to me", issueId: "i1" },
  { ts: "2026-05-23 18:30", kind: "standup", text: "Joined Daily Ops Standup · Ranchi", meta: "09:30 IST · 22m" },
  { ts: "2026-05-23 14:15", kind: "role", text: "Edited role · Area Manager — added Picker Drop metric", meta: "Setup change" },
  { ts: "2026-05-23 12:00", kind: "threshold", text: "Created threshold · Fill Rate P0 < 96% for Tier-2 cities", meta: "Scope: Bokaro, Dhanbad" },
  { ts: "2026-05-23 11:05", kind: "rejected", text: "Rejected agent issue · 'Demand spike at Kanke' — not valid", meta: "Feedback recorded for Rule Book" },
  { ts: "2026-05-22 18:00", kind: "standup", text: "Joined Rider Ops Daily", meta: "11:00 IST · 18m" },
  { ts: "2026-05-22 10:30", kind: "user", text: "Added user · Manoj Verma (Area Manager · Bokaro, Dhanbad)", meta: "Setup change" },
];
