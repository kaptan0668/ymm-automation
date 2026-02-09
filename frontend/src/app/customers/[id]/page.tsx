"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { apiFetch, apiUpload, me } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

type Customer = {
  id: number;
  name: string;
  tax_no: string;
  tax_office?: string;
  address?: string;
  phone?: string;
  email?: string;
  contact_person?: string;
};

type FileRow = {
  id: number;
  filename: string;
  url: string;
  signed_url?: string;
};

type DocumentRow = {
  id: number;
  doc_no: string;
  received_date?: string;
  subject?: string;
  status?: string;
  files?: FileRow[];
};

type ReportRow = {
  id: number;
  report_no: string;
  received_date?: string;
  subject?: string;
  status?: string;
  files?: FileRow[];
};

type ContractRow = {
  id: number;
  contract_no?: string;
  contract_date?: string;
  contract_type?: string;
  period_start_month?: number;
  period_start_year?: number;
  period_end_month?: number;
  period_end_year?: number;
  file_url?: string;
  signed_url?: string;
};

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-xl border border-ink/10 bg-white/80 p-6 text-sm text-ink/60">
      <div className="text-base font-semibold text-ink">{title}</div>
      <div className="mt-1">{subtitle}</div>
    </div>
  );
}

function FilePicker({
  label,
  onChange
}: {
  label: string;
  onChange: (file: File | null) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-lg border border-dashed border-ink/20 bg-white px-3 py-2 text-sm text-ink/70 hover:bg-haze">
      <span>{label}</span>
      <span className="text-xs text-terracotta">Seç</span>
      <input
        type="file"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />
    </label>
  );
}

export default function CustomerCardPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [isStaff, setIsStaff] = useState(false);

  const [name, setName] = useState("");
  const [taxNo, setTaxNo] = useState("");
  const [taxOffice, setTaxOffice] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [contactPerson, setContactPerson] = useState("");

  const [showDocs, setShowDocs] = useState(true);
  const [showReports, setShowReports] = useState(true);
  const [showContracts, setShowContracts] = useState(true);
  const [showOtherFiles, setShowOtherFiles] = useState(true);

  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [file3, setFile3] = useState<File | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [c, d, r, f, contractItems, meInfo] = await Promise.all([
          apiFetch<Customer>(`/api/customers/${id}/`),
          apiFetch<DocumentRow[]>(`/api/documents/?customer=${id}`),
          apiFetch<ReportRow[]>(`/api/reports/?customer=${id}`),
          apiFetch<FileRow[]>(`/api/files/?customer=${id}`),
          apiFetch<ContractRow[]>(`/api/contracts/?customer=${id}`),
          me()
        ]);
        setCustomer(c);
        setDocs(d);
        setReports(r);
        setFiles(f);
        setContracts(contractItems);
        setIsStaff(Boolean(meInfo?.is_staff));
        setName(c.name || "");
        setTaxNo(c.tax_no || "");
        setTaxOffice(c.tax_office || "");
        setAddress(c.address || "");
        setPhone(c.phone || "");
        setEmail(c.email || "");
        setContactPerson(c.contact_person || "");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
        setError(msg);
      }
    }
    load();
  }, [id]);

  useEffect(() => {
    if (searchParams?.get("edit") === "1") {
      setEditing(true);
    }
  }, [searchParams]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!customer) return;
    setSaving(true);
    setNotice(null);
    try {
      const updated = await apiFetch<Customer>(`/api/customers/${customer.id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          name,
          tax_no: taxNo,
          tax_office: taxOffice || null,
          address: address || null,
          phone: phone || null,
          email: email || null,
          contact_person: contactPerson || null
        })
      });
      setCustomer(updated);
      setEditing(false);
      setNotice("Kaydedildi.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
      setNotice(`Kaydedilemedi: ${msg}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleUploadCustomerFiles() {
    if (!customer) return;
    const filesToUpload = [file1, file2, file3].filter(Boolean) as File[];
    if (filesToUpload.length === 0) return;
    for (const f of filesToUpload) {
      const fd = new FormData();
      fd.append("file", f);
      fd.append("customer", String(customer.id));
      await apiUpload("/api/files/upload/", fd);
    }
    setFile1(null);
    setFile2(null);
    setFile3(null);
    const updatedFiles = await apiFetch<FileRow[]>(`/api/files/?customer=${customer.id}`);
    setFiles(updatedFiles);
  }

  async function handleDeleteFile(fileId: number) {
    if (!confirm("Dosya silinsin mi?")) return;
    await apiFetch(`/api/files/${fileId}/`, { method: "DELETE" });
    const updatedFiles = await apiFetch<FileRow[]>(`/api/files/?customer=${id}`);
    setFiles(updatedFiles);
  }

  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (!customer) return <div>Yükleniyor...</div>;

  const docCount = docs.length;
  const reportCount = reports.length;
  const fileCount = files.length;
  const contractCount = contracts.length;

  function formatPeriod(item: ContractRow) {
    if (item.period_start_month && item.period_start_year && item.period_end_month && item.period_end_year) {
      const s = `${String(item.period_start_month).padStart(2, "0")}/${item.period_start_year}`;
      const e = `${String(item.period_end_month).padStart(2, "0")}/${item.period_end_year}`;
      return `${s}-${e}`;
    }
    return "-";
  }

  return (
    <div className="space-y-6 print-area">
      <div className="rounded-2xl border border-ink/10 bg-white/80 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-ink/50">Müşteri Kartı</div>
            <h1 className="text-3xl font-semibold">{customer.name}</h1>
            <div className="mt-1 text-sm text-ink/60">Vergi No: {customer.tax_no}</div>
          </div>
          <div className="flex items-center gap-2 print-hide">
            <Button variant="outline" onClick={() => setEditing((v) => !v)}>
              {editing ? "İptal" : "Düzenle"}
            </Button>
            <Button onClick={() => window.print()}>Yazdır</Button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-ink/10 bg-white p-4 text-sm">
            <div><b>Vergi No:</b> {customer.tax_no || "-"}</div>
            <div><b>Vergi Dairesi:</b> {customer.tax_office || "-"}</div>
            <div><b>Adres:</b> {customer.address || "-"}</div>
          </div>
          <div className="rounded-xl border border-ink/10 bg-white p-4 text-sm">
            <div><b>Telefon:</b> {customer.phone || "-"}</div>
            <div><b>E-posta:</b> {customer.email || "-"}</div>
            <div><b>Yetkili:</b> {customer.contact_person || "-"}</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-ink/10 bg-white/80 p-6">
        <div className="grid gap-3 sm:grid-cols-5">
          <div className="rounded-xl border border-ink/10 bg-haze p-4">
            <div className="text-xs text-ink/60">Evrak</div>
            <div className="text-2xl font-semibold">{docCount}</div>
          </div>
          <div className="rounded-xl border border-ink/10 bg-haze p-4">
            <div className="text-xs text-ink/60">Rapor</div>
            <div className="text-2xl font-semibold">{reportCount}</div>
          </div>
          <div className="rounded-xl border border-ink/10 bg-haze p-4">
            <div className="text-xs text-ink/60">Ek</div>
            <div className="text-2xl font-semibold">{fileCount}</div>
          </div>
          <div className="rounded-xl border border-ink/10 bg-haze p-4">
            <div className="text-xs text-ink/60">Sözleşme</div>
            <div className="text-2xl font-semibold">{contractCount}</div>
          </div>
          <div className="rounded-xl border border-ink/10 bg-haze p-4">
            <div className="text-xs text-ink/60">Vergi No</div>
            <div className="text-base font-semibold">{customer.tax_no}</div>
          </div>
        </div>
      </div>

      {notice ? <div className="text-sm text-ink/70">{notice}</div> : null}

      {editing ? (
        <form onSubmit={handleSave} className="rounded-2xl border border-ink/10 bg-white/80 p-6 space-y-3">
          <div className="text-sm text-ink/60">Müşteri bilgilerini düzenle</div>
          <Input placeholder="Müşteri adı" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Vergi no" value={taxNo} onChange={(e) => setTaxNo(e.target.value)} />
          <Input placeholder="Vergi dairesi" value={taxOffice} onChange={(e) => setTaxOffice(e.target.value)} />
          <Input placeholder="Adres" value={address} onChange={(e) => setAddress(e.target.value)} />
          <Input placeholder="Telefon" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input placeholder="E-posta" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input placeholder="Yetkili kişi" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
          <Button type="submit" disabled={saving}>
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </form>
      ) : null}

      <div className="rounded-2xl border border-ink/10 bg-white/80 p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Sözleşmeler</h2>
          <Button variant="outline" onClick={() => setShowContracts((v) => !v)}>
            {showContracts ? "Gizle" : "Göster"}
          </Button>
        </div>
        {showContracts ? (
          contracts.length === 0 ? (
            <EmptyState title="Sözleşme yok" subtitle="Bu müşteri için kayıtlı sözleşme bulunamadı." />
          ) : (
            <div className="space-y-3">
              {contracts.map((c) => (
                <div key={c.id} className="rounded-xl border border-ink/10 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-ink/60">{c.contract_date || "-"}</div>
                    {c.file_url || c.signed_url ? (
                      <a
                        className="text-sm text-terracotta"
                        href={c.signed_url ?? c.file_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Sözleşmeyi aç
                      </a>
                    ) : null}
                  </div>
                  <div className="mt-1 text-sm font-semibold">{c.contract_no || "-"}</div>
                  <div className="mt-1 text-sm text-ink/60">
                    Tür: {c.contract_type || "-"} • Dönem: {formatPeriod(c)}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : null}
      </div>

      <div className="rounded-2xl border border-ink/10 bg-white/80 p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Evraklar</h2>
          <Button variant="outline" onClick={() => setShowDocs((v) => !v)}>
            {showDocs ? "Gizle" : "Göster"}
          </Button>
        </div>
        {showDocs ? (
          docs.length === 0 ? (
            <EmptyState title="Evrak yok" subtitle="Bu müşteri için kayıtlı evrak bulunamadı." />
          ) : (
            <div className="space-y-3">
              {docs.map((d) => (
                <div
                  key={d.id}
                  className={
                    d.status === "DONE"
                      ? "rounded-xl border border-emerald-100 bg-emerald-50/40 p-4"
                      : "rounded-xl border border-ink/10 bg-white p-4"
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-ink/60">{d.received_date || "-"}</div>
                    <Link className="text-sm text-terracotta" href={`/documents/${d.id}`}>
                      Görüntüle
                    </Link>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-sm font-semibold">
                    {d.doc_no}
                    <span
                      className={
                        d.status === "DONE"
                          ? "inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700"
                          : "inline-flex items-center gap-1 rounded-full border border-ink/20 bg-white px-2 py-0.5 text-[11px] font-medium text-ink/60"
                      }
                    >
                      <span>{d.status === "DONE" ? "✓" : "○"}</span>
                      {d.status === "DONE" ? "Tamamlandı" : "Açık"}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-ink/60">{d.subject || "Konu yok"}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(d.files || []).map((f) => (
                      <a
                        key={f.id}
                        className="text-xs text-terracotta"
                        href={f.signed_url ?? f.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {f.filename}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : null}
      </div>

      <div className="rounded-2xl border border-ink/10 bg-white/80 p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Raporlar</h2>
          <Button variant="outline" onClick={() => setShowReports((v) => !v)}>
            {showReports ? "Gizle" : "Göster"}
          </Button>
        </div>
        {showReports ? (
          reports.length === 0 ? (
            <EmptyState title="Rapor yok" subtitle="Bu müşteri için kayıtlı rapor bulunamadı." />
          ) : (
            <div className="space-y-3">
              {reports.map((r) => (
                <div
                  key={r.id}
                  className={
                    r.status === "DONE"
                      ? "rounded-xl border border-emerald-100 bg-emerald-50/40 p-4"
                      : "rounded-xl border border-ink/10 bg-white p-4"
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-ink/60">{r.received_date || "-"}</div>
                    <Link className="text-sm text-terracotta" href={`/reports/${r.id}`}>
                      Görüntüle
                    </Link>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-sm font-semibold">
                    {r.report_no}
                    <span
                      className={
                        r.status === "DONE"
                          ? "inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700"
                          : "inline-flex items-center gap-1 rounded-full border border-ink/20 bg-white px-2 py-0.5 text-[11px] font-medium text-ink/60"
                      }
                    >
                      <span>{r.status === "DONE" ? "✓" : "○"}</span>
                      {r.status === "DONE" ? "Tamamlandı" : "Açık"}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-ink/60">{r.subject || "Konu yok"}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(r.files || []).map((f) => (
                      <a
                        key={f.id}
                        className="text-xs text-terracotta"
                        href={f.signed_url ?? f.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {f.filename}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : null}
      </div>

      <div className="rounded-2xl border border-ink/10 bg-white/80 p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Diğer Dosyalar</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowOtherFiles((v) => !v)}>
              {showOtherFiles ? "Gizle" : "Göster"}
            </Button>
            <Button variant="outline" onClick={handleUploadCustomerFiles}>
              Dosya Yükle
            </Button>
          </div>
        </div>
        {showOtherFiles ? (
          <>
            <div className="grid gap-2 md:grid-cols-3">
              <FilePicker label="Dosya 1" onChange={setFile1} />
              <FilePicker label="Dosya 2" onChange={setFile2} />
              <FilePicker label="Dosya 3" onChange={setFile3} />
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {files.length === 0 ? (
                <EmptyState title="Dosya yok" subtitle="Müşteriye ait dosya bulunamadı." />
              ) : (
                files.map((f) => (
                  <div key={f.id} className="flex items-center justify-between rounded-xl border border-ink/10 bg-white p-3">
                    <a className="text-sm text-terracotta" href={f.signed_url ?? f.url} target="_blank" rel="noreferrer">
                      {f.filename}
                    </a>
                    {isStaff ? (
                      <button className="text-xs text-red-600" onClick={() => handleDeleteFile(f.id)}>
                        Sil
                      </button>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}


