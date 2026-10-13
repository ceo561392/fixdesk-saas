import { Navigate } from "react-router-dom";
import { useAuth } from "../components/auth";
import { useQuery } from "../hooks/useQuery";
import { PageHeading, QueryState } from "../components/ui";
import { roleLabels } from "../lib/labels";
import type { Member } from "../types";
export default function Team() {
  const { user } = useAuth();
  const query = useQuery<Member[]>(user?.role === "admin" ? "/members" : null);
  if (user?.role !== "admin") return <Navigate to="/dashboard" replace />;
  return (
    <>
      <PageHeading
        title="ทีมงาน"
        description="สมาชิกและสิทธิ์การใช้งานในบริษัทปัจจุบัน · บัญชี Demo จัดเตรียมไว้ล่วงหน้า"
      />
      <section className="panel">
        <div className="panel-heading">
          <h2>สมาชิกในบริษัท</h2>
          <span className="subtle-tag">{query.data?.length ?? 0} คน</span>
        </div>
        <QueryState {...query} retry={query.refresh} />
        <div className="team-list">
          {query.data?.map((m) => (
            <div className="team-member" key={m.id}>
              <span className="avatar">{m.name[0]}</span>
              <div>
                <strong>{m.name}</strong>
                <small>{m.email}</small>
              </div>
              <span className="subtle-tag">{roleLabels[m.role]}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
