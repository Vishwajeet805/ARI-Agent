import { useState } from "react";
import { Clock, Coffee, ListChecks, Plus, ShoppingBasket, Sparkles, Target, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { AppState, BreakSlot, GroceryItem, Task } from "@/lib/daypilot/types";
import { cn } from "@/lib/utils";

function CardHead({ icon: Icon, title, meta }: { icon: typeof Clock; title: string; meta?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2.5">
        <span className="grid size-8 place-items-center rounded-lg bg-primary-soft text-primary">
          <Icon className="size-4" aria-hidden />
        </span>
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      {meta && <span className="text-xs font-medium text-muted-foreground">{meta}</span>}
    </div>
  );
}

export function SummaryStrip({ state }: { state: AppState }) {
  const open = state.tasks.filter((t) => !t.done);
  const focus = open.reduce((n, t) => n + t.minutes, 0);
  const left = state.groceries.filter((g) => !g.done).length;
  const next = state.breaks[0];
  const stats = [
    { icon: Target, label: "Focus planned", value: `${focus} min` },
    { icon: ListChecks, label: "Open tasks", value: String(open.length) },
    { icon: ShoppingBasket, label: "Items to buy", value: String(left) },
    { icon: Coffee, label: "Next break", value: next ? fmtTime(next.startsAt) : "—" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="glass-card flex items-center gap-3 p-4">
          <s.icon className="size-5 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="truncate text-lg font-semibold tabular-nums">{s.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function TasksCard({ tasks, onToggle, onRemove }: { tasks: Task[]; onToggle: (id: string) => void; onRemove: (id: string) => void }) {
  const done = tasks.filter((t) => t.done).length;
  return (
    <section className="glass-card p-5" aria-labelledby="tasks-h">
      <CardHead icon={ListChecks} title="Tasks" meta={`${done}/${tasks.length} done`} />
      {tasks.length === 0 ? (
        <Empty text="No tasks yet. Ask DayPilot to plan some focus time." />
      ) : (
        <ul className="space-y-2">
          {tasks.map((t) => (
            <li key={t.id} className="group animate-rise flex items-center gap-3 rounded-xl border bg-background/60 px-3 py-2.5 transition-colors hover:border-primary/30">
              <Checkbox id={t.id} checked={t.done} onCheckedChange={() => onToggle(t.id)} aria-label={`Mark ${t.title} ${t.done ? "not done" : "done"}`} />
              <label htmlFor={t.id} className={cn("flex-1 cursor-pointer text-sm", t.done && "text-muted-foreground line-through")}>
                {t.title}
              </label>
              {t.source === "agent" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground">
                  <Sparkles className="size-3" aria-hidden /> DayPilot
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-xs tabular-nums text-muted-foreground">
                <Clock className="size-3" aria-hidden />{t.minutes}m
              </span>
              <button onClick={() => onRemove(t.id)} aria-label={`Remove ${t.title}`} className="rounded p-1 text-muted-foreground opacity-0 transition hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100">
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function GroceryCard({
  title, items, onToggle, onRemove, onAdd, onRename,
}: {
  title: string; items: GroceryItem[];
  onToggle: (id: string) => void; onRemove: (id: string) => void;
  onAdd: (name: string) => void; onRename: (id: string, name: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <section className="glass-card p-5" aria-labelledby="grocery-h">
      <CardHead icon={ShoppingBasket} title={title} meta={`${items.filter((i) => !i.done).length} left`} />
      {items.length === 0 ? (
        <Empty text="Your list is empty." />
      ) : (
        <ul className="space-y-1.5">
          {items.map((i) => (
            <li key={i.id} className="group animate-rise flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted">
              <Checkbox checked={i.done} onCheckedChange={() => onToggle(i.id)} aria-label={`Got ${i.name}`} />
              {editing === i.id ? (
                <Input
                  autoFocus defaultValue={i.name} aria-label="Edit item name" className="h-7"
                  onBlur={(e) => { onRename(i.id, e.target.value); setEditing(null); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { onRename(i.id, e.currentTarget.value); setEditing(null); }
                    if (e.key === "Escape") setEditing(null);
                  }}
                />
              ) : (
                <button onClick={() => setEditing(i.id)} className={cn("flex-1 text-left text-sm", i.done && "text-muted-foreground line-through")} aria-label={`Edit ${i.name}`}>
                  {i.name}
                </button>
              )}
              {i.suggested && <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-medium text-foreground">suggested</span>}
              <button onClick={() => onRemove(i.id)} aria-label={`Remove ${i.name}`} className="rounded p-1 text-muted-foreground opacity-0 transition hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100">
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => { e.preventDefault(); if (draft.trim()) { onAdd(draft.trim()); setDraft(""); } }}
      >
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add an item" aria-label="New grocery item" className="h-9" />
        <Button type="submit" size="sm" variant="outline" aria-label="Add item"><Plus className="size-4" /></Button>
      </form>
    </section>
  );
}

export function BreakCard({ breaks, onRemove }: { breaks: BreakSlot[]; onRemove: (id: string) => void }) {
  return (
    <section className="glass-card p-5">
      <CardHead icon={Coffee} title="Schedule" meta="in-app only" />
      {breaks.length === 0 ? (
        <Empty text="No breaks scheduled." />
      ) : (
        <ul className="space-y-2">
          {breaks.map((b) => {
            const end = new Date(new Date(b.startsAt).getTime() + b.minutes * 60_000).toISOString();
            return (
              <li key={b.id} className="group animate-rise flex items-center gap-3 rounded-xl bg-gradient-accent p-3 text-primary-foreground shadow-glow">
                <Coffee className="size-5" aria-hidden />
                <div className="flex-1">
                  <p className="text-sm font-semibold">{b.title}</p>
                  <p className="text-xs opacity-85 tabular-nums">{fmtTime(b.startsAt)} – {fmtTime(end)} · {b.minutes} min</p>
                </div>
                <button onClick={() => onRemove(b.id)} aria-label={`Remove ${b.title}`} className="rounded p-1 opacity-70 hover:opacity-100">
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">{text}</p>;
}
