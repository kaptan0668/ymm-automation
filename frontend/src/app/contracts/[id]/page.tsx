"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch, apiUpload } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  note_contact_name?: string;
  note_contact_email?: string;
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

type NoteRow = {
  id: number;
  subject?: string;
  text: string;
  created_at: string;
  mail_sent_at?: string | null;
  files?: FileRow[];
};

export default function ContractDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [contract, setContract] = useState<ContractRow | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [cardNote, setCardNote] = useState("");
  const [noteNotice, setNoteNotice] = useState<string | null>(null);
  const [noteContactName, setNoteContactName] = useState("");
  const [noteContactEmail, setNoteContactEmail] = useState("");
  const [manualEmails, setManualEmails] = useState("");
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [newNoteSubject, setNewNoteSubject] = useState("Bu sözleşme hakkında");
  const [newNoteText, setNewNoteText] = useState("");
  const [newNoteFiles, setNewNoteFiles] = useState<File[]>([]);
  const [noteActionLoading, setNoteActionLoading] = useState<"save" | "send" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const c = await apiFetch<ContractRow>(`/api/contracts/${id}/`);
        const [cust, docs, reps, n] = await Promise.all([
          apiFetch<Customer>(`/api/customers/${c.customer}/`),
          apiFetch<DocumentRow[]>(`/api/documents/?contract=${c.id}`),
          apiFetch<ReportRow[]>(`/api/reports/?contract=${c.id}`),
          apiFetch<NoteRow[]>(`/api/notes/?contract=${c.id}`)
        ]);
        setContract(c);
        setCustomer(cust);
        setDocuments(docs);
        setReports(reps);
        setNotes(n);
        setCardNote(c.card_note || "");
        setNoteContactName(c.note_contact_name || cust.contact_person || "");
        setNoteContactEmail(c.note_contact_email || cust.contact_email || cust.email || "");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
        setError(msg);
      }
    }
    load();
  }, [id]);
  async function handleSaveNote(sendMail: boolean) {
    if (!contract || !newNoteText.trim()) return;
    setNoteActionLoading(sendMail ? "send" : "save");
    setNoteNotice(null);
    try {
      const created = await apiFetch<NoteRow>(`/api/notes/`, {
        method: "POST",
        body: JSON.stringify({
          contract: contract.id,
          subject: newNoteSubject.trim() || "Bu sözleşme hakkında",
          text: newNoteText.trim()
        })
      });
      for (const f of newNoteFiles) {
        const fd = new FormData();
        fd.append("file", f);
        fd.append("contract", String(contract.id));
        fd.append("customer", String(contract.customer));
        fd.append("note", String(created.id));
        fd.append("note_scope", "1");
        await apiUpload("/api/files/upload/", fd);
      }
      if (sendMail) {
        await apiFetch(`/api/notes/${created.id}/send_mail/`, {
          method: "POST",
          body: JSON.stringify({
            subject: newNoteSubject.trim() || "Bu sözleşme hakkında",
            note_contact_name: noteContactName || null,
            note_contact_email: noteContactEmail || null,
            extra_emails: manualEmails || null
          })
        });
      }
      const [updatedContract, updatedNotes] = await Promise.all([
        apiFetch<ContractRow>(`/api/contracts/${contract.id}/`),
        apiFetch<NoteRow[]>(`/api/notes/?contract=${contract.id}`)
      ]);
      setContract(updatedContract);
      setCardNote(updatedContract.card_note || "");
      setNotes(updatedNotes);
      setNewNoteText("");
      setNewNoteFiles([]);
      setNoteModalOpen(false);
      setNoteNotice(sendMail ? "Not kaydedildi ve mail gönderildi." : "Not kaydedildi.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
      setNoteNotice(`Not işlemi başarısız: ${msg}`);
    } finally {
      setNoteActionLoading(null);
    }
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

      <div className={`rounded-2xl border p-6 ${cardNote?.trim() ? "border-amber-300 bg-amber-50/60" : "border-ink/10 bg-white/80"}`}>
        <div className="text-sm font-semibold text-ink">Notlar</div>
        <textarea
          className="mt-3 h-24 w-full rounded-md border border-ink/20 bg-white px-3 py-2 text-sm"
          placeholder="Son not"
          value={cardNote}
          readOnly
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Input
            placeholder="İlgili kişi"
            value={noteContactName}
            onChange={(e) => setNoteContactName(e.target.value)}
          />
          <Input
            placeholder="İlgili e-posta"
            value={noteContactEmail}
            onChange={(e) => setNoteContactEmail(e.target.value)}
          />
          <Input
            placeholder="Ek e-posta (virgülle)"
            value={manualEmails}
            onChange={(e) => setManualEmails(e.target.value)}
          />
          <Button variant="outline" onClick={() => setNoteModalOpen(true)}>
            Not Ekle
          </Button>
          {noteNotice ? <div className="text-sm text-ink/70">{noteNotice}</div> : null}
        </div>
        {notes.length > 0 ? (
          <div className="mt-4 space-y-2">
            <div className="text-xs font-medium text-ink/70">Not Geçmişi</div>
            {notes.map((n) => (
              <div key={n.id} className="rounded-md border border-ink/10 bg-white p-2 text-sm">
                <div className="text-xs text-ink/60">
                  Kayıt: {new Date(n.created_at).toLocaleString("tr-TR")}
                  {n.mail_sent_at ? ` • Mail: ${new Date(n.mail_sent_at).toLocaleString("tr-TR")}` : ""}
                </div>
                {n.subject ? <div className="mt-1 font-medium text-ink/80">Konu: {n.subject}</div> : null}
                <div className="mt-1 whitespace-pre-wrap text-ink/80">{n.text}</div>
                {n.files && n.files.length > 0 ? (
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {n.files.map((f) => (
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
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {noteModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-ink/10 bg-white p-6 shadow-xl">
            <div className="text-base font-semibold">Not Ekle</div>
            <Input
              className="mt-3"
              placeholder="Konu"
              value={newNoteSubject}
              onChange={(e) => setNewNoteSubject(e.target.value)}
            />
            <textarea
              className="mt-3 h-40 w-full rounded-md border border-ink/20 bg-white px-3 py-2 text-sm"
              placeholder="Not metni"
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
            />
            <input
              type="file"
              multiple
              className="mt-3 block w-full text-sm"
              onChange={(e) => setNewNoteFiles(Array.from(e.target.files || []))}
            />
            {newNoteFiles.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {newNoteFiles.map((f) => (
                  <span key={`${f.name}-${f.size}`} className="rounded-full border border-ink/20 px-2 py-0.5 text-xs">
                    {f.name}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setNoteModalOpen(false)} disabled={noteActionLoading !== null}>
                İptal
              </Button>
              <Button variant="outline" onClick={() => handleSaveNote(false)} disabled={noteActionLoading !== null || !newNoteText.trim()}>
                {noteActionLoading === "save" ? "Kaydediliyor..." : "Kaydet"}
              </Button>
              <Button onClick={() => handleSaveNote(true)} disabled={noteActionLoading !== null || !newNoteText.trim()}>
                {noteActionLoading === "send" ? "Gönderiliyor..." : "Kaydet ve Mail Gönder"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

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

