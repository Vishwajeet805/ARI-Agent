/**
 * Deterministic, offline planner for DayPilot's simulated assistant.
 * It only proposes app-local task, grocery, and break actions; no LLM/network.
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

function bounded(value: number, min: number, max: number, fallback: number): number {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : fallback;
}

function minutesIn(text: string): number | undefined {
  const m = text.match(/\b(\d{1,4})\s*(?:-|\s)?\s*(?:min(?:ute)?s?|m\b)/i);
  if (m) return bounded(Number(m[1]), 1, 240, 25);
  const h = text.match(/\b(\d{1,2}(?:\.\d)?)\s*(?:-|\s)?\s*(?:hours?|hrs?|h\b)/i);
  if (h) return bounded(Number(h[1]) * 60, 1, 240, 25);
  if (/\bhalf an hour\b/i.test(text)) return 30;
  if (/\ban hour\b/i.test(text)) return 60;
  return undefined;
}

function servingsIn(text: string): number {
  const m = text.match(/\bfor\s+(\d+|one|two|three|four|five|six|seven|eight)\b/i);
  if (!m) return 2;
  const raw = (m[1] ?? "").toLowerCase();
  return bounded(NUMBER_WORDS[raw] ?? Number(raw), 1, 12, 2);
}

function cleanTitle(s: string): string {
  const t = s.trim().replace(/[.!?]+$/, "").replace(/\s+/g, " ");
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
}

/**
 * Split only at likely action boundaries. Commas inside an ingredient list
 * stay intact: "shopping list with pasta, tomatoes and spinach".
 */
export function splitClauses(request: string): string[] {
  const trimmed = request.trim();
  if (!trimmed) return [];
  const body = trimmed.replace(/^.{1,80}?\s*:\s*/s, (prefix) => prefix.includes(":") ? "" : prefix);
  return body
    .split(/;|\bthen\b|,(?=\s*(?:and\s+)?(?:please\s+)?(?:make|schedule|add|plan|create|book|set|buy|get|take|remind|finish|study|work|review|write)\b)|\band\b(?=\s+(?:make|schedule|add|plan|create|book|set|buy|get|take|remind)\b)/i)
    .map((part) => part.replace(/^\s*(?:and|also|please)\s+/i, "").trim())
    .filter((part) => part.length > 2);
}

function parseItems(clause: string): string[] | undefined {
  const match = clause.match(/\b(?:with|including|items?\s*:\s*|list\s+of)\s+(.+)$/i);
  if (!match?.[1]) return undefined;
  const raw = match[1]
    .replace(/\bfor\s+(?:\d+|one|two|three|four|five|six|seven|eight)\b.*$/i, "")
    .replace(/\b(?:for\s+dinner|for\s+lunch)\b.*$/i, "")
    .trim();
  const items = raw.split(/\s*(?:,|\band\b|&)\s*/i).map(cleanTitle).filter(Boolean);
  return items.length ? [...new Set(items)] : undefined;
}

function classify(clause: string): ToolArgs | null {
  const c = clause.toLowerCase();

  if (/\b(grocery|groceries|shopping\s+list|ingredients)\b/.test(c)) {
    const servings = servingsIn(clause);
    const meal = /\bdinner\b/.test(c) ? "Dinner" : /\blunch\b/.test(c) ? "Lunch" : "Groceries";
    return { tool: "createShoppingList", title: `${meal} for ${servings}`, servings, items: parseItems(clause) ?? [...DEFAULT_DINNER_ITEMS] };
  }

  if (/\b(break|rest|pause|walk|stretch)\b/.test(c)) {
    return { tool: "scheduleBreak", title: "Recharge break", minutes: bounded(minutesIn(clause) ?? 10, 1, 60, 10), afterMinutes: 0 };
  }

  if (/\b(task|finish|work|study|focus|write|read|review|assignment|complete|prepare)\b/.test(c)) {
    const toMatch = clause.match(/\bto\s+(.+)$/i);
    let title = toMatch?.[1] ?? clause.replace(/^(?:please\s+)?(?:plan|add|create|schedule)\s+(?:a\s+)?(?:task\s+)?/i, "");
    title = title.replace(/\b\d+\s*-?\s*(?:minutes?|mins?|hours?|hrs?)\s*(?:of|for)?\b/i, "").trim();
    return { tool: "addTask", title: cleanTitle(title) || "Focused work", minutes: bounded(minutesIn(clause) ?? 25, 1, 240, 25) };
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
    case "addTask": return `You asked for ${a.minutes} minutes of focused work, so I'll add it as a task.`;
    case "createShoppingList":
      return a.items.join("|") === DEFAULT_DINNER_ITEMS.join("|")
        ? `No ingredients given — I'll suggest a simple pasta dinner for ${a.servings} you can edit.`
        : `I'll add the ${a.items.length} items you mentioned.`;
    case "scheduleBreak":
      return a.afterMinutes ? "Placed after your planned focus work." : "Added to your in-app schedule; no device notification is sent.";
  }
}

/** Build a proposed plan; unsupported text intentionally produces zero steps. */
export function planRequest(request: string): Plan {
  const safeRequest = request.trim().slice(0, 2000);
  const args = splitClauses(safeRequest).map(classify).filter((a): a is ToolArgs => a !== null);
  const focus = args.reduce((n, a) => (a.tool === "addTask" ? n + a.minutes : n), 0);
  const steps: PlanStep[] = args.map((a) => {
    const finalArgs = a.tool === "scheduleBreak" ? { ...a, afterMinutes: focus } : a;
    return { id: stepId(), title: stepTitle(finalArgs), enabled: true, rationale: rationale(finalArgs), args: finalArgs };
  });
  const summary = steps.length
    ? `I found ${steps.length} action${steps.length > 1 ? "s" : ""}. Review and edit the plan before running it.`
    : "I couldn't safely match that request to a task, grocery list, or break. Try a supported action, or rephrase it.";
  return { request: safeRequest, summary, steps };
}
