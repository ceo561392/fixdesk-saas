import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import { PageHeading, QueryState, TicketTable } from "../components/ui";
import { useQuery } from "../hooks/useQuery";
import { priorityLabels, statusLabels } from "../lib/labels";
import type { TicketList } from "../types";
export default function Tickets() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("q") ?? "");
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (search !== (params.get("q") ?? "")) {
        const next = new URLSearchParams(params);
        if (search) next.set("q", search);
        else next.delete("q");
        next.delete("page");
        setParams(next, { replace: true });
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, params, setParams]);
  const query = useQuery<TicketList>(`/tickets?${params}`);
  function filter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next);
  }
  const page = query.data?.page ?? Number(params.get("page") ?? 1);
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / 10));
  return (
    <>
      <PageHeading
        title="งานแจ้งซ่อม"
        description="จัดการทุกปัญหา ติดตามความคืบหน้า และส่งต่อให้ทีมไอที"
        action={
          <Link className="button primary" to="/tickets/new">
            <Plus size={18} />
            แจ้งซ่อม
          </Link>
        }
      />
      <section className="panel">
        <div className="filters">
          <label className="search-field">
            <Search size={18} />
            <input
              aria-label="ค้นหางาน"
              placeholder="ค้นหาเลขงาน หรือหัวข้อ…"
              maxLength={160}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <SlidersHorizontal className="filter-icon" size={18} />
          <select
            aria-label="กรองสถานะ"
            value={params.get("status") ?? ""}
            onChange={(e) => filter("status", e.target.value)}
          >
            <option value="">ทุกสถานะ</option>
            {Object.entries(statusLabels).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <select
            aria-label="กรองความสำคัญ"
            value={params.get("priority") ?? ""}
            onChange={(e) => filter("priority", e.target.value)}
          >
            <option value="">ทุกความสำคัญ</option>
            {Object.entries(priorityLabels).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          {params.size > 0 && (
            <button
              className="text-link"
              onClick={() => {
                setSearch("");
                setParams({});
              }}
            >
              ล้างตัวกรอง
            </button>
          )}
        </div>
        <QueryState
          {...query}
          empty={query.data?.items.length === 0}
          retry={query.refresh}
        />
        {query.data && query.data.items.length > 0 && (
          <TicketTable items={query.data.items} />
        )}
        <div className="pagination">
          <span>
            ทั้งหมด {query.data?.total ?? 0} งาน · หน้า {page} จาก {pages}
          </span>
          <div>
            <button
              className="icon-button"
              aria-label="หน้าก่อนหน้า"
              disabled={page <= 1 || query.loading}
              onClick={() => filter("page", String(page - 1))}
            >
              <ChevronLeft size={18} />
            </button>
            <span>{page}</span>
            <button
              className="icon-button"
              aria-label="หน้าถัดไป"
              disabled={page >= pages || query.loading}
              onClick={() => filter("page", String(page + 1))}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
