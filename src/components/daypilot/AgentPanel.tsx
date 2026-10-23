import { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowUp, CheckCircle2, Circle, Loader2, Mic, MicOff, MinusCircle, Play, Wrench, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DEMO_PROMPT } from "@/lib/daypilot/planner";
import type { ActivityEntry, Plan, StepStatus } from "@/lib/daypilot/types";
import { cn } from "@/lib/utils";

const CHIPS = [
  { label: "Plan tonight", text: DEMO_PROMPT },
  { label: "Study session + break", text: "Plan 30 minutes to review chapter 4 and schedule a 5-minute break." },
  { label: "Make a lunch list", text: "Make a lunch grocery list for one with bread, avocado, eggs." },
];

/* eslint-disable @typescript-eslint/no-explicit-any */
type Rec = any;

export function Composer({ onSubmit, disabled }: { onSubmit: (text: string) => void; disabled: boolean }) {
  const [text, setText] = useState("");
  const [speechOk, setSpeechOk] = useState(false);
  const [listening, setListening] = useState(false);
  const [speechErr, setSpeechErr] = useState<string | null>(null);
  const rec = useRef<Rec>(null);

  useEffect(() => {
    const w = window as any;
    setSpeechOk(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  const toggleMic = () => {
    setSpeechErr(null);
    if (listening) { rec.current?.stop(); return; }
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) { setSpeechErr("Voice input isn't supported in this browser — please type instead."); return; }
    const r = new SR();
    r.lang = "en-US"; r.interimResults = true;
    r.onresult = (e: any) => setText(Array.from(e.results).map((x: any) => x[0].transcript).join(""));
    r.onerror = (e: any) => setSpeechErr(e.error === "not-allowed" ? "Microphone permission was denied." : "Couldn't hear that — try again or type.");
    r.onend = () => setListening(false);
    rec.current = r; r.start(); setListening(true);
  };

  const submit = (t = text) => { if (t.trim() && !disabled) { onSubmit(t.trim()); setText(""); } };

  return (
    <div className="glass-card p-4 sm:p-5">
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="relative">
        <label htmlFor="ask" className="sr-only">Tell DayPilot what you need</label>
        <Textarea
          id="ask" value={text} onChange={(e) => setText(e.target.value)} rows={3}
          placeholder="Try: “Plan 45 minutes for my essay, then add a 5-minute break.”"
          className="min-h-24 resize-none border-0 bg-transparent p-1 pr-24 text-base shadow-none focus-visible:ring-0"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
        />
        <div className="absolute bottom-1 right-1 flex gap-2">
          <Button type="button" variant="ghost" size="icon" onClick={toggleMic}
            aria-label={listening ? "Stop voice input" : "Start voice input"} aria-pressed={listening}
            title={speechOk ? "Voice input" : "Voice input not supported in this browser"}
            className={cn(listening && "bg-accent text-primary")}>
            {speechOk ? <Mic className={cn("size-4", listening && "animate-pulse")} /> : <MicOff className="size-4" />}
          </Button>
          <Button type="submit" size="icon" disabled={!text.trim() || disabled} aria-label="Send request" className="bg-primary text-primary-foreground hover:bg-primary/90">
            <ArrowUp className="size-4" />
          </Button>
        </div>
      </form>
      {speechErr && <p role="status" className="mt-2 text-xs text-destructive">{speechErr}</p>}
      <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
        {CHIPS.map((c) => (
          <button key={c.label} type="button" disabled={disabled} onClick={() => submit(c.text)}
            className="rounded-full border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-primary disabled:opacity-50">
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PlanPreview({
  plan, running, onEditTitle, onToggle, onRun, onCancel,
}: {
  plan: Plan; running: boolean;
  onEditTitle: (id: string, title: string) => void; onToggle: (id: string) => void;
  onRun: () => void; onCancel: () => void;
}) {
  const enabled = plan.steps.filter((s) => s.enabled).length;
  return (
    <section className="glass-card animate-rise p-5" aria-labelledby="plan-h">
      <div className="mb-1 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Review your plan</p>
          <h2 id="plan-h" className="mt-1 font-display text-xl">"{plan.request}"</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel} disabled={running} aria-label="Clear plan"><X className="size-4" /></Button>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">{plan.summary}</p>
      {plan.steps.length > 0 && (
        <>
          <ol className="space-y-2">
            {plan.steps.map((s, i) => (
              <li key={s.id} className={cn("rounded-xl border bg-background/60 p-3 transition", !s.enabled && "opacity-55")}>
                <div className="flex items-center gap-3">
                  <Checkbox checked={s.enabled} onCheckedChange={() => onToggle(s.id)} disabled={running} aria-label={`Run step ${i + 1}`} />
                  <span className="text-xs font-semibold tabular-nums text-muted-foreground">{i + 1}</span>
                  <Input value={s.title} disabled={running} onChange={(e) => onEditTitle(s.id, e.target.value)} aria-label={`Step ${i + 1} title`} className="h-8 border-transparent bg-transparent px-1 font-medium shadow-none hover:border-input" />
                  <span className="hidden shrink-0 rounded-md bg-primary-soft px-2 py-1 text-[11px] font-medium text-primary sm:inline">{s.args.tool === "addTask" ? "Task" : s.args.tool === "createShoppingList" ? "Shopping list" : "Break"}</span>
                </div>
                <p className="ml-14 mt-1 text-xs text-muted-foreground">{s.rationale}</p>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
            <Button variant="outline" onClick={onCancel} disabled={running}>Cancel</Button>
            <Button onClick={onRun} disabled={running || enabled === 0} className="bg-gradient-accent shadow-glow">
              {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
              {running ? "Running…" : `Run ${enabled} step${enabled === 1 ? "" : "s"}`}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}

const STATUS: Record<StepStatus, { icon: typeof Circle; label: string; cls: string }> = {
  queued: { icon: Circle, label: "Queued", cls: "bg-muted text-muted-foreground" },
  running: { icon: Loader2, label: "Running", cls: "bg-accent text-accent-foreground" },
  done: { icon: CheckCircle2, label: "Done", cls: "bg-success-soft text-success" },
  skipped: { icon: MinusCircle, label: "Skipped", cls: "bg-muted text-muted-foreground" },
  failed: { icon: AlertCircle, label: "Failed", cls: "bg-destructive/10 text-destructive" },
};

export function ActivityTimeline({ entries }: { entries: ActivityEntry[] }) {
  return (
    <section className="glass-card p-5" aria-labelledby="act-h" aria-live="polite">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid size-8 place-items-center rounded-lg bg-primary-soft text-primary"><Wrench className="size-4" aria-hidden /></span>
        <h2 id="act-h" className="text-base font-semibold">Agent activity</h2>
      </div>
      {entries.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">Run your plan to see each step and its result here.</p>
      ) : (
        <ol className="relative space-y-4 border-l pl-5">
          {entries.map((e) => {
            const st = STATUS[e.status];
            return (
              <li key={e.stepId} className="animate-rise relative">
                <span className={cn("absolute -left-[29px] top-0.5 grid size-4 place-items-center rounded-full bg-background")}>
                  <st.icon className={cn("size-4", e.status === "running" && "animate-spin text-primary", e.status === "done" && "text-success", e.status === "failed" && "text-destructive", (e.status === "queued" || e.status === "skipped") && "text-muted-foreground")} aria-hidden />
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{e.tool}</code>
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", st.cls)}>{st.label}</span>
                </div>
                <p className="mt-1 text-sm font-medium">{e.title}</p>
                <p className="mt-0.5 break-all font-mono text-[11px] text-muted-foreground">Details: {e.input}</p>
                {e.output && <p className={cn("mt-1 text-xs", e.status === "failed" ? "text-destructive" : "text-success")}>→ {e.output}</p>}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
