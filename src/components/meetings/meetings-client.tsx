"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, parseISO, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { MeetingDialog } from "./meeting-dialog";
import { useQs } from "@/components/leads/use-qs";
import { btn, btnPrimary, cellSelect } from "@/components/leads/ui";
import { setMeetingStatus, deleteMeeting } from "@/app/(app)/meetings/actions";
import { MEETING_STATUSES, MEETING_TYPES, type MeetingDTO } from "@/lib/meeting-schema";

const VIEWS = [["calendar", "Calendar"], ["table", "Table"], ["upcoming", "Upcoming"], ["today", "Today"], ["completed", "Completed"], ["cancelled", "Cancelled"]] as const;
const tone: Record<string, string> = {
  SCHEDULED: "bg-primary/10 text-primary", COMPLETED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  CANCELLED: "bg-red-500/10 text-red-600 line-through dark:text-red-400", RESCHEDULED: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

export function MeetingsClient({ meetings, view, month, today, leads }: { meetings: MeetingDTO[]; view: string; month: string; today: string; leads: { id: string; businessName: string }[] }) {
  const router = useRouter();
  const { set } = useQs();
  const [edit, setEdit] = useState<{ meeting?: MeetingDTO; date?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const done = () => { setEdit(null); router.refresh(); };

  async function status(m: MeetingDTO, s: string) { const r = await setMeetingStatus(m.id, s); if (!r.ok) setError(r.error); else { setError(null); router.refresh(); } }
  async function remove(m: MeetingDTO) { if (!confirm(`Delete "${m.title}"?`)) return; const r = await deleteMeeting(m.id); if (!r.ok) setError(r.error); else router.refresh(); }

  const first = parseISO(`${month}-01`);
  const days = eachDayOfInterval({ start: startOfWeek(first, { weekStartsOn: 6 }), end: endOfWeek(endOfMonth(first), { weekStartsOn: 6 }) });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-2xl font-semibold tracking-tight">Meetings</h1><p className="text-sm text-muted">All times in Asia/Dhaka</p></div>
        <button className={btnPrimary} onClick={() => setEdit({})}><Plus size={15} />New Meeting</button>
      </div>
      <div role="tablist" className="flex flex-wrap gap-1 rounded-xl border border-line bg-card p-1">
        {VIEWS.map(([v, l]) => <button key={v} role="tab" aria-selected={view === v} onClick={() => set({ view: v, month: null })} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${view === v ? "bg-primary/10 text-primary" : "text-muted hover:text-fg"}`}>{l}</button>)}
      </div>
      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}

      {view === "calendar" ? (
        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <button className={btn} aria-label="Previous month" onClick={() => set({ view: "calendar", month: format(addMonths(first, -1), "yyyy-MM") })}><ChevronLeft size={15} /></button>
            <h2 className="font-semibold">{format(first, "MMMM yyyy")}</h2>
            <button className={btn} aria-label="Next month" onClick={() => set({ view: "calendar", month: format(addMonths(first, 1), "yyyy-MM") })}><ChevronRight size={15} /></button>
          </div>
          <div className="overflow-x-auto"><div className="grid min-w-[760px] grid-cols-7 gap-px overflow-hidden rounded-xl border border-line bg-line">
            {["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"].map((d) => <div key={d} className="bg-elev px-2 py-1.5 text-xs font-medium text-muted">{d}</div>)}
            {days.map((d) => {
              const key = format(d, "yyyy-MM-dd"); const list = meetings.filter((m) => m.date === key); const inMonth = format(d, "yyyy-MM") === month;
              return (
                <div key={key} onClick={() => setEdit({ date: key })} className={`min-h-[104px] cursor-pointer bg-card p-1.5 transition hover:bg-elev ${inMonth ? "" : "opacity-45"}`}>
                  <span className={`inline-grid h-6 w-6 place-items-center rounded-full text-xs ${key === today ? "bg-primary font-semibold text-white dark:text-[#0B1120]" : "text-muted"}`}>{format(d, "d")}</span>
                  <div className="mt-1 space-y-1">
                    {list.slice(0, 3).map((m) => <button key={m.id} onClick={(e) => { e.stopPropagation(); setEdit({ meeting: m }); }} title={`${m.startTime} ${m.title} — ${m.businessName}`} className={`block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium ${tone[m.status]}`}>{m.startTime} {m.businessName}</button>)}
                    {list.length > 3 && <p className="px-1 text-[11px] text-muted">+{list.length - 3} more</p>}
                  </div>
                </div>);
            })}
          </div></div>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-line bg-elev text-xs uppercase tracking-wide text-muted"><tr>{["Date & time", "Business", "Title", "Type", "Status", "Outcome / next action", ""].map((h) => <th key={h} className="px-3 py-3 font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-line">
              {meetings.map((m) => (
                <tr key={m.id} className="hover:bg-elev/60">
                  <td className="whitespace-nowrap px-3 py-2.5">{format(parseISO(m.date), "EEE, d MMM yyyy")}<br /><span className="text-xs text-muted">{m.startTime}{m.endTime ? ` – ${m.endTime}` : ""}</span></td>
                  <td className="px-3 py-2.5 font-medium">{m.businessName}</td>
                  <td className="px-3 py-2.5">{m.title}</td>
                  <td className="px-3 py-2.5"><span>{MEETING_TYPES[m.type]}</span>{m.type === "ONLINE" && m.link && <a href={m.link} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary"><ExternalLink size={12} />Join</a>}{m.location && <p className="text-xs text-muted">{m.location}</p>}</td>
                  <td className="px-3 py-2.5"><select aria-label="Status" className={`${cellSelect} ${tone[m.status].replace("line-through", "")} font-medium`} value={m.status} onChange={(e) => status(m, e.target.value)}>{Object.entries(MEETING_STATUSES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></td>
                  <td className="max-w-[260px] px-3 py-2.5 text-xs text-muted">{m.outcome && <p className="line-clamp-2"><b className="text-fg">Outcome:</b> {m.outcome}</p>}{m.nextAction && <p className="line-clamp-2"><b className="text-fg">Next:</b> {m.nextAction}</p>}{!m.outcome && !m.nextAction && "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right"><button aria-label="Edit meeting" className="mr-2 text-muted hover:text-primary" onClick={() => setEdit({ meeting: m })}><Pencil size={15} /></button><button aria-label="Delete meeting" className="text-muted hover:text-red-500" onClick={() => remove(m)}><Trash2 size={15} /></button></td>
                </tr>))}
              {meetings.length === 0 && <tr><td colSpan={7} className="px-4 py-14 text-center text-muted">No meetings in this view.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {edit && <MeetingDialog meeting={edit.meeting} leads={leads} defaultDate={edit.date} onClose={() => setEdit(null)} onSaved={done} />}
    </div>
  );
}
