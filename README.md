# Ari — Your Day, Made Easier

**Tell Ari what matters. Review a plan. Keep your day yours.**

Ari is a browser-based, interactive day-planning prototype created for the **Amazon Developer Hackathon**. It demonstrates a conversational-assistant workflow: describe an everyday goal, inspect the proposed steps, choose what to run, and see simulated tools update your planner.

> **Prototype and integration notice**
>
> Ari is an independent hackathon demo—not an official Amazon, Alexa, or Alexa+ product, and not an Alexa integration. Its current planner is deterministic and rule-based. It does not call an LLM, Amazon/AWS services, external APIs, or a backend. Actions run against app-local state in your browser; they do not create real calendar events, send reminders or messages, purchase items, or control smart-home devices.

## Live demo

**[Open Ari](https://daypilot-assistant-mu.vercel.app/)**

The first screen is a product landing page. Select **Open Ari** (or the studio entry CTA) to move into the planner. The transition uses a blur-and-focus animation and respects the operating system's reduced-motion preference.

## What Ari demonstrates

Ari is designed to make an assistant's actions visible and user-controlled—not to silently execute a request.

### Conversational planning
- Enter a request in natural language, or start with an example/demo prompt.
- The local rule-based planner interprets supported request patterns and prepares a proposed sequence of steps.
- Review the proposal before execution.

### Review and control
- Inspect the plan and toggle individual steps on or off.
- Run the selected steps explicitly.
- Follow the activity timeline as each simulated tool runs, including its name, input, status, and result.

### App-local planning tools
- **Tasks:** view tasks, mark them complete/incomplete, and remove them.
- **Shopping list:** add, rename, complete/incomplete, and remove items; suggested ingredients can be distinguished.
- **Breaks:** schedule an in-app break using relative start/end times and remove it.
- **Dashboard:** see a compact summary of planner state.
- **Demo and reset:** load sample data, run a guided example, or reset the prototype.

### Experience and persistence
- Responsive layout for desktop and mobile-sized screens.
- Light/dark theme toggle.
- Optional browser speech-to-text when supported by the browser.
- Browser `localStorage` persistence—no account or server-side database.
- Keyboard-conscious controls and reduced-motion support.

## Demo walkthrough

Allow approximately **2–3 minutes** for a quick judging/demo run.

1. Open the live demo and introduce Ari as a *simulated, app-local assistant experience*.
2. From the landing page, click **Open Ari** to enter the planning studio.
3. Choose **Try the demo** (or use the suggested prompt). The sample demonstrates a work block, a shopping list, and a break.
4. Inspect the generated plan. Edit or disable a step to show that the user remains in control.
5. Execute the selected plan and watch the activity timeline report the simulated tool calls and outcomes.
6. Interact with the task and shopping widgets—for example, complete a task or add/check off a grocery item.
7. Refresh the page to demonstrate browser-local persistence.
8. Open the in-app explanation and clarify what is simulated and what the prototype does not connect to.

## How it works

1. **Request** — the user types or speaks a planning request.
2. **Interpret** — the rule-based planner maps supported phrases/patterns to a plan.
3. **Review** — the user can inspect and adjust proposed steps.
4. **Execute** — selected steps run sequentially through local tool functions.
5. **Reflect** — the activity timeline and dashboard show the resulting app state.

The planner is intentionally deterministic so the hackathon demo is repeatable. It is **not** a general-purpose conversational AI or autonomous agent. Requests outside its supported patterns may not produce the expected plan.

## Technology

- **React** and **TypeScript**
- **TanStack Start / TanStack Router**
- **Vite**
- **Tailwind CSS** and **shadcn/Radix UI** primitives
- **Lucide** icons
- **Vitest** for tests

Refer to `package.json` for exact dependency versions and scripts.

## Project structure

| Path | Responsibility |
|---|---|
| `src/routes/index.tsx` | Landing/studio route, page state, plan execution, theme and local persistence |
| `src/lib/daypilot/types.ts` | Shared planner and application domain types |
| `src/lib/daypilot/planner.ts` | Deterministic request parser and proposed-plan generation |
| `src/lib/daypilot/tools.ts` | App-local state transformations for tasks, shopping items, and breaks |
| `src/lib/daypilot/planner.test.ts` | Tests for planner behavior and supported tool flows |
| `src/components/daypilot/` | Composer, plan preview, activity timeline, and planner widgets |
| `src/styles.css` | Global styles, landing-page presentation, and transition animations |
| `public/ari-mark.svg` | Ari mark used as the site favicon |

## Run locally

### Prerequisites
- Node.js (use a current LTS release; Node.js 20+ is a suitable baseline)
- npm

### Install and start the development server

```bash
git clone https://github.com/Vishwajeet805/daypilot-assistant.git
cd daypilot-assistant
npm install
npm run dev
```

Vite prints the local URL in the terminal. Open that URL in your browser.

### Available scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the local development server |
| `npm test` | Run the Vitest test suite once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Run ESLint |
| `npm run build` | Create a production build |
| `npm run preview` | Preview the production build locally |
| `npm run format` | Format project files with Prettier |

## Data, privacy, and limitations

- Planner data is stored in the current browser profile's `localStorage`.
- There is no sign-in, server database, or cloud synchronization in this prototype.
- Clearing this site's browser storage removes the locally saved planner state and theme preference.
- Browser speech recognition, if available and used, is provided by the browser; support and behavior vary by browser.
- The rule-based parser only handles patterns implemented in the project. It can misunderstand requests or omit unsupported details.
- “Tool execution” is a UI demonstration of local state updates, not a connection to real-world services.

## Hackathon context

Ari was built as a simulated assistant/planning experience for the Amazon Developer Hackathon. The project demonstrates an interaction pattern—request → proposed plan → user review → visible tool execution—without claiming official Alexa/Alexa+ integration or use of Amazon services.

Check the hackathon's current submission requirements independently before describing the project as satisfying a particular track or integration requirement.

## Contributing

Issues and pull requests are welcome. For changes to the planner, include or update tests for the supported request patterns and tool behavior. Keep the prototype's integration limitations clear in user-facing copy and documentation.

## License

This project is licensed under the **MIT License**. See [LICENSE](./LICENSE).
