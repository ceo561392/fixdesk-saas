import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  ArrowRight,
  Ticket,
  Clock3,
  Wrench,
  CheckCircle2,
  Monitor,
} from "lucide-react";
import { PageHeading, QueryState, TicketTable } from "../components/ui";
import { useQuery } from "../hooks/useQuery";
import { useAuth } from "../components/auth";
import { statusLabels } from "../lib/labels";
import type { DashboardData } from "../types";
export default function Dashboard() {
  const [days, setDays] = useState("all");
  const query = useQuery<DashboardData>(`/dashboard?days=${days}`);
  const { user } = useAuth();
  const counts = Object.fromEntries(
    query.data?.byStatus.map((s) => [s.status, s.count]) ?? [],
  );
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const kpis = [
    {
      label: "งานแจ้งซ่อมทั้งหมด",
      value: total,
      icon: Ticket,
      color: "blue",
      note: "ในช่วงเวลาที่เลือก",
    },
    {
      label: "รอดำเนินการ",
      value: (counts.open ?? 0) + (counts.assigned ?? 0),
      icon: Clock3,
      color: "amber",
      note: "รอรับงานหรือเริ่มดำเนินการ",
    },
    {
      label: "กำลังดำเนินการ",
      value: counts.in_progress ?? 0,
      icon: Wrench,
      color: "purple",
      note: "ทีมไอทีกำลังดูแล",
    },
    {
      label: "แก้ไข / ปิดงานแล้ว",
      value: (counts.resolved ?? 0) + (counts.closed ?? 0),
      icon: CheckCircle2,
      color: "green",
      note: "ปัญหาที่ได้รับการแก้ไข",
    },
  ];
  return (
    <>
      <PageHeading
        eyebrow="ภาพรวมการทำงาน"
        title="ทุกงานซ่อม อยู่ในสายตาคุณ"
        description={`สถานะงานไอทีของ ${user?.tenant_name}${user?.role === "requester" ? " · เฉพาะงานที่คุณแจ้ง" : ""}`}
        action={
          <Link className="button primary" to="/tickets/new">
            <Plus size={18} />
            แจ้งซ่อม
          </Link>
        }
      />
      <div className="section-toolbar">
        <div className="live-label">
          <i /> ข้อมูลจากระบบจริง
        </div>
        <label className="inline-label">
          ช่วงเวลา
          <select value={days} onChange={(e) => setDays(e.target.value)}>
            <option value="all">ทุกช่วงเวลา</option>
            <option value="7">7 วันล่าสุด</option>
            <option value="30">30 วันล่าสุด</option>
          </select>
        </label>
      </div>
      <QueryState {...query} retry={query.refresh} />
      {query.data && (
        <>
          <div className="kpi-grid">
            {kpis.map(({ icon: Icon, ...k }) => (
              <div className="kpi-card" key={k.label}>
                <span className={`kpi-icon ${k.color}`}>
                  <Icon size={21} />
                </span>
                <p>{k.label}</p>
                <strong>
                  {k.value}
                  <small>งาน</small>
                </strong>
                <span>{k.note}</span>
              </div>
            ))}
          </div>
          <div className="overview-grid">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>สถานะงานแจ้งซ่อม</h2>
                  <p>ติดตามงานในแต่ละขั้นตอน</p>
                </div>
                <span className="subtle-tag">{total} งาน</span>
              </div>
              <div className="status-chart">
                {Object.entries(statusLabels).map(([status, label]) => (
                  <Link
                    to={`/tickets?status=${status}`}
                    className="chart-row"
                    key={status}
                  >
                    <span>{label}</span>
                    <div className="chart-track">
                      <div
                        className={`chart-bar ${status}`}
                        style={{
                          width: `${total ? Math.max(0, ((counts[status] ?? 0) / total) * 100) : 0}%`,
                        }}
                      />
                    </div>
                    <strong>{counts[status] ?? 0}</strong>
                  </Link>
                ))}
              </div>
            </section>
            <section className="workspace-summary">
              <span className="summary-icon">
                <Monitor size={25} />
              </span>
              <div className="eyebrow">ทะเบียนอุปกรณ์</div>
              <h2>
                ดูแลทุกอุปกรณ์
                <br />
                ได้จากที่เดียว
              </h2>
              <p>
                ดูข้อมูล ประวัติการซ่อม และ QR
                <br />
                สำหรับแจ้งปัญหาของแต่ละอุปกรณ์
              </p>
              <div className="asset-count">
                <strong>{query.data.assetCount}</strong>
                <span>อุปกรณ์ในบริษัท</span>
              </div>
              <Link to="/assets">
                เปิดทะเบียนอุปกรณ์
                <ArrowRight size={18} />
              </Link>
            </section>
          </div>
          <section className="panel recent-panel">
            <div className="panel-heading">
              <div>
                <h2>งานแจ้งซ่อมล่าสุด</h2>
                <p>อัปเดตล่าสุดของพื้นที่ทำงาน</p>
              </div>
              <Link className="text-link" to="/tickets">
                ดูงานทั้งหมด
                <ArrowRight size={16} />
              </Link>
            </div>
            {query.data.recent.length ? (
              <TicketTable items={query.data.recent} />
            ) : (
              <QueryState
                loading={false}
                error=""
                empty
                retry={query.refresh}
              />
            )}
          </section>
        </>
      )}
    </>
  );
}
