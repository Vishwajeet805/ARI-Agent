# DayPilot
**Tell it what matters. Watch it get done.**

DayPilot is a browser-based **simulated conversational assistant** built for the Amazon Developer Hackathon Alexa+ track's simulated-experience path. It turns supported natural-language requests into a reviewable sequence of app-local actions, then shows each step's status and result.

> **Important scope note:** DayPilot is not an official Alexa+ product or Alexa integration. It currently uses a deterministic rule-based planner (no LLM/API, no network calls, no API keys, and no Amazon/AWS services). Its actions update app state in this browser only; it does not create real calendar events, send notifications/reminders, buy products, or control devices.

## Features
- Natural-language composer with sample prompts and optional browser speech-to-text where supported.
- Editable proposed action plan with step toggles and explicit user-triggered execution.
- Sequential tool execution log showing tool name, input, state, and result.
- Tasks: view, complete/uncomplete, remove.
- Shopping checklist: add, rename, complete/uncomplete, remove; suggested ingredients are identified.
- In-app break schedule with relative start/end time and removal.
- Summary dashboard, sample data, one-click demo, and reset control.
- Browser localStorage persistence; no account or backend required.
- Responsive UI, keyboard-friendly controls, reduced-motion support, and an in-app explanation of simulation limitations.

## Quick start
Requirements: Node.js 20+ (or a compatible current runtime) and npm, or Bun.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. To run automated tests:

```bash
npm test
```

Production build:

```bash
npm run build
npm run preview
```

The project uses React, TypeScript, Vite/TanStack Start, Tailwind CSS, shadcn/Radix UI primitives, Lucide icons, and Vitest. Consult `package.json` for exact versions.

## Demo walkthrough (~2 minutes 30 seconds)
1. Open the deployed app and describe DayPilot as a simulated tool-using assistant.
2. Click **Try the demo** to generate a request containing a 45-minute assignment block, dinner shopping list for two, and 10-minute break.
3. In the proposed plan, edit a step and toggle another off/on to demonstrate user control.
4. Run the plan. Show `addTask`, `createShoppingList`, and `scheduleBreak` in the activity timeline and point out each state update.
5. Tick off a task, edit/add a grocery item, and refresh the page to show browser-local persistence.
6. End by opening “How this demo works” and explaining the local, deterministic simulation and its limitations.

## Architecture
- `src/lib/daypilot/types.ts`: shared domain types.
- `src/lib/daypilot/planner.ts`: keyword/regex-based natural-language parser that creates the proposed plan.
- `src/lib/daypilot/tools.ts`: app-local state transformations for tasks, groceries, and breaks.
- `src/lib/daypilot/planner.test.ts`: tests for the sample plan and its tools.
- `src/components/daypilot/`: assistant composer, plan preview, activity log, and dashboard widgets.
- `src/routes/index.tsx`: page state, sequential execution, and local persistence.

The plan parser is deliberately deterministic for reproducible judging demos. It is not a general-purpose LLM agent. App state is stored in the current browser profile; clearing browser storage resets it.

## Hackathon submission notes
- Track: Alexa+ simulated experience (select only if the current official rules accept this implementation and demo).
- Runtime technologies: browser app-local tools only; no Amazon/Alexa/AWS SDK or service is claimed.
- Code and setup instructions are included in this repository.
- Public demo: https://daypilot-assistant-mu.vercel.app/

## License
MIT. See [LICENSE](./LICENSE).
