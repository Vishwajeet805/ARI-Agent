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
  const [showLanding, setShowLanding] = useState(true);
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

  if (showLanding) {
    return (
      <main className="ari-landing min-h-screen overflow-hidden px-5 py-5 sm:px-8 lg:px-12">
        <div className="ari-landing-noise" aria-hidden="true" />
        <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between">
          <a href="#welcome" className="flex items-center gap-3" aria-label="Ari welcome">
            <span className="ari-brand-mark grid size-11 place-items-center rounded-[14px]" aria-hidden="true">
              <svg viewBox="0 0 40 40" className="size-7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 28.5 19.8 9l9.2 19.5" /><path d="M14.7 21h10.6" /><path d="M7.5 17.5a13 13 0 0 1 25 0" opacity=".48" />
                <path d="m30.5 7 .9 2.2 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" fill="currentColor" stroke="none" />
              </svg>
            </span>
            <span className="leading-tight"><span className="block font-display text-2xl font-semibold tracking-[-0.06em]">Ari<span className="text-primary">.</span></span><span className="mt-0.5 block text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Your day, in rhythm</span></span>
          </a>
          <span className="hidden rounded-full border border-border/70 bg-background/45 px-4 py-2 text-xs font-medium text-muted-foreground sm:inline-flex">A little more breathing room <span className="ml-2 text-primary">✳</span></span>
        </header>

        <section id="welcome" className="relative z-10 mx-auto grid min-h-[calc(100svh-6.5rem)] max-w-7xl items-center gap-12 py-14 lg:grid-cols-[1.02fr_.98fr] lg:gap-16 lg:py-16">
          <div className="ari-landing-copy animate-rise">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-primary"><Sparkles className="size-3.5" /> YOUR PERSONAL PLANNING SPACE</div>
            <h1 className="max-w-2xl font-display text-[3.45rem] font-medium leading-[0.99] tracking-[-0.065em] sm:text-6xl lg:text-[5.2rem]">Less juggling.<br /><span className="ari-landing-accent">More living.</span></h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">Give your everyday to-dos a little structure. Ari turns requests into clear, editable plans for tasks, shopping, and breaks—then lets you choose what to run.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button size="lg" onClick={() => { setShowLanding(false); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="group h-12 rounded-full px-6 text-sm font-semibold shadow-glow">
                Open Ari <span className="ml-2 transition-transform group-hover:translate-x-1">↗</span>
              </Button>
              <a href="#landing-details" className="inline-flex h-12 items-center justify-center rounded-full px-5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">Take a quick look <span className="ml-2">↓</span></a>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground"><span className="inline-flex items-center gap-2"><span className="size-1.5 rounded-full bg-primary" /> You stay in control</span><span>Editable before you run</span><span>Saved in this browser</span></div>
          </div>

          <div className="ari-landing-visual relative mx-auto w-full max-w-[540px] animate-rise" style={{ animationDelay: "100ms" }}>
            <div className="ari-orbit ari-orbit-one" aria-hidden="true" /><div className="ari-orbit ari-orbit-two" aria-hidden="true" />
            <div className="ari-preview-card relative z-10 rounded-[1.75rem] border p-5 shadow-2xl sm:p-7">
              <div className="flex items-center justify-between border-b border-border/70 pb-4">
                <div><p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">A sample day</p><h2 className="mt-1 font-display text-2xl tracking-tight">A little more in flow</h2></div>
                <span className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary"><Sparkles className="size-5" /></span>
              </div>
              <div className="mt-5 rounded-2xl bg-primary/7 p-4">
                <p className="text-xs font-semibold text-primary">Ari's plan preview</p><p className="mt-1 text-sm leading-6">“Help me fit in focus time, groceries, and a proper break.”</p>
                <div className="mt-3 flex items-center gap-2 text-[0.68rem] font-medium text-muted-foreground"><span className="size-1.5 rounded-full bg-primary" /> Request → reviewable steps</div>
              </div>
              <div className="mt-5 space-y-3">
                <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/55 p-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">✓</span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">Focus session</p><p className="text-xs text-muted-foreground">25 minutes · Task</p></div><span className="text-xs text-muted-foreground">01</span></div>
                <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/55 p-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-600">⌁</span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">Pick up groceries</p><p className="text-xs text-muted-foreground">Shopping list · Editable</p></div><span className="text-xs text-muted-foreground">02</span></div>
                <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/55 p-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sky-500/10 text-sky-600">☼</span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">Take a reset break</p><p className="text-xs text-muted-foreground">10 minutes · Break</p></div><span className="text-xs text-muted-foreground">03</span></div>
              </div>
              <div className="mt-5 flex items-center justify-between rounded-xl border border-dashed border-primary/30 px-3.5 py-3"><span className="text-xs text-muted-foreground">Review the steps before running</span><span className="rounded-full bg-primary/10 px-2.5 py-1 text-[0.65rem] font-bold text-primary">Your call</span></div>
            </div>
            <div className="ari-floating-note absolute -bottom-5 -left-4 z-20 hidden items-center gap-2 rounded-2xl border px-4 py-3 shadow-lg sm:flex"><span className="grid size-8 place-items-center rounded-xl bg-primary/10 text-primary">✦</span><span><span className="block text-xs font-bold">Small steps,</span><span className="block text-[0.68rem] text-muted-foreground">clearer days</span></span></div>
          </div>
        </section>

        <section id="landing-details" className="relative z-10 mx-auto max-w-7xl border-t border-border/50 py-8">
          <div className="grid gap-5 sm:grid-cols-3">
            <div className="ari-feature"><span className="ari-feature-number">01</span><h3>Say what’s on your mind</h3><p>Describe a task, a shopping list, or when you need a pause.</p></div>
            <div className="ari-feature"><span className="ari-feature-number">02</span><h3>Review the plan</h3><p>See the suggested steps and adjust them before anything runs.</p></div>
            <div className="ari-feature"><span className="ari-feature-number">03</span><h3>Keep your day yours</h3><p>Run the steps you want. Your demo changes stay in this browser.</p></div>
          </div>
          <div className="mt-7 flex flex-col items-start justify-between gap-3 border-t border-border/40 pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center"><span>Ari is a hackathon prototype · Simulated interactions, no Alexa/Amazon service connection</span><button onClick={() => { setShowLanding(false); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="font-semibold text-primary hover:underline">Enter the planning studio ↗</button></div>
        </section>
      </main>
    );
  }

  return (
    <div id="top" className="daypilot-shell mx-auto max-w-7xl px-4 pb-16 pt-5 sm:px-6 lg:px-8">
      <header className="ari-navbar mb-9 grid grid-cols-1 items-center gap-4 rounded-2xl border px-4 py-3.5 sm:px-5 lg:grid-cols-[1fr_auto_1fr] lg:gap-5">
        <a href="#top" className="group flex items-center gap-3 justify-self-center lg:justify-self-start" aria-label="Ari home">
          <span className="ari-brand-mark grid size-11 place-items-center rounded-[14px] sm:size-12" aria-hidden="true">
            <svg viewBox="0 0 40 40" className="size-7 sm:size-8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 28.5 19.8 9l9.2 19.5" />
              <path d="M14.7 21h10.6" />
              <path d="M7.5 17.5a13 13 0 0 1 25 0" opacity=".48" />
              <path d="m30.5 7 .9 2.2 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" fill="currentColor" stroke="none" />
              <circle cx="20" cy="31.5" r="1.3" fill="currentColor" stroke="none" />
            </svg>
          </span>
          <span className="leading-tight">
            <span className="block font-display text-[1.8rem] font-semibold tracking-[-0.055em] sm:text-[2rem]">Ari<span className="text-primary">.</span></span>
            <span className="mt-0.5 block text-[0.68rem] font-medium tracking-[0.13em] text-muted-foreground uppercase">Your day, in rhythm</span>
          </span>
        </a>
        <div className="hidden items-center gap-2 rounded-full border bg-background/65 px-3.5 py-2 text-xs font-medium text-muted-foreground lg:flex">
          <span className="size-1.5 rounded-full bg-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.12)]" />
          Personal planning studio
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-self-end">
          <Button variant="outline" size="sm" onClick={() => setDarkMode((dark) => !dark)} aria-label={darkMode ? "Switch to light theme" : "Switch to dark theme"} title={darkMode ? "Switch to light theme" : "Switch to dark theme"}>{darkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}<span className="hidden sm:inline">{darkMode ? "Light" : "Dark"} mode</span></Button>
          <Button variant="outline" size="sm" onClick={reset} disabled={running}><RotateCcw className="size-4" /><span className="hidden sm:inline">Reset</span></Button>
          <Button size="sm" onClick={loadDemo} disabled={running} className="bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"><Sparkles className="size-4" />Try demo</Button>
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
