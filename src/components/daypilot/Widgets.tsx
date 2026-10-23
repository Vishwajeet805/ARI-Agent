import { useState } from "react";
import { Clock, Coffee, ListChecks, Pencil, Plus, ShoppingBasket, Sparkles, Target, Trash2 } from "lucide-react";
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
  const total = state.tasks.length;
  const completed = total - open.length;
  const progress = total ? Math.round((completed / total) * 100) : 0;
  const nextTask = open[0];
  const stats = [
    { icon: Target, label: "Focus planned", value: `${focus} min` },
    { icon: ListChecks, label: "Open tasks", value: String(open.length) },
    { icon: ShoppingBasket, label: "Items to buy", value: String(left) },
    { icon: Coffee, label: "Next break", value: next ? fmtTime(next.startsAt) : "—" },
  ];
  return (
    <section className="space-y-3" aria-label="Today's progress and next action">
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
      <div className="glass-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">Today's task progress</p>
          <p className="text-xs tabular-nums text-muted-foreground">{completed} of {total} complete · {progress}%</p>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Today's task completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
          <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Next action: </span>
          {nextTask ? `${nextTask.title} · ${nextTask.minutes} min` : total ? "All tasks completed — enjoy your breathing room." : "Add a task or ask DayPilot to plan your focus time."}
        </p>
        {next && <p className="mt-1 text-xs text-muted-foreground">Next break: {fmtTime(next.startsAt)} ({next.minutes} min). Times are local; DayPilot does not send notifications.</p>}
      </div>
    </section>
  );
}

export function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function TasksCard({ tasks, onToggle, onRemove, onAdd, onEdit }: {
  tasks: Task[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: (title: string, minutes: number) => void;
  onEdit: (id: string, title: string, minutes: number) => void;
}) {
  const done = tasks.filter((t) => t.done).length;
  const [draftTitle, setDraftTitle] = useState("");
  const [draftMinutes, setDraftMinutes] = useState("25");
  const [editing, setEditing] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMinutes, setEditMinutes] = useState("25");
  const commitEdit = (id: string) => {
    const title = editTitle.trim();
    const minutes = Number(editMinutes);
    if (title && Number.isInteger(minutes) && minutes >= 1 && minutes <= 240) onEdit(id, title, minutes);
    setEditing(null);
  };
  return (
    <section className="glass-card p-5" aria-labelledby="tasks-h">
      <CardHead icon={ListChecks} title="Tasks" meta={`${done}/${tasks.length} done`} />
      {tasks.length === 0 ? (
        <Empty text="No tasks yet. Ask DayPilot to plan some focus time." />
      ) : (
        <ul className="space-y-2">
          {tasks.map((t) => (
            <li key={t.id} className="group animate-rise flex flex-wrap items-center gap-2 rounded-xl border bg-background/60 px-3 py-2.5 transition-colors hover:border-primary/30 sm:flex-nowrap sm:gap-3">
              <Checkbox id={t.id} checked={t.done} onCheckedChange={() => onToggle(t.id)} aria-label={`Mark ${t.title} ${t.done ? "not done" : "done"}`} />
              {editing === t.id ? (
                <div className="flex min-w-0 flex-1 flex-wrap gap-1 sm:flex-nowrap">
                  <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} aria-label="Edit task title" className="h-7 min-w-0" />
                  <Input type="number" min={1} max={240} value={editMinutes} onChange={(e) => setEditMinutes(e.target.value)} aria-label="Edit task minutes" className="h-7 w-20 shrink-0" />
                  <Button size="sm" variant="outline" onClick={() => commitEdit(t.id)}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                </div>
              ) : (
                <button type="button" onClick={() => { setEditing(t.id); setEditTitle(t.title); setEditMinutes(String(t.minutes)); }} className={cn("flex-1 cursor-pointer text-left text-sm", t.done && "text-muted-foreground line-through")} aria-label={`Edit task ${t.title}`}>
                  {t.title}
                </button>
              )}
              {t.source === "agent" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground">
                  <Sparkles className="size-3" aria-hidden /> DayPilot
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-xs tabular-nums text-muted-foreground">
                <Clock className="size-3" aria-hidden />{t.minutes}m
              </span>
              <button onClick={() => onRemove(t.id)} aria-label={`Remove ${t.title}`} className="rounded p-1 text-muted-foreground transition hover:text-destructive focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100">
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form className="mt-3 flex gap-2" onSubmit={(e) => {
        e.preventDefault();
        const title = draftTitle.trim();
        const minutes = Number(draftMinutes);
        if (!title || !Number.isInteger(minutes) || minutes < 1 || minutes > 240) return;
        onAdd(title, minutes); setDraftTitle(""); setDraftMinutes("25");
      }}>
        <Input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} placeholder="Add a task" aria-label="New task title" className="h-9" />
        <Input type="number" min={1} max={240} value={draftMinutes} onChange={(e) => setDraftMinutes(e.target.value)} aria-label="Task duration in minutes" className="h-9 w-24" />
        <Button type="submit" size="sm" variant="outline" aria-label="Add task"><Plus className="size-4" /></Button>
      </form>
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

export function BreakCard({ breaks, onRemove, onEdit }: {
  breaks: BreakSlot[];
  onRemove: (id: string) => void;
  onEdit: (id: string, title: string, minutes: number, startsAt: string) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState("10");
  const [startsAt, setStartsAt] = useState("");
  const beginEdit = (b: BreakSlot) => {
    setEditing(b.id);
    setTitle(b.title);
    setMinutes(String(b.minutes));
    const local = new Date(b.startsAt);
    setStartsAt(new Date(local.getTime() - local.getTimezoneOffset() * 60_000).toISOString().slice(0, 16));
  };
  const save = (id: string) => {
    const cleanTitle = title.trim();
    const duration = Number(minutes);
    const date = new Date(startsAt);
    if (!cleanTitle || !Number.isInteger(duration) || duration < 1 || duration > 180 || !Number.isFinite(date.getTime())) {
      return;
    }
    onEdit(id, cleanTitle, duration, date.toISOString());
    setEditing(null);
  };
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
              <li key={b.id} className="group animate-rise rounded-xl bg-gradient-accent p-3 text-primary-foreground shadow-glow">
                {editing === b.id ? (
                  <div className="space-y-2 text-foreground">
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Break title" maxLength={80} />
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="number" min={1} max={180} value={minutes} onChange={(e) => setMinutes(e.target.value)} aria-label="Break duration minutes" />
                      <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} aria-label="Break start date and time" />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                      <Button size="sm" onClick={() => save(b.id)}>Save break</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Coffee className="size-5" aria-hidden />
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{b.title}</p>
                      <p className="text-xs opacity-85 tabular-nums">{fmtTime(b.startsAt)} – {fmtTime(end)} · {b.minutes} min</p>
                    </div>
                    <button type="button" onClick={() => beginEdit(b)} aria-label={`Edit ${b.title}`} className="rounded p-1 opacity-75 hover:opacity-100 focus-visible:opacity-100">
                      <Pencil className="size-3.5" />
                    </button>
                    <button type="button" onClick={() => onRemove(b.id)} aria-label={`Remove ${b.title}`} className="rounded p-1 opacity-75 hover:opacity-100 focus-visible:opacity-100">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                )}
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
