"use client";

import { Button } from "@/components/ui/button";
import { resolveAdminBase } from "@/lib/api";

export default function SettingsPage() {
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
    </div>
  );
}
