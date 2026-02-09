"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { changePassword, resolveAdminBase, getSettings, updateSettings, updateCounter, me, resolveApiBase } from "@/lib/api";
import { clearTokens } from "@/lib/auth";

export default function SettingsPage() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isStaff, setIsStaff] = useState(false);

  const [workingYear, setWorkingYear] = useState<number | null>(null);
  const [referenceYear, setReferenceYear] = useState<number | null>(null);
  const [counterYear, setCounterYear] = useState("2025");
  const [docType, setDocType] = useState("GLE");
  const [docCounter, setDocCounter] = useState("");
  const [reportGlobalCounter, setReportGlobalCounter] = useState("");
  const [reportYearCounter, setReportYearCounter] = useState("");
  const [adminNotice, setAdminNotice] = useState<string | null>(null);

  const years = useMemo(() => {
    const now = new Date().getFullYear();
    const ys: number[] = [];
    for (let y = 2010; y <= now + 1; y += 1) {
      ys.push(y);
    }
    return ys;
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const [settings, meInfo] = await Promise.all([getSettings(), me()]);
        setWorkingYear(settings.working_year);
        setReferenceYear(settings.reference_year);
        setIsStaff(Boolean(meInfo?.is_staff));
      } catch {
        // ignore
      }
    }
    load();
  }, []);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    if (!oldPassword || !newPassword) {
      setNotice("Eski ve yeni şifre zorunludur.");
      return;
    }
    if (newPassword !== newPassword2) {
      setNotice("Yeni şifreler eşleşmiyor.");
      return;
    }
    try {
      setSaving(true);
      await changePassword(oldPassword, newPassword);
      clearTokens();
      setNotice("Şifre değişti. Tekrar giriş yapınız.");
      setTimeout(() => {
        window.location.href = "/login";
      }, 600);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
      setNotice(`Şifre değiştirilemedi: ${msg}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveSettings() {
    setAdminNotice(null);
    if (!isStaff || workingYear === null || referenceYear === null) return;
    try {
      await updateSettings({ working_year: workingYear, reference_year: referenceYear });
      setAdminNotice("Ayarlar kaydedildi.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
      setAdminNotice(`Kaydedilemedi: ${msg}`);
    }
  }

  async function handleCounterUpdate() {
    setAdminNotice(null);
    if (!isStaff) return;
    try {
      if (reportGlobalCounter) {
        await updateCounter({ kind: "report_global", year: Number(counterYear), last_serial: Number(reportGlobalCounter) });
      }
      if (reportYearCounter) {
        await updateCounter({ kind: "report_year", year: Number(counterYear), last_serial: Number(reportYearCounter) });
      }
      if (docCounter) {
        await updateCounter({ kind: "document", year: Number(counterYear), doc_type: docType, last_serial: Number(docCounter) });
      }
      setAdminNotice("Sayaçlar güncellendi.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
      setAdminNotice(`Güncellenemedi: ${msg}`);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Ayarlar</h1>
        <p className="text-ink/60">Kullanıcı ve yetki yönetimi.</p>
      </div>

      <div className="rounded-2xl border border-ink/10 bg-white/80 p-6">
        <div className="text-sm text-ink/60">Kullanıcı yönetimi Django admin üzerinden yapılır.</div>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href={`${resolveAdminBase()}/admin/`} target="_blank" rel="noreferrer">
            <Button>Admin Panel</Button>
          </a>
          <a href={`${resolveAdminBase()}/admin/auth/user/`} target="_blank" rel="noreferrer">
            <Button variant="outline">Kullanıcılar</Button>
          </a>
          <a href={`${resolveAdminBase()}/admin/auth/group/`} target="_blank" rel="noreferrer">
            <Button variant="outline">Gruplar</Button>
          </a>
        </div>
      </div>

      {isStaff ? (
        <div className="rounded-2xl border border-ink/10 bg-white/80 p-6 space-y-3">
          <div className="text-sm text-ink/60">Çalışma yılı ve referans yılı</div>
          <div className="grid gap-3 md:grid-cols-2">
            <select
              className="h-10 rounded-md border border-ink/20 bg-white px-3 text-sm"
              value={workingYear ?? ""}
              onChange={(e) => setWorkingYear(Number(e.target.value))}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-ink/20 bg-white px-3 text-sm"
              value={referenceYear ?? ""}
              onChange={(e) => setReferenceYear(Number(e.target.value))}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={handleSaveSettings}>Kaydet</Button>
        </div>
      ) : null}

      {isStaff ? (
        <div className="rounded-2xl border border-ink/10 bg-white/80 p-6 space-y-3">
          <div className="text-sm text-ink/60">Numaratör yönetimi (2024-2025 için)</div>
          <div className="grid gap-3 md:grid-cols-3">
            <select
              className="h-10 rounded-md border border-ink/20 bg-white px-3 text-sm"
              value={counterYear}
              onChange={(e) => setCounterYear(e.target.value)}
            >
              <option value="2024">2024</option>
              <option value="2025">2025</option>
            </select>
            <Input placeholder="Rapor global kümülatif" value={reportGlobalCounter} onChange={(e) => setReportGlobalCounter(e.target.value)} />
            <Input placeholder="Rapor yıl sayacı" value={reportYearCounter} onChange={(e) => setReportYearCounter(e.target.value)} />
            <select
              className="h-10 rounded-md border border-ink/20 bg-white px-3 text-sm"
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
            >
              <option value="GLE">GLE</option>
              <option value="GDE">GDE</option>
              <option value="KIT">KIT</option>
              <option value="DGR">DGR</option>
            </select>
            <Input placeholder="Evrak sayacı" value={docCounter} onChange={(e) => setDocCounter(e.target.value)} />
          </div>
          <Button onClick={handleCounterUpdate}>Sayaçları Kaydet</Button>
          {adminNotice ? <div className="text-sm text-ink/70">{adminNotice}</div> : null}
        </div>
      ) : null}

      {isStaff ? (
        <div className="rounded-2xl border border-ink/10 bg-white/80 p-6 space-y-3">
          <div className="text-sm text-ink/60">Yedekleme (ek dosyalar dahil değil)</div>
          <a className="text-terracotta" href={`${resolveApiBase()}/api/admin/backup/`}>
            Yedek indir (JSON)
          </a>
        </div>
      ) : null}

      <form onSubmit={handleChangePassword} className="rounded-2xl border border-ink/10 bg-white/80 p-6 space-y-3">
        <div className="text-sm text-ink/60">Kendi şifreni değiştir.</div>
        <Input
          type="password"
          placeholder="Eski şifre"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
        />
        <Input
          type="password"
          placeholder="Yeni şifre"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <Input
          type="password"
          placeholder="Yeni şifre (tekrar)"
          value={newPassword2}
          onChange={(e) => setNewPassword2(e.target.value)}
        />
        <Button type="submit" disabled={saving}>
          {saving ? "Kaydediliyor..." : "Şifre Değiştir"}
        </Button>
        {notice ? <div className="text-sm text-ink/70">{notice}</div> : null}
      </form>
    </div>
  );
}


