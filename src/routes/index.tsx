import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Info, Moon, RotateCcw, Sparkles, Sun } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ActivityTimeline, Composer, PlanPreview } from "@/components/daypilot/AgentPanel";
import { BreakCard, GroceryCard, SummaryStrip, TasksCard } from "@/components/daypilot/Widgets";
import { DEMO_PROMPT, planRequest } from "@/lib/daypilot/planner";
import { describeInput, restoreState, runTool, seedState } from "@/lib/daypilot/tools";
import type { ActivityEntry, AppState, Plan } from "@/lib/daypilot/types";

export const Route = createFileRoute("/")({
  head: () => ({
    links: [{ rel: "icon", type: "image/svg+xml", href: "/ari-mark.svg" }],
    meta: [
      { title: "Ari — Your day, made easier." },
      { name: "description", content: "A local demo planner that turns a request into editable steps for tasks, shopping lists, and breaks." },
      { property: "og:title", content: "Ari — interactive day-planner demo" },
      { property: "og:description", content: "Describe what you need. Review a plan for tasks, shopping lists, and breaks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const KEY = "daypilot:v1";
const STEP_DELAY = 900;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const uid = () => Math.random().toString(36).slice(2, 9);

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function Index() {
  const [state, setState] = useState<AppState>(() => seedState());
  const [loaded, setLoaded] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem("ari:theme") === "dark"; } catch { return false; }
  });
  const stateRef = useRef(state);
  const runLockRef = useRef(false);
  stateRef.current = state;
  const now = useClock();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    try { localStorage.setItem("ari:theme", darkMode ? "dark" : "light"); } catch { /* Theme still applies for this session. */ }
  }, [darkMode]);

  useEffect(() => {
    try {
      setState(restoreState(localStorage.getItem(KEY)));
    } catch {
      setState(seedState());
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch { toast.error("Couldn't save in this browser. Your current changes may not persist after refresh."); }
  }, [state, loaded]);

  const ask = (text: string) => { setActivity([]); setPlan(planRequest(text)); };

  const run = async () => {
    // Ref lock closes the tiny rapid-click race before React disables the button.
    if (!plan || runLockRef.current) return;
    runLockRef.current = true;
    setRunning(true);
    const entries: ActivityEntry[] = plan.steps.map((s) => ({
      stepId: s.id, title: s.title, tool: s.args.tool, input: describeInput(s.args),
      status: s.enabled ? "queued" : "skipped",
    }));
    setActivity(entries);
    let failed = 0;
    for (const s of plan.steps) {
      if (!s.enabled) continue;
      setActivity((a) => a.map((e) => (e.stepId === s.id ? { ...e, status: "running" } : e)));
      await sleep(STEP_DELAY);
      try {
        const args = s.args.tool === "addTask" ? { ...s.args, title: s.title.replace(/^Create a \d+-minute focus task:\s*/i, "") } : s.args;
        const res = runTool(stateRef.current, args);
        stateRef.current = res.state;
        setState(res.state);
        setActivity((a) => a.map((e) => (e.stepId === s.id ? { ...e, status: "done", output: res.output } : e)));
      } catch (err) {
        failed++;
        setActivity((a) => a.map((e) => (e.stepId === s.id ? { ...e, status: "failed", output: (err as Error).message } : e)));
      }
    }
    runLockRef.current = false;
    setRunning(false);
    setPlan(null);
    if (failed) toast.error(`${failed} step${failed > 1 ? "s" : ""} failed — see activity.`);
    else toast.success("Done. Your dashboard reflects the steps that ran.");
  };

  const reset = () => {
    const fresh = seedState();
    stateRef.current = fresh;
    setState(fresh); setPlan(null); setActivity([]);
    toast("Demo reset. Sample tasks and lists are back.");
  };
  const loadDemo = () => {
    // Every click starts from the same fixture and clears the previous run timeline.
    const fresh = seedState();
    stateRef.current = fresh;
    setState(fresh); setActivity([]); setPlan(planRequest(DEMO_PROMPT));
    toast("Demo loaded. Review the proposed steps, then run the plan.");
  };

  const upd = (fn: (s: AppState) => AppState) => setState((s) => fn(s));
  const hour = now?.getHours() ?? 12;
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="daypilot-shell mx-auto max-w-7xl px-4 pb-16 pt-5 sm:px-6 lg:px-8">
      <header className="mb-9 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm" aria-hidden="true">
            <svg viewBox="0 0 28 28" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5.5 11.5a8.5 8.5 0 0 1 17 0" /><path d="M8.5 14a5.5 5.5 0 0 1 11 0" /><path d="M11.5 16.5a2.5 2.5 0 0 1 5 0" /><path d="M14 19v2.5" /><path d="m21.5 4 .8 1.8 1.7.7-1.7.8-.8 1.7-.7-1.7-1.8-.8 1.8-.7z" fill="currentColor" stroke="none" />
            </svg>
          </span>
          <div>
            <p className="font-display text-xl leading-none tracking-tight">Ari</p>
            <p className="text-xs text-muted-foreground">Plan tasks, lists, and breaks</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setDarkMode((dark) => !dark)} aria-label={darkMode ? "Switch to light theme" : "Switch to dark theme"} title={darkMode ? "Switch to light theme" : "Switch to dark theme"}>{darkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}<span className="hidden sm:inline">{darkMode ? "Light" : "Dark"} mode</span></Button>
          <Button variant="outline" size="sm" onClick={reset} disabled={running}><RotateCcw className="size-4" />Reset demo</Button>
          <Button size="sm" onClick={loadDemo} disabled={running} className="bg-primary text-primary-foreground hover:bg-primary/90"><Sparkles className="size-4" />Try the demo</Button>
        </div>
      </header>

      <section className="daypilot-hero mb-7 overflow-hidden border p-5 sm:p-8">
        <p className="text-sm font-medium text-muted-foreground" suppressHydrationWarning>
          {now ? now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" }) + " · " + now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "\u00a0"}
        </p>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs font-semibold text-primary"><Sparkles className="size-3.5" aria-hidden /> Plan first. Run when you're ready.</div>
        <h1 className="mt-1 max-w-3xl font-display text-4xl tracking-tight sm:text-5xl lg:text-6xl">
          {greeting}. <span className="text-gradient-accent">What would you like to plan?</span>
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">Describe a task, shopping list, or break. Ari drafts editable steps; review them before running. Changes stay in this browser.</p>
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-muted-foreground"><span className="inline-flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-primary" /> 1. Describe</span><span aria-hidden className="text-border">/</span><span>2. Review</span><span aria-hidden className="text-border">/</span><span>3. Run</span></div>
      </section>

      <div className="mb-7"><SummaryStrip state={state} /></div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.95fr)] xl:gap-7">
        <div className="space-y-5 sm:space-y-6">
          <Composer onSubmit={ask} disabled={running} />
          {plan && (
            <PlanPreview
              plan={plan} running={running} onRun={run}
              onCancel={() => setPlan(null)}
              onToggle={(id) => setPlan((p) => p && { ...p, steps: p.steps.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)) })}
              onEditTitle={(id, title) => setPlan((p) => p && { ...p, steps: p.steps.map((s) => (s.id === id ? { ...s, title } : s)) })}
            />
          )}
          {!plan && activity.length === 0 && (
            <button onClick={() => ask(DEMO_PROMPT)} className="glass-card w-full p-5 text-left transition-colors hover:border-primary/45 hover:bg-card">
              <p className="text-xs font-semibold tracking-wide text-primary">Try a sample</p>
              <p className="mt-1 font-display text-lg">"{DEMO_PROMPT}"</p>
              <p className="mt-2 text-sm text-muted-foreground">Select to preview the steps before running them →</p>
            </button>
          )}
          <ActivityTimeline entries={activity} />
          <HowItWorks />
        </div>
        <div className="space-y-6">
          <TasksCard
            tasks={state.tasks}
            onToggle={(id) => upd((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) }))}
            onRemove={(id) => upd((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }))}
            onAdd={(title, minutes) => upd((s) => ({ ...s, tasks: [{ id: uid(), title, minutes, done: false, source: "user" }, ...s.tasks] }))}
            onEdit={(id, title, minutes) => upd((s) => ({ ...s, tasks: s.tasks.map((t) => t.id === id ? { ...t, title, minutes } : t) }))}
          />
          <GroceryCard
            title={state.groceryTitle} items={state.groceries}
            onToggle={(id) => upd((s) => ({ ...s, groceries: s.groceries.map((g) => (g.id === id ? { ...g, done: !g.done } : g)) }))}
            onRemove={(id) => upd((s) => ({ ...s, groceries: s.groceries.filter((g) => g.id !== id) }))}
            onAdd={(name) => upd((s) => ({ ...s, groceries: [...s.groceries, { id: uid(), name, done: false, suggested: false }] }))}
            onRename={(id, name) => name.trim() && upd((s) => ({ ...s, groceries: s.groceries.map((g) => (g.id === id ? { ...g, name: name.trim(), suggested: false } : g)) }))}
          />
          <BreakCard
            breaks={state.breaks}
            onRemove={(id) => upd((s) => ({ ...s, breaks: s.breaks.filter((b) => b.id !== id) }))}
            onEdit={(id, title, minutes, startsAt) => upd((s) => ({ ...s, breaks: s.breaks.map((b) => b.id === id ? { ...b, title, minutes, startsAt } : b).sort((a, b) => a.startsAt.localeCompare(b.startsAt)) }))}
          />
        </div>
      </div>
    </div>
  );
}

function HowItWorks() {
  return (
    <Collapsible className="glass-card p-5">
      <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 text-left">
        <span className="flex items-center gap-2 font-semibold"><Info className="size-4 text-primary" aria-hidden />What this demo does</span>
        <ChevronDown className="size-4 transition group-data-[state=open]:rotate-180" aria-hidden />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 space-y-2 text-sm text-muted-foreground">
        <p>Ari is a hackathon-built <strong className="text-foreground">simulated assistant</strong> for the Alexa+ track's simulated-experience path. It is not an official Alexa+ product and doesn't connect to Alexa or Amazon services.</p>
        <p>A deterministic rule-based planner (no AI model or network) turns supported requests into steps. Running them uses this app's tools — <code>addTask</code>, <code>createShoppingList</code>, and <code>scheduleBreak</code> — to update the dashboard.</p>
        <p>Your changes are saved in this browser only. This demo does not connect to a calendar, send reminders or notifications, or control Alexa/Amazon services.</p>
      </CollapsibleContent>
    </Collapsible>
  );
}
