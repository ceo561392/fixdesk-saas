import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Monitor,
  Search,
  MapPin,
  ArrowUpRight,
  ScanLine,
} from "lucide-react";
import { PageHeading, QueryState } from "../components/ui";
import { useQuery } from "../hooks/useQuery";
import { useAuth } from "../components/auth";
import { assetStatusLabels } from "../lib/labels";
import type { Asset } from "../types";
export default function Assets() {
  const query = useQuery<Asset[]>("/assets");
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const items = query.data?.filter(
    (a) =>
      (!status || a.status === status) &&
      `${a.name} ${a.asset_code} ${a.location}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        title="ทะเบียนอุปกรณ์"
        description="ข้อมูลอุปกรณ์ ประวัติการซ่อม และ QR สำหรับแจ้งปัญหา"
        action={
          user?.role === "admin" && (
            <Link className="button primary" to="/assets/new">
              <Plus size={18} />
              เพิ่มอุปกรณ์
            </Link>
          )
        }
      />
      <div className="asset-toolbar">
        <label className="search-field">
          <Search size={18} />
          <input
            aria-label="ค้นหาอุปกรณ์"
            placeholder="ค้นหาชื่อ รหัส หรือสถานที่…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          aria-label="กรองสถานะอุปกรณ์"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">ทุกสถานะ</option>
          {Object.entries(assetStatusLabels).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <span className="muted">{items?.length ?? 0} อุปกรณ์</span>
      </div>
      <QueryState
        {...query}
        empty={items?.length === 0}
        retry={query.refresh}
      />
      {query.data && (
        <div className="asset-grid">
          {items?.map((a) => (
            <Link className="asset-card" key={a.id} to={`/assets/${a.id}`}>
              <div className="asset-card-top">
                <span className="asset-icon">
                  <Monitor size={25} />
                </span>
                <span className={`asset-status ${a.status}`}>
                  <i />
                  {assetStatusLabels[a.status]}
                </span>
              </div>
              <small>{a.asset_code}</small>
              <h2>{a.name}</h2>
              <span className="asset-category">{a.category}</span>
              <p>
                <MapPin size={15} />
                {a.location}
              </p>
              <div className="asset-card-bottom">
                <span>
                  <ScanLine size={16} />
                  ข้อมูลและ QR Code
                </span>
                <ArrowUpRight size={18} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
