export interface User {
  id: string;
  name: string;
  email: string;
  tenant_id: string;
  tenant_name: string;
  role: "admin" | "technician" | "requester";
}
export interface Member {
  id: string;
  name: string;
  email: string;
  role: User["role"];
}
export interface Ticket {
  id: string;
  tenant_id: string;
  ticket_no: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  location: string;
  asset_id: string | null;
  asset_name: string | null;
  asset_code: string | null;
  requester_id: string;
  requester_name: string;
  assignee_id: string | null;
  assignee_name: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  version: number;
  events?: TicketEvent[];
}
export interface TicketEvent {
  id: string;
  event_type: string;
  old_value: string | null;
  new_value: string | null;
  actor_name: string;
  created_at: string;
}
export interface Asset {
  id: string;
  tenant_id: string;
  asset_code: string;
  name: string;
  category: string;
  location: string;
  status: string;
  created_at: string;
}
export interface TicketList {
  items: Ticket[];
  total: number;
  page: number;
  pageSize: number;
}
export interface DashboardData {
  byStatus: { status: string; count: number }[];
  recent: Ticket[];
  assetCount: number;
}
