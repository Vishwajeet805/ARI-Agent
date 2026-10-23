/** Core domain types for the DayPilot demo agent. All state lives in the browser. */

export interface Task {
  id: string;
  title: string;
  minutes: number;
  done: boolean;
  source: "agent" | "seed" | "user";
}

export interface GroceryItem {
  id: string;
  name: string;
  done: boolean;
  suggested: boolean;
}

export interface BreakSlot {
  id: string;
  title: string;
  minutes: number;
  startsAt: string; // ISO timestamp
}

export interface AppState {
  tasks: Task[];
  groceries: GroceryItem[];
  groceryTitle: string;
  breaks: BreakSlot[];
}

export type ToolName = "addTask" | "createShoppingList" | "scheduleBreak";

export type ToolArgs =
  | { tool: "addTask"; title: string; minutes: number }
  | { tool: "createShoppingList"; title: string; servings: number; items: string[] }
  | { tool: "scheduleBreak"; title: string; minutes: number; afterMinutes: number };

export interface PlanStep {
  id: string;
  title: string;
  enabled: boolean;
  /** User-facing rationale (a summary, not hidden reasoning). */
  rationale: string;
  args: ToolArgs;
}

export interface Plan {
  request: string;
  summary: string;
  steps: PlanStep[];
}

export type StepStatus = "queued" | "running" | "done" | "skipped" | "failed";

export interface ActivityEntry {
  stepId: string;
  title: string;
  tool: ToolName;
  status: StepStatus;
  input: string;
  output?: string;
}
