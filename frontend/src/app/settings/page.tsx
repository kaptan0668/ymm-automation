"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { changePassword, resolveAdminBase } from "@/lib/api";
import { clearTokens } from "@/lib/auth";

export default function SettingsPage() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    if (!oldPassword || !newPassword) {
      setNotice("Eski ve yeni sifre zorunludur.");
      return;
    }
    if (newPassword !== newPassword2) {
      setNotice("Yeni sifreler eslesmiyor.");
      return;
    }
    try {
      setSaving(true);
      await changePassword(oldPassword, newPassword);
      clearTokens();
      setNotice("Sifre degisti. Tekrar giris yapiniz.");
      setTimeout(() => {
        window.location.href = "/login";
      }, 600);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
      setNotice(`Sifre degistirilemedi: ${msg}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Ayarlar</h1>
        <p className="text-ink/60">Kullanici ve yetki yonetimi.</p>
      </div>

      <div className="rounded-2xl border border-ink/10 bg-white/80 p-6">
        <div className="text-sm text-ink/60">Kullanici yonetimi Django admin uzerinden yapilir.</div>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href={`${resolveAdminBase()}/admin/`} target="_blank" rel="noreferrer">
            <Button>Admin Panel</Button>
          </a>
          <a href={`${resolveAdminBase()}/admin/auth/user/`} target="_blank" rel="noreferrer">
            <Button variant="outline">Kullanicilar</Button>
          </a>
          <a href={`${resolveAdminBase()}/admin/auth/group/`} target="_blank" rel="noreferrer">
            <Button variant="outline">Gruplar</Button>
          </a>
        </div>
      </div>

      <form onSubmit={handleChangePassword} className="rounded-2xl border border-ink/10 bg-white/80 p-6 space-y-3">
        <div className="text-sm text-ink/60">Kendi sifreni degistir.</div>
        <Input
          type="password"
          placeholder="Eski sifre"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
        />
        <Input
          type="password"
          placeholder="Yeni sifre"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <Input
          type="password"
          placeholder="Yeni sifre (tekrar)"
          value={newPassword2}
          onChange={(e) => setNewPassword2(e.target.value)}
        />
        <Button type="submit" disabled={saving}>
          {saving ? "Kaydediliyor..." : "Sifre Degistir"}
        </Button>
        {notice ? <div className="text-sm text-ink/70">{notice}</div> : null}
      </form>
    </div>
  );
}
