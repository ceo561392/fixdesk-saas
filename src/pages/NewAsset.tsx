import { Link, Navigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../components/auth";
import { PageHeading } from "../components/ui";
import AssetForm from "../components/AssetForm";
export default function NewAsset() {
  const { user } = useAuth();
  if (user?.role !== "admin") return <Navigate to="/assets" replace />;
  return (
    <>
      <Link className="back-link" to="/assets">
        <ArrowLeft size={16} />
        กลับสู่ทะเบียนอุปกรณ์
      </Link>
      <PageHeading
        title="เพิ่มอุปกรณ์"
        description="ลงทะเบียนอุปกรณ์ใหม่ พร้อมสร้าง QR Code สำหรับแจ้งซ่อม"
      />
      <section className="panel form-panel standalone-form">
        <AssetForm />
      </section>
    </>
  );
}
