import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { LoaderCircle, Send } from "lucide-react";
import { useQuery } from "../hooks/useQuery";
import { send } from "../lib/api";
import { priorityLabels } from "../lib/labels";
import { ErrorMessage, QueryState } from "./ui";
import type { Asset, Ticket } from "../types";
export default function TicketForm({
  prefilled,
  ticket,
  onSaved,
}: {
  prefilled?: Asset;
  ticket?: Ticket;
  onSaved?: () => void;
}) {
  const assets = useQuery<Asset[]>("/assets");
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [assetId, setAssetId] = useState(
    prefilled?.id ?? ticket?.asset_id ?? "",
  );
  const [location, setLocation] = useState(
    prefilled?.location ?? ticket?.location ?? "",
  );
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const values = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const payload = {
        title: values.title,
        description: values.description,
        priority: values.priority,
        location,
        ...(ticket
          ? { version: ticket.version }
          : { asset_id: assetId || null }),
      };
      const result = await send<Ticket>(
        ticket ? `/tickets/${ticket.id}` : "/tickets",
        ticket ? "PATCH" : "POST",
        payload,
      );
      if (onSaved) onSaved();
      else navigate(`/tickets/${result.id}`, { state: { created: true } });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="data-form" onSubmit={submit}>
      <ErrorMessage message={error} />
      {!ticket && (
        <>
          <QueryState {...assets} retry={assets.refresh} />
          <label>
            อุปกรณ์
            <select
              aria-label="อุปกรณ์"
              value={assetId}
              disabled={!!prefilled}
              onChange={(e) => {
                setAssetId(e.target.value);
                const asset = assets.data?.find((a) => a.id === e.target.value);
                if (asset) setLocation(asset.location);
              }}
            >
              <option value="">ไม่ระบุอุปกรณ์ / ปัญหาทั่วไป</option>
              {assets.data?.map((a) => (
                <option value={a.id} key={a.id}>
                  {a.asset_code} · {a.name}
                </option>
              ))}
            </select>
            {prefilled && <small>เลือกอัตโนมัติจาก QR ของอุปกรณ์</small>}
          </label>
        </>
      )}
      <label>
        หัวข้อปัญหา <span className="required">*</span>
        <input
          required
          name="title"
          minLength={3}
          maxLength={160}
          defaultValue={ticket?.title}
          placeholder="เช่น เครื่องพิมพ์ออฟไลน์ ไม่สามารถพิมพ์ได้"
        />
      </label>
      <label>
        รายละเอียดปัญหา <span className="required">*</span>
        <textarea
          required
          name="description"
          minLength={3}
          maxLength={4000}
          rows={5}
          defaultValue={ticket?.description}
          placeholder="อธิบายอาการที่พบ และสิ่งที่ลองแก้ไขแล้ว…"
        />
      </label>
      <div className="form-row">
        <label>
          ความสำคัญ
          <select name="priority" defaultValue={ticket?.priority ?? "normal"}>
            {Object.entries(priorityLabels).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          สถานที่ <span className="required">*</span>
          <input
            required
            name="location"
            maxLength={200}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="ชั้น / แผนก / ห้อง"
          />
        </label>
      </div>
      <div className="form-actions">
        <button
          className="button primary"
          disabled={busy || (!ticket && (assets.loading || !!assets.error))}
        >
          {busy ? (
            <LoaderCircle className="spin" size={18} />
          ) : (
            <Send size={17} />
          )}{" "}
          {ticket ? "บันทึกการแก้ไข" : "ส่งงานแจ้งซ่อม"}
        </button>
        <button
          className="button secondary"
          type="button"
          onClick={() => (onSaved ? onSaved() : navigate("/tickets"))}
        >
          ยกเลิก
        </button>
      </div>
    </form>
  );
}
