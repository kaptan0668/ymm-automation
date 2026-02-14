"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { changePassword, resolveAdminBase, getSettings, updateSettings, updateCounter, me, resolveApiBase, getYearLocks, setYearLock, sendTestMail } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { clearTokens } from "@/lib/auth";

export default function SettingsPage() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);
  const [isStaff, setIsStaff] = useState(false);
  const [isSuperuser, setIsSuperuser] = useState(false);

  const [workingYear, setWorkingYear] = useState<number | null>(null);
  const [counterYear, setCounterYear] = useState("2025");
  const [docType, setDocType] = useState("GLE");
  const [docCounter, setDocCounter] = useState("");
  const [reportGlobalCounter, setReportGlobalCounter] = useState("");
  const [reportYearCounter, setReportYearCounter] = useState("");
  const [adminNotice, setAdminNotice] = useState<string | null>(null);
  const [yearLocks, setYearLocks] = useState<Array<{ year: number; is_locked: boolean }>>([]);
  const [lockYear, setLockYear] = useState(String(new Date().getFullYear()));
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpUseTls, setSmtpUseTls] = useState(true);
  const [smtpUseSsl, setSmtpUseSsl] = useState(false);
  const [smtpFromEmail, setSmtpFromEmail] = useState("");
  const [smtpConfigured, setSmtpConfigured] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testingMail, setTestingMail] = useState(false);

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
        const [settings, meInfo, locks] = await Promise.all([getSettings(), me(), getYearLocks().catch(() => [])]);
        setWorkingYear(settings.working_year);
        setSmtpHost(settings.smtp_host || "");
        setSmtpPort(String(settings.smtp_port || 587));
        setSmtpUser(settings.smtp_user || "");
        setSmtpUseTls(Boolean(settings.smtp_use_tls));
        setSmtpUseSsl(Boolean(settings.smtp_use_ssl));
        setSmtpFromEmail(settings.smtp_from_email || "");
        setSmtpConfigured(Boolean(settings.smtp_configured));
        setIsStaff(Boolean(meInfo?.is_staff));
        setIsSuperuser(Boolean(meInfo?.is_superuser));
        setTestEmail(meInfo?.email || "");
        setYearLocks(locks.map((l) => ({ year: l.year, is_locked: l.is_locked })));
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
    setSettingsNotice(null);
    if (!isStaff || workingYear === null) return;
    try {
      setSavingSettings(true);
      const payload: {
        working_year: number;
        smtp_host: string | null;
        smtp_port: number;
        smtp_user: string | null;
        smtp_use_tls: boolean;
        smtp_use_ssl: boolean;
        smtp_from_email: string | null;
        smtp_password?: string;
      } = {
        working_year: workingYear,
        smtp_host: smtpHost.trim() || null,
        smtp_port: Number(smtpPort || 587),
        smtp_user: smtpUser.trim() || null,
        smtp_use_tls: smtpUseTls,
        smtp_use_ssl: smtpUseSsl,
        smtp_from_email: smtpFromEmail.trim() || null,
      };
      if (smtpPassword.trim()) {
        payload.smtp_password = smtpPassword.trim();
      }
      const updated = await updateSettings(payload);
      localStorage.setItem("working_year", String(workingYear));
      window.dispatchEvent(new Event("working-year-changed"));
      setSmtpConfigured(Boolean(updated.smtp_configured));
      setSmtpPassword("");
      setSettingsNotice(`Çalışma yılı kaydedildi: ${workingYear}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
      setSettingsNotice(`Kaydedilemedi: ${msg}`);
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleTestMail() {
    setSettingsNotice(null);
    if (!isStaff) return;
    try {
      setTestingMail(true);
      await sendTestMail(testEmail);
      setSettingsNotice("Test e-postası gönderildi.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
      setSettingsNotice(`Test mail gönderilemedi: ${msg}`);
    } finally {
      setTestingMail(false);
    }
  }

  async function handleCounterUpdate() {
    setAdminNotice(null);
    if (!isStaff) return;
    try {
      if (counterYear === "2026" && (reportYearCounter || docCounter)) {
        setAdminNotice("2026 için sadece 'Rapor global kümülatif' girilebilir.");
        return;
      }
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

  async function handleBackupDownload() {
    setAdminNotice(null);
    if (!isStaff) return;
    try {
      const token = getAccessToken();
      const base = resolveApiBase();
      const res = await fetch(`${base}/api/admin/backup/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "backup.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setAdminNotice("Yedek indirildi.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
      setAdminNotice(`Yedek alınamadı: ${msg}`);
    }
  }

  async function handleSetYearLock(isLocked: boolean) {
    setAdminNotice(null);
    if (!isSuperuser) return;
    try {
      await setYearLock(Number(lockYear), isLocked);
      const locks = await getYearLocks();
      setYearLocks(locks.map((l) => ({ year: l.year, is_locked: l.is_locked })));
      setAdminNotice(isLocked ? "Yıl kilitlendi." : "Yıl kilidi açıldı.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
      setAdminNotice(`Yıl kilidi değiştirilemedi: ${msg}`);
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
          <div className="text-sm text-ink/60">Çalışma yılı</div>
          <div className="text-xs text-ink/50">Kayıtlı çalışma yılı: {workingYear ?? "-"}</div>
          <div className="grid gap-3 md:grid-cols-1">
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
          </div>
          <Button onClick={handleSaveSettings} disabled={savingSettings}>
            {savingSettings ? "Kaydediliyor..." : "Kaydet"}
          </Button>
          {settingsNotice ? <div className="text-sm text-ink/70">{settingsNotice}</div> : null}
        </div>
      ) : null}

      {isStaff ? (
        <div className="rounded-2xl border border-ink/10 bg-white/80 p-6 space-y-3">
          <div className="text-sm text-ink/60">SMTP Ayarları (Sadece Admin)</div>
          <div className="text-xs text-ink/50">
            Durum: {smtpConfigured ? "Yapılandırıldı" : "Eksik"}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="SMTP Host" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} />
            <Input placeholder="SMTP Port" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} />
            <Input placeholder="SMTP Kullanıcı" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} />
            <Input type="password" placeholder="SMTP Şifre (değiştirmek için doldurun)" value={smtpPassword} onChange={(e) => setSmtpPassword(e.target.value)} />
            <Input placeholder="Gönderen E-posta" value={smtpFromEmail} onChange={(e) => setSmtpFromEmail(e.target.value)} />
            <Input placeholder="Test alıcı e-posta" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} />
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={smtpUseTls} onChange={(e) => setSmtpUseTls(e.target.checked)} />
              TLS
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={smtpUseSsl} onChange={(e) => setSmtpUseSsl(e.target.checked)} />
              SSL
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSaveSettings} disabled={savingSettings}>
              {savingSettings ? "Kaydediliyor..." : "SMTP + Ayarları Kaydet"}
            </Button>
            <Button variant="outline" onClick={handleTestMail} disabled={testingMail || !testEmail}>
              {testingMail ? "Gönderiliyor..." : "Test Mail Gönder"}
            </Button>
          </div>
        </div>
      ) : null}

      {isSuperuser ? (
        <div className="rounded-2xl border border-ink/10 bg-white/80 p-6 space-y-3">
          <div className="text-sm text-ink/60">Yıl Kilidi (Sadece Admin)</div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="h-10 rounded-md border border-ink/20 bg-white px-3 text-sm"
              value={lockYear}
              onChange={(e) => setLockYear(e.target.value)}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <Button variant="outline" onClick={() => handleSetYearLock(true)}>Yılı Kilitle</Button>
            <Button variant="outline" onClick={() => handleSetYearLock(false)}>Kilidi Aç</Button>
          </div>
          <div className="text-sm text-ink/70">
            {yearLocks.length === 0
              ? "Kilitli yıl yok."
              : `Kilitli yıllar: ${yearLocks.filter((y) => y.is_locked).map((y) => y.year).join(", ") || "yok"}`}
          </div>
        </div>
      ) : null}

      {isStaff ? (
        <div className="rounded-2xl border border-ink/10 bg-white/80 p-6 space-y-3">
          <div className="text-sm text-ink/60">Numaratör yönetimi (2024-2025 + 2026 başlangıç kümülatif)</div>
          <div className="grid gap-3 md:grid-cols-3">
            <select
              className="h-10 rounded-md border border-ink/20 bg-white px-3 text-sm"
              value={counterYear}
              onChange={(e) => setCounterYear(e.target.value)}
            >
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
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
          <Button variant="outline" onClick={handleBackupDownload}>
            Yedek indir (JSON)
          </Button>
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


