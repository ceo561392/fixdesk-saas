import { useState } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Pencil,
  UserRound,
  MapPin,
  Monitor,
  History,
  Save,
} from "lucide-react";
import { useQuery } from "../hooks/useQuery";
import { useAuth } from "../components/auth";
import { Badge, ErrorMessage, PageHeading, QueryState } from "../components/ui";
import TicketForm from "../components/TicketForm";
import { send } from "../lib/api";
import { statusLabels, dateTime } from "../lib/labels";
import type { Member, Ticket } from "../types";
const transitions: Record<string, string[]> = {
  open: ["assigned", "cancelled"],
  assigned: ["open", "in_progress", "cancelled"],
  in_progress: ["resolved", "cancelled"],
  resolved: ["closed", "in_progress"],
  closed: [],
  cancelled: ["open"],
};
const eventLabels: Record<string, string> = {
  created: "สร้างงานแจ้งซ่อม",
  status: "เปลี่ยนสถานะ",
  assignee_id: "มอบหมายช่าง",
  title: "แก้ไขหัวข้อ",
  description: "แก้ไขรายละเอียด",
  priority: "เปลี่ยนความสำคัญ",
  location: "แก้ไขสถานที่",
};
export default function TicketDetail() {
  const { id } = useParams();
  const query = useQuery<Ticket>(`/tickets/${id}`);
  const { user } = useAuth();
  const techs = useQuery<Member[]>(
    user?.role === "requester" ? null : "/members/technicians",
  );
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [assignee, setAssignee] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const location = useLocation();
  const ticket = query.data;
  const canUpdate =
    user?.role === "admin" ||
    (user?.role === "technician" && ticket?.assignee_id === user.id);
  async function update(fields: object) {
    if (!ticket) return;
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      await send(`/tickets/${id}`, "PATCH", {
        version: ticket.version,
        ...fields,
      });
      setStatus("");
      setAssignee(null);
      setSaved(true);
      query.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const displayValue = (kind: string, value: string | null) => {
    if (value === null) return "ไม่ได้ระบุ";
    if (kind === "status" || kind === "created")
      return statusLabels[value] ?? value;
    if (kind === "assignee_id")
      return techs.data?.find((t) => t.id === value)?.name ?? "ช่างไอที";
    if (kind === "description")
      return value.length > 100 ? value.slice(0, 100) + "…" : value;
    return value;
  };
  return (
    <>
      <Link className="back-link" to="/tickets">
        <ArrowLeft size={16} />
        กลับสู่งานแจ้งซ่อม
      </Link>
      <QueryState {...query} retry={query.refresh} />
      {ticket && (
        <>
          <PageHeading
            eyebrow={ticket.ticket_no}
            title={ticket.title}
            description={`แจ้งเมื่อ ${dateTime(ticket.created_at)} · ${ticket.requester_name}`}
            action={<Badge value={ticket.status} />}
          />
          {(location.state?.created || saved) && (
            <div className="success-message" role="status">
              <CheckCircle2 size={18} />
              {saved
                ? "บันทึกการเปลี่ยนแปลงแล้ว"
                : "สร้างงานแจ้งซ่อมเรียบร้อยแล้ว"}
            </div>
          )}
          <ErrorMessage message={error} />
          <div className="detail-grid">
            <div>
              <section className="panel detail-panel">
                <div className="panel-heading">
                  <h2>รายละเอียดปัญหา</h2>
                  {(canUpdate ||
                    (user?.role === "requester" &&
                      !["resolved", "closed", "cancelled"].includes(
                        ticket.status,
                      ))) && (
                    <button
                      className="text-link"
                      onClick={() => setEditing(!editing)}
                    >
                      <Pencil size={16} />
                      {editing ? "ปิดการแก้ไข" : "แก้ไขรายละเอียด"}
                    </button>
                  )}
                </div>
                {editing ? (
                  <div className="panel-body">
                    <TicketForm
                      key={ticket.version}
                      ticket={ticket}
                      onSaved={() => {
                        setEditing(false);
                        query.refresh();
                      }}
                    />
                  </div>
                ) : (
                  <>
                    <div className="description-text">{ticket.description}</div>
                    <div className="detail-facts">
                      <div>
                        <Monitor size={18} />
                        <span>
                          อุปกรณ์
                          {ticket.asset_id ? (
                            <Link to={`/assets/${ticket.asset_id}`}>
                              {ticket.asset_code} · {ticket.asset_name}
                            </Link>
                          ) : (
                            <strong>ไม่ได้ระบุอุปกรณ์</strong>
                          )}
                        </span>
                      </div>
                      <div>
                        <MapPin size={18} />
                        <span>
                          สถานที่<strong>{ticket.location}</strong>
                        </span>
                      </div>
                      <div>
                        <UserRound size={18} />
                        <span>
                          ผู้แจ้ง<strong>{ticket.requester_name}</strong>
                        </span>
                      </div>
                      <div>
                        <Clock3 size={18} />
                        <span>
                          ความสำคัญ
                          <Badge value={ticket.priority} priority />
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </section>
              <section className="panel timeline-panel">
                <div className="panel-heading">
                  <h2>
                    <History size={19} />
                    ประวัติการดำเนินงาน
                  </h2>
                  <span className="subtle-tag">Audit trail</span>
                </div>
                <div className="timeline">
                  {ticket.events?.map((e) => (
                    <div className="timeline-event" key={e.id}>
                      <span className="timeline-dot" />
                      <div>
                        <strong>
                          {eventLabels[e.event_type] ?? e.event_type}
                        </strong>
                        <p>
                          {e.old_value && (
                            <>{displayValue(e.event_type, e.old_value)} → </>
                          )}
                          {displayValue(e.event_type, e.new_value)}
                        </p>
                        <small>
                          {e.actor_name} · {dateTime(e.created_at)}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
            <aside>
              <section className="panel control-panel">
                <h2>จัดการงาน</h2>
                <div className="control-section">
                  <label>ผู้รับผิดชอบ</label>
                  {user?.role === "admin" ? (
                    <>
                      <select
                        aria-label="มอบหมายช่าง"
                        value={assignee ?? ticket.assignee_id ?? ""}
                        onChange={(e) => setAssignee(e.target.value)}
                      >
                        <option value="">ยังไม่มอบหมาย</option>
                        {techs.data?.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                      <ErrorMessage message={techs.error} />
                      <button
                        className="button secondary full"
                        disabled={busy || assignee === null || techs.loading}
                        onClick={() =>
                          update({ assignee_id: assignee || null })
                        }
                      >
                        <UserRound size={16} />
                        บันทึกผู้รับผิดชอบ
                      </button>
                    </>
                  ) : (
                    <strong>{ticket.assignee_name ?? "ยังไม่มอบหมาย"}</strong>
                  )}
                </div>
                <div className="control-section">
                  <label>สถานะงาน</label>
                  {canUpdate && transitions[ticket.status]?.length ? (
                    <>
                      <select
                        aria-label="เปลี่ยนสถานะ"
                        value={status || ticket.status}
                        onChange={(e) => setStatus(e.target.value)}
                      >
                        <option value={ticket.status}>
                          {statusLabels[ticket.status]}
                        </option>
                        {transitions[ticket.status]?.map((s) => (
                          <option key={s} value={s}>
                            {statusLabels[s]}
                          </option>
                        ))}
                      </select>
                      <button
                        className="button primary full"
                        disabled={busy || !status}
                        onClick={() => update({ status })}
                      >
                        <Save size={16} />
                        บันทึกสถานะ
                      </button>
                    </>
                  ) : (
                    <>
                      <Badge value={ticket.status} />
                      <p className="muted">
                        {user?.role === "requester"
                          ? "ทีมไอทีเป็นผู้ดูแลสถานะงาน"
                          : canUpdate
                            ? "งานนี้สิ้นสุดแล้ว"
                            : "อัปเดตได้เฉพาะงานที่คุณได้รับมอบหมาย"}
                      </p>
                    </>
                  )}
                </div>
                {ticket.resolved_at && (
                  <div className="resolved-note">
                    <CheckCircle2 size={19} />
                    <span>
                      แก้ไขเมื่อ
                      <br />
                      {dateTime(ticket.resolved_at)}
                    </span>
                  </div>
                )}
                <small className="muted">
                  อัปเดตล่าสุด {dateTime(ticket.updated_at)}
                </small>
              </section>
            </aside>
          </div>
        </>
      )}
    </>
  );
}
