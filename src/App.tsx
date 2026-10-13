import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./components/auth";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Tickets from "./pages/Tickets";
import TicketDetail from "./pages/TicketDetail";
import NewTicket from "./pages/NewTicket";
import Assets from "./pages/Assets";
import AssetDetail from "./pages/AssetDetail";
import NewAsset from "./pages/NewAsset";
import Team from "./pages/Team";
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/tickets" element={<Tickets />} />
            <Route path="/tickets/new" element={<NewTicket />} />
            <Route path="/tickets/:id" element={<TicketDetail />} />
            <Route path="/assets" element={<Assets />} />
            <Route path="/assets/new" element={<NewAsset />} />
            <Route path="/assets/:id" element={<AssetDetail />} />
            <Route path="/report" element={<NewTicket />} />
            <Route path="/team" element={<Team />} />
            <Route
              path="*"
              element={
                <div className="state">
                  <h1>ไม่พบหน้านี้</h1>
                  <a className="button primary" href="/dashboard">
                    กลับหน้าภาพรวม
                  </a>
                </div>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
