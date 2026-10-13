import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  ShieldCheck,
  Ticket,
  UserCheck,
  CheckCircle2,
  LoaderCircle,
} from "lucide-react";
import { useAuth } from "../components/auth";
import { Logo } from "../components/Layout";
import { ErrorMessage } from "../components/ui";
import { useQuery } from "../hooks/useQuery";
import { roleLabels } from "../lib/labels";
export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const accounts =
    useQuery<{ email: string; role: string; tenant_name: string }[]>(
      "/demo/accounts",
    );
  const rawNext = params.get("next") ?? "/dashboard";
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//")
      ? rawNext
      : "/dashboard";
  if (user) return <Navigate to={next} replace />;
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email, password);
      navigate(next, { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-page">
      <section className="login-story">
        <Logo />
        <div className="story-body">
          <span className="story-tag">
            <i /> IT SERVICE, SIMPLIFIED
          </span>
          <h1>
            จัดการงานซ่อม
            <br />
            ให้เป็นเรื่องง่าย<span>.</span>
          </h1>
          <p>
            พื้นที่เดียวสำหรับทุกปัญหาไอทีของทีม
            <br />
            แจ้งปัญหา มอบหมาย และติดตามจนจบงาน
          </p>
          <div className="workflow-visual">
            {[
              {
                icon: Ticket,
                no: "01",
                title: "แจ้งปัญหา",
                text: "บันทึกรายละเอียดและอุปกรณ์",
              },
              {
                icon: UserCheck,
                no: "02",
                title: "มอบหมายช่าง",
                text: "ส่งงานให้คนที่ใช่ในทีม",
              },
              {
                icon: CheckCircle2,
                no: "03",
                title: "ติดตามจนจบ",
                text: "ทุกความคืบหน้าอยู่ในที่เดียว",
              },
            ].map(({ icon: Icon, ...v }) => (
              <div key={v.no} className="workflow-card">
                <span className="workflow-icon">
                  <Icon />
                </span>
                <div>
                  <strong>{v.title}</strong>
                  <small>{v.text}</small>
                </div>
                <span>{v.no}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="story-foot">
          <ShieldCheck size={17} />{" "}
          แยกข้อมูลแต่ละบริษัทด้วยสิทธิ์ฝั่งเซิร์ฟเวอร์
        </div>
      </section>
      <section className="login-form-area">
        <div className="login-form-inner">
          <div className="eyebrow">ยินดีต้อนรับกลับ</div>
          <h2>เข้าสู่พื้นที่ทำงาน</h2>
          <p className="muted">เริ่มจัดการงานแจ้งซ่อมของบริษัทคุณ</p>
          <form onSubmit={submit}>
            <label>
              อีเมล
              <input
                required
                type="email"
                autoComplete="username"
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.test"
              />
            </label>
            <label>
              รหัสผ่าน
              <input
                required
                type="password"
                autoComplete="current-password"
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="กรอกรหัสผ่าน"
              />
            </label>
            <ErrorMessage message={error} />
            <button className="button primary full" disabled={busy}>
              {busy ? (
                <LoaderCircle className="spin" size={18} />
              ) : (
                <>
                  เข้าสู่ระบบ
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
          {accounts.data && (
            <div className="demo-accounts">
              <div className="demo-accounts-heading">
                <strong>ลองใช้งานด้วยบัญชี Demo</strong>
                <span>6 บัญชีทดสอบ</span>
              </div>
              <p>กดเลือกบัญชีเพื่อเติมอีเมลและรหัสผ่าน</p>
              {["Tropica Demo", "Blue Factory Demo"].map((company) => (
                <div key={company} className="demo-company">
                  <small>{company}</small>
                  <div>
                    {accounts
                      .data!.filter((a) => a.tenant_name === company)
                      .map((a) => (
                        <button
                          key={a.email}
                          className={`account-button ${email === a.email ? "selected" : ""}`}
                          type="button"
                          onClick={() => {
                            setEmail(a.email);
                            setPassword("Demo@12345");
                            setError("");
                          }}
                        >
                          {roleLabels[a.role]}
                        </button>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="login-note">
            Demo สำหรับทดลองบนเครื่อง · ใช้ข้อมูลสมมติเท่านั้น
          </p>
        </div>
      </section>
    </div>
  );
}
