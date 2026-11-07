"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Modal } from "@/components/leads/modal";
import { btn, btnPrimary } from "@/components/leads/ui";
import { createMeeting, updateMeeting } from "@/app/(app)/meetings/actions";
import { MEETING_TYPES, MEETING_STATUSES, type MeetingDTO } from "@/lib/meeting-schema";

type V = { leadId: string; title: string; date: string; startTime: string; endTime: string; type: string; link: string; location: string; agenda: string; notes: string; outcome: string; nextAction: string; status: string };
const field = (label: string, err: string | undefined, node: React.ReactNode, span = false) => (
  <label className={`block text-sm font-medium ${span ? "sm:col-span-2" : ""}`}>{label}{node}{err && <span className="mt-1 block text-xs font-normal text-red-500">{err}</span>}</label>
);

export function MeetingDialog({ meeting, lead, leads, defaultDate, onClose, onSaved }: {
  meeting?: MeetingDTO; lead?: { id: string; name: string }; leads?: { id: string; businessName: string }[]; defaultDate?: string; onClose: () => void; onSaved: () => void;
}) {
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<V>({
    defaultValues: {
      leadId: meeting?.leadId ?? lead?.id ?? "", title: meeting?.title ?? "", date: meeting?.date ?? defaultDate ?? "", startTime: meeting?.startTime ?? "", endTime: meeting?.endTime ?? "",
      type: meeting?.type ?? "ONLINE", link: meeting?.link ?? "", location: meeting?.location ?? "", agenda: meeting?.agenda ?? "", notes: meeting?.notes ?? "",
      outcome: meeting?.outcome ?? "", nextAction: meeting?.nextAction ?? "", status: meeting?.status ?? "SCHEDULED",
    },
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const options = (leads ?? []).filter((l) => l.businessName.toLowerCase().includes(q.toLowerCase())).slice(0, 300);

  const submit = handleSubmit(async (v) => {
    setFormError(null);
    const r = meeting ? await updateMeeting(meeting.id, v) : await createMeeting(v);
    if (!r.ok) { setFormError(r.error); for (const [k, m] of Object.entries(r.fieldErrors ?? {})) setError(k as keyof V, { message: m }); return; }
    onSaved();
  });
  return (
    <Modal title={meeting ? "Edit Meeting" : "Schedule Meeting"} onClose={onClose} wide>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        {lead ? <p className="text-sm sm:col-span-2">Business: <b>{lead.name}</b><input type="hidden" {...register("leadId")} /></p>
          : meeting ? <p className="text-sm sm:col-span-2">Business: <b>{meeting.businessName}</b><input type="hidden" {...register("leadId")} /></p>
          : <div className="space-y-1.5 sm:col-span-2">
              <input className="input" placeholder="Filter businesses…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter businesses" />
              {field("Business", errors.leadId?.message, <select className="input mt-1.5" {...register("leadId")}><option value="">Select business…</option>{options.map((l) => <option key={l.id} value={l.id}>{l.businessName}</option>)}</select>)}
            </div>}
        {field("Meeting title", errors.title?.message, <input className="input mt-1.5" {...register("title")} autoFocus />, true)}
        {field("Date (Asia/Dhaka)", errors.date?.message, <input type="date" className="input mt-1.5" {...register("date")} />)}
        {field("Type", errors.type?.message, <select className="input mt-1.5" {...register("type")}>{Object.entries(MEETING_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>)}
        {field("Start time", errors.startTime?.message, <input type="time" className="input mt-1.5" {...register("startTime")} />)}
        {field("End time", errors.endTime?.message, <input type="time" className="input mt-1.5" {...register("endTime")} />)}
        {field("Meeting link", errors.link?.message, <input className="input mt-1.5" placeholder="https://meet.google.com/…" {...register("link")} />)}
        {field("Location", errors.location?.message, <input className="input mt-1.5" {...register("location")} />)}
        {field("Status", errors.status?.message, <select className="input mt-1.5" {...register("status")}>{Object.entries(MEETING_STATUSES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>)}
        <span />
        {field("Agenda", errors.agenda?.message, <textarea rows={2} className="input mt-1.5" {...register("agenda")} />, true)}
        {field("Notes", errors.notes?.message, <textarea rows={2} className="input mt-1.5" {...register("notes")} />, true)}
        {field("Outcome", errors.outcome?.message, <textarea rows={2} className="input mt-1.5" {...register("outcome")} />)}
        {field("Next action", errors.nextAction?.message, <textarea rows={2} className="input mt-1.5" {...register("nextAction")} />)}
        {formError && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 sm:col-span-2 dark:text-red-400">{formError}</p>}
        <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={onClose} className={btn}>Cancel</button><button disabled={isSubmitting} className={btnPrimary}>{isSubmitting ? "Saving…" : meeting ? "Save changes" : "Schedule"}</button></div>
      </form>
    </Modal>
  );
}
