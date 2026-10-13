import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Inbox, LoaderCircle, AlertCircle } from "lucide-react";
import { statusLabels, priorityLabels, date } from "../lib/labels";
import type { Ticket } from "../types";
export function Badge({
  value,
  priority = false,
}: {
  value: string;
  priority?: boolean;
}) {
  return (
    <span className={`badge ${priority ? "priority " : ""}${value}`}>
      <i />
      {(priority ? priorityLabels : statusLabels)[value] ?? value}
    </span>
  );
}
export function ErrorMessage({ message }: { message: string }) {
  return message ? (
    <div className="error-message" role="alert">
      <AlertCircle size={17} />
      {message}
    </div>
  ) : null;
}
export function QueryState({
  loading,
  error,
  empty = false,
  retry,
}: {
  loading: boolean;
  error: string;
  empty?: boolean;
  retry: () => void;
}) {
  if (loading)
    return (
      <div className="state">
        <LoaderCircle className="spin" size={24} />
        <span>กำลังโหลดข้อมูล…</span>
      </div>
    );
  if (error)
    return (
      <div className="state">
        <ErrorMessage message={error} />
        <button className="button secondary" onClick={retry}>
          ลองใหม่
        </button>
      </div>
    );
  if (empty)
    return (
      <div className="state">
        <Inbox size={36} />
        <strong>ยังไม่มีรายการ</strong>
        <span>เพิ่มรายการใหม่ หรือปรับตัวกรองเพื่อดูข้อมูล</span>
      </div>
    );
  return null;
}
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow ?? "FIXDESK WORKSPACE"}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function TicketTable({ items }: { items: Ticket[] }) {
  return (
    <div className="table-scroll">
      <table className="ticket-table">
        <thead>
          <tr>
            <th>งานแจ้งซ่อม</th>
            <th>อุปกรณ์ / สถานที่</th>
            <th>ผู้รับผิดชอบ</th>
            <th>ความสำคัญ</th>
            <th>สถานะ</th>
            <th>วันที่แจ้ง</th>
            <th>
              <span className="sr-only">เปิดงาน</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((t) => (
            <tr key={t.id}>
              <td>
                <Link className="ticket-title" to={`/tickets/${t.id}`}>
                  <small>{t.ticket_no}</small>
                  <strong>{t.title}</strong>
                  <span className="requester">{t.requester_name}</span>
                </Link>
              </td>
              <td>
                <strong>{t.asset_name ?? "ไม่ได้ระบุอุปกรณ์"}</strong>
                <small>{t.location}</small>
              </td>
              <td>
                {t.assignee_name ? (
                  <span className="person">
                    <span className="avatar small">{t.assignee_name[0]}</span>
                    {t.assignee_name}
                  </span>
                ) : (
                  <span className="muted">ยังไม่มอบหมาย</span>
                )}
              </td>
              <td>
                <Badge value={t.priority} priority />
              </td>
              <td>
                <Badge value={t.status} />
              </td>
              <td className="muted">{date(t.created_at)}</td>
              <td>
                <Link
                  className="icon-link"
                  aria-label={`เปิด ${t.ticket_no}`}
                  to={`/tickets/${t.id}`}
                >
                  <ArrowUpRight size={18} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
