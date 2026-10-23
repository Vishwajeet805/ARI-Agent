/**
 * App-local tools the demo agent can call. Each tool is a pure function:
 * (state, args) => { state, output }. They only mutate in-app state.
 */
import type { AppState, ToolArgs } from "./types";

export interface ToolResult {
  state: AppState;
  output: string;
}

const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`;

export function addTask(state: AppState, a: Extract<ToolArgs, { tool: "addTask" }>): ToolResult {
  if (a.minutes <= 0 || a.minutes > 600) throw new Error("Duration must be between 1 and 600 minutes.");
  const task = { id: uid("task"), title: a.title, minutes: a.minutes, done: false, source: "agent" as const };
  return { state: { ...state, tasks: [task, ...state.tasks] }, output: `Task "${a.title}" added (${a.minutes} min).` };
}

export function createShoppingList(
  state: AppState,
  a: Extract<ToolArgs, { tool: "createShoppingList" }>,
): ToolResult {
  const existing = new Set(state.groceries.map((g) => g.name.toLowerCase()));
  const fresh = a.items
    .filter((n) => !existing.has(n.toLowerCase()))
    .map((name) => ({ id: uid("item"), name, done: false, suggested: true }));
  return {
    state: { ...state, groceryTitle: a.title, groceries: [...fresh, ...state.groceries] },
    output: `List "${a.title}" ready with ${fresh.length} new item${fresh.length === 1 ? "" : "s"}.`,
  };
}

export function scheduleBreak(state: AppState, a: Extract<ToolArgs, { tool: "scheduleBreak" }>, now = new Date()): ToolResult {
  const offset = a.afterMinutes > 0 ? a.afterMinutes : 15;
  const start = new Date(now.getTime() + offset * 60_000);
  start.setSeconds(0, 0);
  start.setMinutes(Math.ceil(start.getMinutes() / 5) * 5);
  const slot = { id: uid("break"), title: a.title, minutes: a.minutes, startsAt: start.toISOString() };
  const time = start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return {
    state: { ...state, breaks: [...state.breaks, slot].sort((x, y) => x.startsAt.localeCompare(y.startsAt)) },
    output: `${a.minutes}-minute break added at ${time}.`,
  };
}

/** Dispatch a tool call by name. */
export function runTool(state: AppState, args: ToolArgs): ToolResult {
  switch (args.tool) {
    case "addTask": return addTask(state, args);
    case "createShoppingList": return createShoppingList(state, args);
    case "scheduleBreak": return scheduleBreak(state, args);
  }
}

export function describeInput(args: ToolArgs): string {
  const { tool, ...rest } = args;
  void tool;
  return JSON.stringify(rest);
}


/** Parse persisted browser data defensively; invalid/legacy shapes fall back to sample state. */
export function restoreState(raw: string | null): AppState {
  if (!raw) return seedState();
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return seedState();
    const candidate = value as Partial<AppState>;
    if (!Array.isArray(candidate.tasks) || !Array.isArray(candidate.groceries) || !Array.isArray(candidate.breaks)) return seedState();

    const tasks = candidate.tasks.filter((item): item is AppState["tasks"][number] => {
      if (!item || typeof item !== "object") return false;
      const t = item as AppState["tasks"][number];
      return typeof t.id === "string" && typeof t.title === "string" &&
        Number.isFinite(t.minutes) && t.minutes > 0 && typeof t.done === "boolean" &&
        (t.source === "agent" || t.source === "seed" || t.source === "user");
    });
    const groceries = candidate.groceries.filter((item): item is AppState["groceries"][number] => {
      if (!item || typeof item !== "object") return false;
      const g = item as AppState["groceries"][number];
      return typeof g.id === "string" && typeof g.name === "string" &&
        typeof g.done === "boolean" && typeof g.suggested === "boolean";
    });
    const breaks = candidate.breaks.filter((item): item is AppState["breaks"][number] => {
      if (!item || typeof item !== "object") return false;
      const b = item as AppState["breaks"][number];
      return typeof b.id === "string" && typeof b.title === "string" &&
        Number.isFinite(b.minutes) && b.minutes > 0 && typeof b.startsAt === "string" &&
        Number.isFinite(Date.parse(b.startsAt));
    });
    return {
      tasks: tasks.slice(0, 100),
      groceries: groceries.slice(0, 200),
      breaks: breaks.slice(0, 50),
      groceryTitle: typeof candidate.groceryTitle === "string" ? candidate.groceryTitle.slice(0, 100) : "Groceries",
    };
  } catch {
    return seedState();
  }
}

export function seedState(): AppState {
  return {
    tasks: [
      { id: "seed-1", title: "Review lecture notes", minutes: 20, done: true, source: "seed" },
      { id: "seed-2", title: "Reply to project group chat", minutes: 10, done: false, source: "seed" },
    ],
    groceryTitle: "Groceries",
    groceries: [{ id: "seed-g1", name: "Oat milk", done: false, suggested: false }],
    breaks: [],
  };
}
