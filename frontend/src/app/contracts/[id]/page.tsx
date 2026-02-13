"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/back-button";
import { formatPhoneDisplay } from "@/lib/format";

type ContractRow = {
  id: number;
  status?: "OPEN" | "DONE";
  contract_no?: string;
  contract_date?: string;
  contract_type?: string;
  period_start_month?: number;
  period_start_year?: number;
  period_end_month?: number;
  period_end_year?: number;
  filename?: string;
  file_url?: string;
  signed_url?: string;
  card_note?: string;
  customer: number;
};

type Customer = {
  id: number;
  name: string;
  identity_type?: "VKN" | "TCKN";
  tax_no?: string;
  tckn?: string;
  tax_office?: string;
  address?: string;
  phone?: string;
  email?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
};

type DocumentRow = {
  id: number;
  doc_no: string;
  received_date?: string;
  subject?: string;
  status?: "OPEN" | "DONE";
};

type ReportRow = {
  id: number;
  report_no: string;
  received_date?: string;
  subject?: string;
  status?: "OPEN" | "DONE";
};

type FileRow = {
  id: number;
  filename: string;
  url: string;
  signed_url?: string;
};

export default function ContractDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [contract, setContract] = useState<ContractRow | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [noteFiles, setNoteFiles] = useState<FileRow[]>([]);
  const [cardNote, setCardNote] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteNotice, setNoteNotice] = useState<string | null>(null);
  const [noteFile, setNoteFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const c = await apiFetch<ContractRow>(`/api/contracts/${id}/`);
        const [cust, docs, reps, nf] = await Promise.all([
          apiFetch<Customer>(`/api/customers/${c.customer}/`),
          apiFetch<DocumentRow[]>(`/api/documents/?contract=${c.id}`),
          apiFetch<ReportRow[]>(`/api/reports/?contract=${c.id}`),
          apiFetch<FileRow[]>(`/api/files/?contract=${c.id}&note_scope=1`)
        ]);
        setContract(c);
        setCustomer(cust);
        setDocuments(docs);
        setReports(reps);
        setNoteFiles(nf);
        setCardNote(c.card_note || "");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
        setError(msg);
      }
    }
    load();
  }, [id]);

  async function handleSaveCardNote() {
    if (!contract) return;
    setNoteSaving(true);
    setNoteNotice(null);
    try {
      const updated = await apiFetch<ContractRow>(`/api/contracts/${contract.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ card_note: cardNote || null })
      });
      setContract(updated);
      setCardNote(updated.card_note || "");
      setNoteNotice("Not kaydedildi.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
      setNoteNotice(`Not kaydedilemedi: ${msg}`);
    } finally {
      setNoteSaving(false);
    }
  }

  async function handleUploadNoteFile() {
    if (!contract || !noteFile) return;
    const fd = new FormData();
    fd.append("file", noteFile);
    fd.append("contract", String(contract.id));
    fd.append("customer", String(contract.customer));
    fd.append("note_scope", "1");
    await apiUpload("/api/files/upload/", fd);
    setNoteFile(null);
    const updatedNoteFiles = await apiFetch<FileRow[]>(`/api/files/?contract=${contract.id}&note_scope=1`);
    setNoteFiles(updatedNoteFiles);
  }

  async function handleDeleteNoteFile(fileId: number) {
    if (!confirm("Not dosyası silinsin mi?")) return;
    await apiFetch(`/api/files/${fileId}/`, { method: "DELETE" });
    const updatedNoteFiles = await apiFetch<FileRow[]>(`/api/files/?contract=${id}&note_scope=1`);
    setNoteFiles(updatedNoteFiles);
  }

  const period = useMemo(() => {
    if (
      !contract?.period_start_month ||
      !contract?.period_start_year ||
      !contract?.period_end_month ||
      !contract?.period_end_year
    ) {
      return "-";
    }
    return `${String(contract.period_start_month).padStart(2, "0")}/${contract.period_start_year}-${String(
      contract.period_end_month
    ).padStart(2, "0")}/${contract.period_end_year}`;
  }, [contract]);

  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (!contract || !customer) return <div>Yükleniyor...</div>;

  return (
    <div className="space-y-6 print-area">
      <div className="rounded-2xl border border-ink/10 bg-white/80 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-ink/50">Sözleşme Kartı</div>
            <h1 className="text-3xl font-semibold">{contract.contract_no || `Sözleşme #${contract.id}`}</h1>
            <div className="mt-1 text-sm text-ink/60">{customer.name}</div>
            <div className="mt-2">
              <span
                className={
                  contract.status === "DONE"
                    ? "inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700"
                    : "inline-flex items-center gap-1 rounded-full border border-ink/20 bg-white px-2 py-0.5 text-[11px] font-medium text-ink/60"
                }
              >
                <span>{contract.status === "DONE" ? "✓" : "○"}</span>
                {contract.status === "DONE" ? "Tamamlandı" : "Açık"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <BackButton />
            <Link className="text-sm text-terracotta print-hide" href={`/customers/${customer.id}`}>
              Müşteri Kartı
            </Link>
            <Button className="print-hide" onClick={() => window.print()}>
              Yazdır
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-ink/10 bg-white/80 p-6 text-sm">
          <div className="grid gap-3">
            <div><b>Sözleşme Tarihi:</b> {contract.contract_date || "-"}</div>
            <div><b>Sözleşme No:</b> {contract.contract_no || "-"}</div>
            <div><b>Sözleşme Türü:</b> {contract.contract_type || "-"}</div>
            <div><b>Dönemi:</b> {period}</div>
          </div>
        </div>
        <div className="rounded-2xl border border-ink/10 bg-white/80 p-6 text-sm">
          <div className="grid gap-3">
            <div><b>Vergi No:</b> {customer.tax_no || "-"}</div>
            <div><b>TCKN:</b> {customer.tckn || "-"}</div>
            <div><b>Vergi Dairesi:</b> {customer.tax_office || "-"}</div>
            <div><b>Yetkili:</b> {customer.contact_person || "-"}</div>
            <div><b>Yetkili Telefon:</b> {formatPhoneDisplay(customer.contact_phone)}</div>
            <div><b>Yetkili E-posta:</b> {customer.contact_email || "-"}</div>
            <div><b>Telefon:</b> {formatPhoneDisplay(customer.phone)}</div>
            <div><b>E-posta:</b> {customer.email || "-"}</div>
            <div><b>Adres:</b> {customer.address || "-"}</div>
          </div>
        </div>
      </div>

      <div className={`rounded-2xl border p-6 ${cardNote?.trim() || noteFiles.length > 0 ? "border-amber-300 bg-amber-50/60" : "border-ink/10 bg-white/80"}`}>
        <div className="text-sm font-semibold text-ink">Notlar</div>
        <textarea
          className="mt-3 h-28 w-full rounded-md border border-ink/20 bg-white px-3 py-2 text-sm"
          placeholder="Sözleşme kartı notu"
          value={cardNote}
          onChange={(e) => setCardNote(e.target.value)}
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handleSaveCardNote} disabled={noteSaving}>
            {noteSaving ? "Kaydediliyor..." : "Notu Kaydet"}
          </Button>
          <input
            type="file"
            className="h-10 rounded-md border border-ink/20 bg-white px-3 text-sm"
            onChange={(e) => setNoteFile(e.target.files?.[0] || null)}
          />
          <Button variant="outline" onClick={handleUploadNoteFile} disabled={!noteFile}>
            Not Dosyası Ekle
          </Button>
          {noteNotice ? <div className="text-sm text-ink/70">{noteNotice}</div> : null}
        </div>
        {noteFiles.length > 0 ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {noteFiles.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-xl border border-ink/10 bg-white p-3">
                <a className="text-sm text-terracotta" href={f.signed_url ?? f.url} target="_blank" rel="noreferrer">
                  {f.filename}
                </a>
                <button className="text-xs text-red-600" onClick={() => handleDeleteNoteFile(f.id)}>
                  Sil
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-ink/10 bg-white/80 p-6">
        <h2 className="text-xl font-semibold">Sözleşme Dosyası</h2>
        <div className="mt-4">
          {contract.file_url || contract.signed_url ? (
            <a className="text-terracotta" href={contract.signed_url ?? contract.file_url} target="_blank" rel="noreferrer">
              {contract.filename || "Sözleşme dosyası"}
            </a>
          ) : (
            <div className="text-sm text-ink/60">Dosya bulunamadı.</div>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-ink/10 bg-white/80 p-6">
          <h2 className="text-xl font-semibold">Bağlı Evraklar</h2>
          <div className="mt-4 space-y-2">
            {documents.length === 0 ? (
              <div className="text-sm text-ink/60">Bu sözleşmeye bağlı evrak yok.</div>
            ) : (
              documents.map((d) => (
                <div
                  key={d.id}
                  className={
                    d.status === "DONE"
                      ? "rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-sm"
                      : "rounded-xl border border-ink/10 bg-white p-3 text-sm"
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold">{d.doc_no}</div>
                      <div className="text-ink/60">{d.subject || "-"}</div>
                    </div>
                    <Link className="text-terracotta" href={`/documents/${d.id}`}>
                      Aç
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-white/80 p-6">
          <h2 className="text-xl font-semibold">Bağlı Raporlar</h2>
          <div className="mt-4 space-y-2">
            {reports.length === 0 ? (
              <div className="text-sm text-ink/60">Bu sözleşmeye bağlı rapor yok.</div>
            ) : (
              reports.map((r) => (
                <div
                  key={r.id}
                  className={
                    r.status === "DONE"
                      ? "rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-sm"
                      : "rounded-xl border border-ink/10 bg-white p-3 text-sm"
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold">{r.report_no}</div>
                      <div className="text-ink/60">{r.subject || "-"}</div>
                    </div>
                    <Link className="text-terracotta" href={`/reports/${r.id}`}>
                      Aç
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
