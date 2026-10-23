# DayPilot
**Tell it what matters. Watch it get done.**

A hackathon project for the Amazon Developer Hackathon **Alexa+ track, simulated-experience path**. DayPilot is a browser-based agentic workflow simulator: one natural-language request becomes a reviewable multi-step plan, and approved steps run as real app-local tools that update a dashboard.

> **Honesty note:** DayPilot is *not* an official Alexa+ integration and uses no Amazon/Alexa/AWS services. The planner is a deterministic rule-based demo agent (no LLM, no network, no API keys). Actions only change state inside this browser — no real calendar, reminders, or notifications.

## Run locally
```bash
bun install      # or npm install
bun run dev      # http://localhost:8080
bunx vitest run  # planner + tool tests
```

## Features
- Conversational composer (Enter to send), sample chips, optional browser speech-to-text with graceful fallback
- Plan preview: editable step titles, include/exclude checkboxes, Run / Cancel
- Sequential execution with an activity timeline: tool name, input, status badge, output
- Dashboard: greeting, live date/time, summary stats, tasks (toggle/remove), grocery list (add/edit/remove/check, "suggested" badges), in-app break schedule
- localStorage persistence, seed data, **Try the demo** and **Reset demo** buttons
- "How this demo works" disclosure; responsive layout; keyboard + screen-reader labels; respects `prefers-reduced-motion`

## Architecture
```
src/lib/daypilot/
  types.ts      domain types (Task, GroceryItem, BreakSlot, Plan, ActivityEntry)
  planner.ts    planRequest(): split clauses -> keyword/regex classify -> tool steps
  tools.ts      addTask, createShoppingList, scheduleBreak — pure (state, args) => {state, output}
  planner.test.ts
src/components/daypilot/
  AgentPanel.tsx  Composer, PlanPreview, ActivityTimeline
  Widgets.tsx     SummaryStrip, TasksCard, GroceryCard, BreakCard
src/routes/index.tsx  page state, run loop, persistence
```
Adding a tool: add its args to `ToolArgs`, implement it in `tools.ts`, register it in `runTool`, and add a classifier rule in `planner.ts`.

## Demo script (~2.5 min)
1. **(0:00)** Open the app. "DayPilot turns one sentence into a plan an agent executes." Point out the dashboard and the honesty disclosure.
2. **(0:20)** Click **Try the demo**. The sample request becomes three steps: a 45-min assignment task, a dinner grocery list for two, a 10-min break.
3. **(0:50)** Show approval control: edit a step title, uncheck/recheck a step. Read a rationale line.
4. **(1:15)** Click **Run plan**. Narrate the timeline: `addTask` → `createShoppingList` → `scheduleBreak`, each with input, status, and output, while widgets update live.
5. **(1:50)** Edit the grocery list (rename "Pasta" to "Penne", add "Basil"), tick off a task, refresh to show persistence.
6. **(2:20)** Type a new request, e.g. "Plan 30 minutes to review chapter 4 and schedule a 5-minute break." Close by explaining the modular planner/tools and that this is the permitted simulated path.

## License
MIT — see [LICENSE](./LICENSE).
