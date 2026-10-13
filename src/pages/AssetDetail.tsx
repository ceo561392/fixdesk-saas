import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft,
  Plus,
  Pencil,
  ScanLine,
  MapPin,
  Monitor,
  Printer,
} from "lucide-react";
import { useAuth } from "../components/auth";
import { useQuery } from "../hooks/useQuery";
import { PageHeading, QueryState, TicketTable } from "../components/ui";
import AssetForm from "../components/AssetForm";
import { assetStatusLabels, date } from "../lib/labels";
import type { Asset, Ticket } from "../types";
export default function AssetDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const query = useQuery<Asset>(`/assets/${id}`);
  const history = useQuery<Ticket[]>(
    query.data ? `/assets/${id}/tickets` : null,
  );
  const [editing, setEditing] = useState(false);
  const asset = query.data;
  const report = `/report?asset=${encodeURIComponent(id ?? "")}`;
  return (
    <>
      <Link className="back-link" to="/assets">
        <ArrowLeft size={16} />
        กลับสู่ทะเบียนอุปกรณ์
      </Link>
      <QueryState {...query} retry={query.refresh} />
      {asset && (
        <>
          <PageHeading
            eyebrow={asset.asset_code}
            title={asset.name}
            description={`เพิ่มเมื่อ ${date(asset.created_at)} · ${asset.category}`}
            action={
              user?.role === "admin" && (
                <button
                  className="button secondary"
                  onClick={() => setEditing(!editing)}
                >
                  <Pencil size={17} />
                  {editing ? "ปิดการแก้ไข" : "แก้ไขอุปกรณ์"}
                </button>
              )
            }
          />
          <div className="detail-grid">
            <div>
              <section className="panel detail-panel">
                <div className="panel-heading">
                  <h2>ข้อมูลอุปกรณ์</h2>
                  <span className={`asset-status ${asset.status}`}>
                    <i />
                    {assetStatusLabels[asset.status]}
                  </span>
                </div>
                {editing ? (
                  <div className="panel-body">
                    <AssetForm
                      asset={asset}
                      onSaved={() => {
                        setEditing(false);
                        query.refresh();
                      }}
                    />
                  </div>
                ) : (
                  <>
                    <div className="asset-info">
                      <div className="large-asset-icon">
                        <Monitor size={50} />
                      </div>
                      <div>
                        <small>{asset.asset_code}</small>
                        <h2>{asset.name}</h2>
                        <p>
                          <MapPin size={16} />
                          {asset.location}
                        </p>
                      </div>
                    </div>
                    <div className="panel-body">
                      <Link className="button primary" to={report}>
                        <Plus size={18} />
                        แจ้งซ่อมอุปกรณ์นี้
                      </Link>
                    </div>
                  </>
                )}
              </section>
              <section className="panel">
                <div className="panel-heading">
                  <h2>ประวัติการแจ้งซ่อม</h2>
                  <span className="subtle-tag">
                    {history.data?.length ?? 0} งาน
                  </span>
                </div>
                <QueryState
                  {...history}
                  empty={history.data?.length === 0}
                  retry={history.refresh}
                />
                {!!history.data?.length && <TicketTable items={history.data} />}
              </section>
            </div>
            <aside>
              <section className="panel qr-panel">
                <span className="qr-icon">
                  <ScanLine size={24} />
                </span>
                <h2>สแกนเพื่อแจ้งซ่อม</h2>
                <p>
                  ติด QR ไว้ที่อุปกรณ์
                  <br />
                  ให้ทีมแจ้งปัญหาได้ทันที
                </p>
                <div className="qr-code" data-testid="asset-qr">
                  <QRCodeSVG
                    value={`${window.location.origin}${report}`}
                    size={180}
                    level="M"
                    title={`แจ้งซ่อม ${asset.asset_code}`}
                  />
                </div>
                <strong>{asset.asset_code}</strong>
                <Link className="button primary full" to={report}>
                  เปิดฟอร์มแจ้งซ่อม
                </Link>
                <button
                  className="button secondary full"
                  onClick={() => window.print()}
                >
                  <Printer size={16} />
                  พิมพ์ QR Code
                </button>
                <small>
                  ต้องเข้าสู่ระบบของบริษัทนี้
                  <br />
                  เพื่อดูอุปกรณ์และส่งงาน
                </small>
              </section>
            </aside>
          </div>
        </>
      )}
    </>
  );
}
