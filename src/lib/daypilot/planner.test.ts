import { describe, expect, it } from "vitest";
import { DEMO_PROMPT, planRequest } from "./planner";
import { runTool, seedState, scheduleBreak } from "./tools";

describe("demo planner", () => {
  const plan = planRequest(DEMO_PROMPT);

  it("extracts exactly three steps in order", () => {
    expect(plan.steps.map((s) => s.args.tool)).toEqual(["addTask", "createShoppingList", "scheduleBreak"]);
  });

  it("creates a 45-minute assignment task", () => {
    const a = plan.steps[0]!.args;
    expect(a.tool === "addTask" && a.minutes).toBe(45);
    expect(a.tool === "addTask" && a.title).toBe("Finish my assignment");
  });

  it("suggests the five dinner ingredients for two", () => {
    const a = plan.steps[1]!.args;
    expect(a.tool === "createShoppingList" && a.servings).toBe(2);
    expect(a.tool === "createShoppingList" && a.items).toEqual(["Pasta", "Tomatoes", "Spinach", "Garlic", "Parmesan"]);
  });

  it("schedules a 10-minute break after the focus block", () => {
    const a = plan.steps[2]!.args;
    expect(a.tool === "scheduleBreak" && a.minutes).toBe(10);
    expect(a.tool === "scheduleBreak" && a.afterMinutes).toBe(45);
  });

  it("returns no steps for unrelated text", () => {
    expect(planRequest("what's the weather").steps).toHaveLength(0);
  });

  it("tools update state", () => {
    let s = seedState();
    for (const step of plan.steps) s = runTool(s, step.args).state;
    expect(s.tasks[0]!.minutes).toBe(45);
    expect(s.groceries.filter((g) => g.suggested)).toHaveLength(5);
    expect(s.breaks).toHaveLength(1);
  });

  it("break starts 45+ minutes after now", () => {
    const now = new Date("2026-10-23T18:00:00Z");
    const r = scheduleBreak(seedState(), { tool: "scheduleBreak", title: "b", minutes: 10, afterMinutes: 45 }, now);
    expect(r.state.breaks[0]!.startsAt).toBe("2026-10-23T18:45:00.000Z");
  });
});
