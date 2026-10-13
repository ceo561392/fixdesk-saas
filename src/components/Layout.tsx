import { useState } from "react";
import { NavLink, Navigate, Outlet, useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Ticket,
  Monitor,
  Users,
  Wrench,
  LogOut,
  Menu,
  ChevronRight,
  Plus,
  Building2,
  ShieldCheck,
  X,
} from "lucide-react";
import { useAuth } from "./auth";
import { ErrorMessage, QueryState } from "./ui";
import { roleLabels } from "../lib/labels";
export function Logo() {
  return (
    <span className="logo">
      <span className="logo-mark">
        <Wrench size={22} />
      </span>
      FixDesk<span className="logo-dot">.</span>
    </span>
  );
}
export default function Layout() {
  const { user, loading, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (loading) return <QueryState loading error="" retry={() => {}} />;
  if (!user)
    return (
      <Navigate
        replace
        to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`}
      />
    );
  const nav = [
    { to: "/dashboard", name: "ภาพรวม", icon: LayoutDashboard },
    { to: "/tickets", name: "งานแจ้งซ่อม", icon: Ticket },
    { to: "/assets", name: "อุปกรณ์", icon: Monitor },
    ...(user.role === "admin"
      ? [{ to: "/team", name: "ทีมงาน", icon: Users }]
      : []),
  ];
  async function signOut() {
    setBusy(true);
    try {
      await logout();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? "show" : ""}`}>
        <Link to="/dashboard" className="brand">
          <Logo />
        </Link>
        <button
          className="mobile-close icon-button"
          aria-label="ปิดเมนู"
          onClick={() => setOpen(false)}
        >
          <X />
        </button>
        <div className="workspace-label">WORKSPACE</div>
        <nav>
          {nav.map(({ to, name, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <Icon size={19} />
              {name}
              <ChevronRight className="nav-arrow" size={15} />
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="demo-card">
            <ShieldCheck size={22} />
            <strong>พื้นที่สาธิตของคุณ</strong>
            <p>
              ทดลองทุกขั้นตอน
              <br />
              ด้วยข้อมูลบริษัทสมมติ
            </p>
            <span>LOCAL DEMO</span>
          </div>
          <div className="sidebar-footer">
            FixDesk SaaS <span>v1.0 Demo</span>
          </div>
        </div>
      </aside>
      {open && (
        <button
          className="backdrop"
          aria-label="ปิดเมนู"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="tenant-heading">
            <button
              className="mobile-menu icon-button"
              aria-label="เปิดเมนู"
              onClick={() => setOpen(true)}
            >
              <Menu />
            </button>
            <div className="tenant-icon">
              <Building2 size={20} />
            </div>
            <div>
              <strong>{user.tenant_name}</strong>
              <small>บริษัทปัจจุบัน</small>
            </div>
            <span className="demo-pill">DEMO</span>
          </div>
          <div className="user-menu">
            <span className="avatar">{user.name[0]}</span>
            <div>
              <strong>{user.name}</strong>
              <small>{roleLabels[user.role]}</small>
            </div>
            <button
              className="icon-button"
              aria-label="ออกจากระบบ"
              title="ออกจากระบบ"
              disabled={busy}
              onClick={signOut}
            >
              <LogOut size={19} />
            </button>
          </div>
        </header>
        <main>
          <ErrorMessage message={error} />
          <Outlet />
        </main>
        <footer className="main-footer">
          <span>FixDesk · ให้ทุกปัญหาไอที มีทางแก้</span>
          <span>
            <i /> Local D1 · ข้อมูลสมมติ
          </span>
        </footer>
      </div>
      <Link className="mobile-create" aria-label="แจ้งซ่อม" to="/tickets/new">
        <Plus />
      </Link>
    </div>
  );
}
