import Link from "next/link";
import { getSettings } from "@/lib/catalog";
import SettingsForm from "./SettingsForm";


export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Cấu hình</h1>
        <Link href="/admin" style={{ fontSize: 13, color: "var(--ink-soft)" }}>← Về Quản trị</Link>
      </div>
      <SettingsForm initial={settings} />
    </div>
  );
}
