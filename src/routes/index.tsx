import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Info, Navigation, RotateCcw, Sparkles } from "lucide-react";
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
    meta: [
      { title: "DayPilot — Tell it what matters. Watch it get done." },
      { name: "description", content: "A simulated Alexa+-style agent that turns one request into a plan and runs in-app tools for tasks, groceries, and breaks." },
      { property: "og:title", content: "DayPilot — agentic day planner demo" },
      { property: "og:description", content: "Tell it what matters. Watch it plan and run tasks, grocery lists, and breaks." },
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
  const stateRef = useRef(state);
  const runLockRef = useRef(false);
  stateRef.current = state;
  const now = useClock();

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
    else toast.success("Plan complete — your dashboard is updated.");
  };

  const reset = () => {
    setState(seedState()); setPlan(null); setActivity([]);
    toast("Demo reset to sample data.");
  };
  const loadDemo = () => { setState(seedState()); ask(DEMO_PROMPT); };

  const upd = (fn: (s: AppState) => AppState) => setState((s) => fn(s));
  const hour = now?.getHours() ?? 12;
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-accent text-primary-foreground shadow-glow">
            <Navigation className="size-4.5" aria-hidden />
          </span>
          <div>
            <p className="font-display text-xl leading-none">DayPilot</p>
            <p className="text-xs text-muted-foreground">Simulated assistant · hackathon demo</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={reset} disabled={running}><RotateCcw className="size-4" />Reset demo</Button>
          <Button size="sm" onClick={loadDemo} disabled={running} className="bg-gradient-accent shadow-glow"><Sparkles className="size-4" />Try the demo</Button>
        </div>
      </header>

      <section className="mb-6">
        <p className="text-sm font-medium text-muted-foreground" suppressHydrationWarning>
          {now ? now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" }) + " · " + now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "\u00a0"}
        </p>
        <h1 className="mt-1 font-display text-4xl tracking-tight sm:text-5xl">
          {greeting}. <span className="text-gradient-accent">Tell it what matters.</span>
        </h1>
        <p className="mt-2 max-w-xl text-muted-foreground">Describe your evening in one sentence. DayPilot drafts a plan, you approve it, and it runs the steps right here.</p>
      </section>

      <div className="mb-6"><SummaryStrip state={state} /></div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="space-y-6">
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
            <button onClick={() => ask(DEMO_PROMPT)} className="glass-card w-full p-5 text-left transition hover:border-primary/40">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">Sample request</p>
              <p className="mt-1 font-display text-lg">"{DEMO_PROMPT}"</p>
              <p className="mt-2 text-sm text-muted-foreground">Click to generate a plan →</p>
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
          <BreakCard breaks={state.breaks} onRemove={(id) => upd((s) => ({ ...s, breaks: s.breaks.filter((b) => b.id !== id) }))} />
        </div>
      </div>
    </div>
  );
}

function HowItWorks() {
  return (
    <Collapsible className="glass-card p-5">
      <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 text-left">
        <span className="flex items-center gap-2 font-semibold"><Info className="size-4 text-primary" aria-hidden />How this demo works</span>
        <ChevronDown className="size-4 transition group-data-[state=open]:rotate-180" aria-hidden />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 space-y-2 text-sm text-muted-foreground">
        <p>DayPilot is a hackathon-built <strong className="text-foreground">simulated assistant</strong> for the Alexa+ track's simulated-experience path. It is not an official Alexa+ product and doesn't connect to Alexa or Amazon services.</p>
        <p>A deterministic, rule-based demo planner (no AI model, no network) reads your request and proposes steps. When you run the plan, it calls tools written into this app — <code>addTask</code>, <code>createShoppingList</code>, <code>scheduleBreak</code> — which update the dashboard.</p>
        <p>Everything is saved only in this browser. There's no real calendar, no reminders or notifications, and no account.</p>
      </CollapsibleContent>
    </Collapsible>
  );
}
