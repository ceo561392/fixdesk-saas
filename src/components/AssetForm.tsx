import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Save, LoaderCircle } from "lucide-react";
import { send } from "../lib/api";
import { assetStatusLabels } from "../lib/labels";
import { ErrorMessage } from "./ui";
import type { Asset } from "../types";
export default function AssetForm({
  asset,
  onSaved,
}: {
  asset?: Asset;
  onSaved?: () => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError("");
    try {
      const result = await send<Asset>(
        asset ? `/assets/${asset.id}` : "/assets",
        asset ? "PATCH" : "POST",
        input,
      );
      if (onSaved) onSaved();
      else navigate(`/assets/${result.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="data-form" onSubmit={submit}>
      <ErrorMessage message={error} />
      <div className="form-row">
        <label>
          รหัสทรัพย์สิน *
          <input
            required
            name="asset_code"
            minLength={2}
            maxLength={40}
            defaultValue={asset?.asset_code}
            placeholder="เช่น TR-013"
          />
        </label>
        <label>
          ชื่ออุปกรณ์ *
          <input
            required
            name="name"
            minLength={2}
            maxLength={160}
            defaultValue={asset?.name}
            placeholder="เช่น เครื่องพิมพ์แผนกบัญชี"
          />
        </label>
      </div>
      <div className="form-row">
        <label>
          ประเภท *
          <input
            required
            name="category"
            maxLength={80}
            defaultValue={asset?.category}
            placeholder="คอมพิวเตอร์ / เครือข่าย"
          />
        </label>
        <label>
          สถานที่ *
          <input
            required
            name="location"
            maxLength={200}
            defaultValue={asset?.location}
            placeholder="ชั้น / แผนก / ห้อง"
          />
        </label>
      </div>
      <label>
        สถานะ
        <select name="status" defaultValue={asset?.status ?? "active"}>
          {Object.entries(assetStatusLabels).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <div className="form-actions">
        <button className="button primary" disabled={busy}>
          {busy ? (
            <LoaderCircle className="spin" size={18} />
          ) : (
            <Save size={17} />
          )}
          บันทึกอุปกรณ์
        </button>
        <button
          type="button"
          className="button secondary"
          onClick={() => (onSaved ? onSaved() : navigate("/assets"))}
        >
          ยกเลิก
        </button>
      </div>
    </form>
  );
}
