import { describe, expect, it } from "vitest";
import { DEMO_PROMPT, planRequest } from "./planner";
import { restoreState, runTool, seedState, scheduleBreak } from "./tools";

describe("deterministic planner", () => {
  it("keeps the three-step demo in task, grocery, break order", () => {
    const plan = planRequest(DEMO_PROMPT);
    expect(plan.steps.map((s) => s.args.tool)).toEqual(["addTask", "createShoppingList", "scheduleBreak"]);
    expect(plan.steps[0]?.args).toMatchObject({ tool: "addTask", title: "Finish my assignment", minutes: 45 });
    expect(plan.steps[1]?.args).toMatchObject({
      tool: "createShoppingList",
      servings: 2,
      items: ["Pasta", "Tomatoes", "Spinach", "Garlic", "Parmesan"],
    });
    expect(plan.steps[2]?.args).toMatchObject({ tool: "scheduleBreak", minutes: 10, afterMinutes: 45 });
  });

  it("does not split comma-separated grocery ingredients into separate actions", () => {
    const plan = planRequest("Make a shopping list with pasta, tomatoes and spinach");
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0]?.args).toMatchObject({
      tool: "createShoppingList",
      items: ["Pasta", "Tomatoes", "Spinach"],
    });
  });

  it("supports a semicolon-separated multi-action request", () => {
    const plan = planRequest("Add a 30-minute study task; schedule a 5-minute break");
    expect(plan.steps.map((s) => s.args.tool)).toEqual(["addTask", "scheduleBreak"]);
    expect(plan.steps[1]?.args).toMatchObject({ tool: "scheduleBreak", afterMinutes: 30, minutes: 5 });
  });

  it("bounds extreme durations and servings to safe values", () => {
    const plan = planRequest("Finish my assignment for 9999 minutes, make dinner grocery list for 99");
    expect(plan.steps[0]?.args).toMatchObject({ tool: "addTask", minutes: 240 });
    expect(plan.steps[1]?.args).toMatchObject({ tool: "createShoppingList", servings: 12 });
  });

  it("does not invent actions for unsupported requests", () => {
    for (const request of ["What's the weather?", "Buy me a phone", "Turn off my lights", ""]) {
      expect(planRequest(request).steps, request).toHaveLength(0);
    }
  });

  it("tools update state for the demo plan", () => {
    const plan = planRequest(DEMO_PROMPT);
    let state = seedState();
    for (const step of plan.steps) state = runTool(state, step.args).state;
    expect(state.tasks.some((task) => task.minutes === 45)).toBe(true);
    expect(state.groceries.filter((item) => item.suggested)).toHaveLength(5);
    expect(state.breaks).toHaveLength(1);
  });

  it("schedules a break after the focus block", () => {
    const now = new Date("2026-10-23T18:00:00Z");
    const result = scheduleBreak(seedState(), { tool: "scheduleBreak", title: "Break", minutes: 10, afterMinutes: 45 }, now);
    expect(result.state.breaks[0]?.startsAt).toBe("2026-10-23T18:45:00.000Z");
  });
});

describe("browser state restoration", () => {
  it("falls back to sample state for malformed JSON or wrong shapes", () => {
    expect(restoreState("{not-json")).toEqual(seedState());
    expect(restoreState(JSON.stringify({ tasks: "nope", groceries: [], breaks: [] }))).toEqual(seedState());
  });

  it("filters invalid entries and preserves valid local items", () => {
    const stored = {
      ...seedState(),
      tasks: [{ id: "ok", title: "Read", minutes: 20, done: false, source: "user" }, { id: "bad", title: "Oops", minutes: -1, done: false, source: "user" }],
    };
    const restored = restoreState(JSON.stringify(stored));
    expect(restored.tasks).toHaveLength(1);
    expect(restored.tasks[0]?.title).toBe("Read");
  });
});
