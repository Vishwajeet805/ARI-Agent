/**
 * Deterministic, rule-based demo planner.
 * Turns a natural-language request into tool steps using keyword + regex rules.
 * No LLM, no network: it is intentionally transparent and predictable for demos.
 */
import type { Plan, PlanStep, ToolArgs } from "./types";

export const DEMO_PROMPT =
  "Help me get ready for tonight: plan 45 minutes to finish my assignment, make a simple dinner grocery list for two, and schedule a 10-minute break.";

export const DEFAULT_DINNER_ITEMS = ["Pasta", "Tomatoes", "Spinach", "Garlic", "Parmesan"];

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
};

let counter = 0;
const stepId = () => `step-${Date.now().toString(36)}-${(counter++).toString(36)}`;

function minutesIn(text: string): number | undefined {
  const m = text.match(/(\d{1,3})\s*(?:-|\s)?\s*(?:min(?:ute)?s?|m\b)/i);
  if (m) return Number(m[1]);
  const h = text.match(/(\d{1,2}(?:\.\d)?)\s*(?:-|\s)?\s*(?:hours?|hrs?|h\b)/i);
  if (h) return Math.round(Number(h[1]) * 60);
  if (/half an hour/i.test(text)) return 30;
  if (/an hour/i.test(text)) return 60;
  return undefined;
}

function servingsIn(text: string): number {
  const m = text.match(/for\s+(\d+|one|two|three|four|five|six|seven|eight)\b/i);
  if (!m) return 2;
  const v = m[1].toLowerCase();
  return NUMBER_WORDS[v] ?? (Number(v) || 2);
}

function capitalize(s: string) {
  const t = s.trim().replace(/[.!?]+$/, "");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Split a request into clauses ("A, B, and C" / "A; B" / "A then B"). */
export function splitClauses(request: string): string[] {
  const body = request.includes(":") ? request.slice(request.indexOf(":") + 1) : request;
  return body
    .split(/,|;|\bthen\b|\band\b(?=\s+(?:make|schedule|add|plan|create|book|set|buy|get|take|remind))/i)
    .map((c) => c.replace(/^\s*(and|also|please)\s+/i, "").trim())
    .filter((c) => c.length > 2);
}

function classify(clause: string): ToolArgs | null {
  const c = clause.toLowerCase();
  if (/\b(grocery|groceries|shopping|ingredients|buy)\b/.test(c)) {
    const withMatch = clause.match(/\bwith\s+(.+)$/i);
    const items = withMatch
      ? withMatch[1].split(/\s*(?:,|\band\b|&)\s*/).map(capitalize).filter(Boolean)
      : DEFAULT_DINNER_ITEMS;
    const servings = servingsIn(clause);
    const meal = /\bdinner\b/.test(c) ? "Dinner" : /\blunch\b/.test(c) ? "Lunch" : "Groceries";
    return { tool: "createShoppingList", title: `${meal} for ${servings}`, servings, items };
  }
  if (/\b(break|rest|pause|walk|stretch)\b/.test(c)) {
    return { tool: "scheduleBreak", title: "Recharge break", minutes: minutesIn(clause) ?? 10, afterMinutes: 0 };
  }
  if (/\b(task|finish|work|study|focus|write|read|review|assignment|plan|complete|prepare)\b/.test(c)) {
    const toMatch = clause.match(/\bto\s+(.+)$/i);
    let title = toMatch ? toMatch[1] : clause.replace(/^(plan|add|create)\s+(a\s+)?(task\s+)?/i, "");
    title = title.replace(/\d+\s*-?\s*(minutes?|mins?|hours?)\s*(of|for)?/i, "").trim();
    return { tool: "addTask", title: capitalize(title || "Focused work"), minutes: minutesIn(clause) ?? 25 };
  }
  return null;
}

function stepTitle(a: ToolArgs): string {
  switch (a.tool) {
    case "addTask": return `Create a ${a.minutes}-minute focus task: ${a.title}`;
    case "createShoppingList": return `Make a grocery checklist — ${a.title.toLowerCase()}`;
    case "scheduleBreak": return `Schedule a ${a.minutes}-minute break`;
  }
}

function rationale(a: ToolArgs): string {
  switch (a.tool) {
    case "addTask": return `You asked for ${a.minutes} minutes of focused work, so I'll block it as a task.`;
    case "createShoppingList":
      return a.items === DEFAULT_DINNER_ITEMS
        ? `No ingredients given — I'll suggest a simple pasta dinner for ${a.servings} you can edit.`
        : `I'll add the ${a.items.length} items you mentioned.`;
    case "scheduleBreak":
      return a.afterMinutes
        ? `Placed right after your focus block so you can reset.`
        : `Placed shortly from now in your in-app schedule.`;
  }
}

/** Build a plan. Returns null steps array when nothing was understood. */
export function planRequest(request: string): Plan {
  const args = splitClauses(request).map(classify).filter((a): a is ToolArgs => a !== null);
  const focus = args.reduce((n, a) => (a.tool === "addTask" ? n + a.minutes : n), 0);
  const steps: PlanStep[] = args.map((a) => {
    const finalArgs = a.tool === "scheduleBreak" ? { ...a, afterMinutes: focus } : a;
    return { id: stepId(), title: stepTitle(finalArgs), enabled: true, rationale: rationale(finalArgs), args: finalArgs };
  });
  const summary = steps.length
    ? `I found ${steps.length} thing${steps.length > 1 ? "s" : ""} to do. Review the plan, adjust anything, then run it.`
    : "I couldn't match that to a task, grocery list, or break. Try mentioning minutes, groceries, or a break.";
  return { request, summary, steps };
}
