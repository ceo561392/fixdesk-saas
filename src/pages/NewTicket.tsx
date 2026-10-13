import { useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, ScanLine, ShieldCheck } from "lucide-react";
import { PageHeading, QueryState } from "../components/ui";
import TicketForm from "../components/TicketForm";
import { useQuery } from "../hooks/useQuery";
import type { Asset } from "../types";
export default function NewTicket() {
  const [params] = useSearchParams();
  const assetId = params.get("asset");
  const query = useQuery<Asset>(
    assetId ? `/assets/${encodeURIComponent(assetId)}` : null,
  );
  return (
    <>
      <Link className="back-link" to="/tickets">
        <ArrowLeft size={16} />
        กลับสู่งานแจ้งซ่อม
      </Link>
      <PageHeading
        eyebrow={assetId ? "QUICK REPORT · QR" : "สร้างงานใหม่"}
        title="แจ้งปัญหาให้ทีมไอที"
        description="บอกรายละเอียดปัญหา แล้วให้ทีมของคุณดูแลต่อ"
      />
      {assetId && <QueryState {...query} retry={query.refresh} />}
      <div className="form-layout">
        {(!assetId || query.data) && (
          <section className="panel form-panel">
            {query.data && (
              <div className="prefilled">
                <ScanLine size={24} />
                <div>
                  <strong>
                    {query.data.asset_code} · {query.data.name}
                  </strong>
                  <small>{query.data.location}</small>
                </div>
              </div>
            )}
            <TicketForm prefilled={query.data ?? undefined} />
          </section>
        )}
        <aside className="form-help">
          <ShieldCheck size={24} />
          <h3>แจ้งให้ชัด แก้ไขได้ไว</h3>
          <p>ระบุอาการและสถานที่ให้ครบ เพื่อให้ทีมไอทีตรวจสอบได้ตรงจุด</p>
          <p>
            งานจะถูกส่งให้บริษัทปัจจุบันของคุณเท่านั้น
            และสามารถติดตามได้ในหน้างานแจ้งซ่อม
          </p>
          <div className="help-note">
            ไม่ควรใส่รหัสผ่านหรือข้อมูลลับในรายละเอียดงาน
          </div>
        </aside>
      </div>
    </>
  );
}
