"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { apiFetch, apiUpload, me } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { BackButton } from "@/components/back-button";
import { formatPhoneDisplay, formatPhoneInput, normalizePhoneForApi, onlyDigits } from "@/lib/format";

type Customer = {
  id: number;
  name: string;
  identity_type: "VKN" | "TCKN";
  tax_no?: string;
  tckn?: string;
  tax_office?: string;
  address?: string;
  phone?: string;
  email?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  card_note?: string;
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
  card_note?: string;
  files?: FileRow[];
};

type ReportRow = {
  id: number;
  report_no: string;
  received_date?: string;
  subject?: string;
  status?: string;
  card_note?: string;
  files?: FileRow[];
};

type ContractRow = {
  id: number;
  status?: "OPEN" | "DONE";
  contract_no?: string;
  contract_date?: string;
  contract_type?: string;
  card_note?: string;
  period_start_month?: number;
  period_start_year?: number;
  period_end_month?: number;
  period_end_year?: number;
  file_url?: string;
  signed_url?: string;
};

type NoteRow = {
  id: number;
  text: string;
  created_at: string;
};

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-xl border border-ink/10 bg-white/80 p-6 text-sm text-ink/60">
      <div className="text-base font-semibold text-ink">{title}</div>
      <div className="mt-1">{subtitle}</div>
    </div>
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
  const [noteFiles, setNoteFiles] = useState<FileRow[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [isStaff, setIsStaff] = useState(false);

  const [name, setName] = useState("");
  const [identityType, setIdentityType] = useState<"VKN" | "TCKN">("VKN");
  const [taxNo, setTaxNo] = useState("");
  const [tckn, setTckn] = useState("");
  const [taxOffice, setTaxOffice] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [cardNote, setCardNote] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteNotice, setNoteNotice] = useState<string | null>(null);
  const [manualEmails, setManualEmails] = useState("");
  const [mailSending, setMailSending] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [savingNewNote, setSavingNewNote] = useState(false);
  const [noteContactName, setNoteContactName] = useState("");
  const [noteContactEmail, setNoteContactEmail] = useState("");

  const [showDocs, setShowDocs] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [showContracts, setShowContracts] = useState(false);
  const [showOtherFiles, setShowOtherFiles] = useState(false);

  const [otherFile, setOtherFile] = useState<File | null>(null);
  const [otherFileName, setOtherFileName] = useState("");
  const [noteFile, setNoteFile] = useState<File | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [c, d, r, f, nf, n, contractItems, meInfo] = await Promise.all([
          apiFetch<Customer>(`/api/customers/${id}/`),
          apiFetch<DocumentRow[]>(`/api/documents/?customer=${id}`),
          apiFetch<ReportRow[]>(`/api/reports/?customer=${id}`),
          apiFetch<FileRow[]>(`/api/files/?customer=${id}&scope=other`),
          apiFetch<FileRow[]>(`/api/files/?customer=${id}&note_scope=1`),
          apiFetch<NoteRow[]>(`/api/notes/?customer=${id}`),
          apiFetch<ContractRow[]>(`/api/contracts/?customer=${id}`),
          me()
        ]);
        setCustomer(c);
        setDocs(d);
        setReports(r);
        setFiles(f);
        setNoteFiles(nf);
        setNotes(n);
        setContracts(contractItems);
        setIsStaff(Boolean(meInfo?.is_staff));
        setName(c.name || "");
        setIdentityType(c.identity_type || "VKN");
        setTaxNo(c.tax_no || "");
        setTckn(c.tckn || "");
        setTaxOffice(c.tax_office || "");
        setAddress(c.address || "");
        setPhone(formatPhoneInput(c.phone || ""));
        setEmail(c.email || "");
        setContactPerson(c.contact_person || "");
        setContactPhone(formatPhoneInput(c.contact_phone || ""));
        setContactEmail(c.contact_email || "");
        setNoteContactName(c.contact_person || "");
        setNoteContactEmail(c.contact_email || c.email || "");
        setCardNote(c.card_note || "");
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
          identity_type: identityType,
          tax_no: identityType === "VKN" ? onlyDigits(taxNo).slice(0, 10) : null,
          tckn: identityType === "TCKN" ? onlyDigits(tckn).slice(0, 11) : null,
          tax_office: taxOffice || null,
          address: address || null,
          phone: normalizePhoneForApi(phone) || null,
          email: email || null,
          contact_person: contactPerson || null,
          contact_phone: normalizePhoneForApi(contactPhone) || null,
          contact_email: contactEmail || null
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
    if (!otherFile) return;
    const fd = new FormData();
    fd.append("file", otherFile);
    fd.append("customer", String(customer.id));
    if (otherFileName.trim()) {
      fd.append("filename", otherFileName.trim());
    }
    await apiUpload("/api/files/upload/", fd);
    setOtherFile(null);
    setOtherFileName("");
    const updatedFiles = await apiFetch<FileRow[]>(`/api/files/?customer=${customer.id}&scope=other`);
    setFiles(updatedFiles);
  }

  async function handleSaveCardNote() {
    if (!customer) return;
    setNoteSaving(true);
    setNoteNotice(null);
    try {
      const updated = await apiFetch<Customer>(`/api/customers/${customer.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ card_note: cardNote || null })
      });
      setCustomer(updated);
      setCardNote(updated.card_note || "");
      setNoteNotice("Not kaydedildi.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
      setNoteNotice(`Not kaydedilemedi: ${msg}`);
    } finally {
      setNoteSaving(false);
    }
  }

  async function handleDeleteFile(fileId: number) {
    if (!confirm("Dosya silinsin mi?")) return;
    await apiFetch(`/api/files/${fileId}/`, { method: "DELETE" });
    const updatedFiles = await apiFetch<FileRow[]>(`/api/files/?customer=${id}&scope=other`);
    setFiles(updatedFiles);
  }

  async function handleUploadNoteFile() {
    if (!customer || !noteFile) return;
    const fd = new FormData();
    fd.append("file", noteFile);
    fd.append("customer", String(customer.id));
    fd.append("note_scope", "1");
    await apiUpload("/api/files/upload/", fd);
    setNoteFile(null);
    const updatedNoteFiles = await apiFetch<FileRow[]>(`/api/files/?customer=${customer.id}&note_scope=1`);
    setNoteFiles(updatedNoteFiles);
  }

  async function handleDeleteNoteFile(fileId: number) {
    if (!confirm("Not dosyası silinsin mi?")) return;
    await apiFetch(`/api/files/${fileId}/`, { method: "DELETE" });
    const updatedNoteFiles = await apiFetch<FileRow[]>(`/api/files/?customer=${id}&note_scope=1`);
    setNoteFiles(updatedNoteFiles);
  }

  async function handleSendNoteMail() {
    if (!customer) return;
    setMailSending(true);
    setNoteNotice(null);
    try {
      await apiFetch(`/api/customers/${customer.id}/send_note_mail/`, {
        method: "POST",
        body: JSON.stringify({
          extra_emails: manualEmails || null,
          note_contact_name: noteContactName || null,
          note_contact_email: noteContactEmail || null
        })
      });
      setNoteNotice("Not e-postası gönderildi.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
      setNoteNotice(`Mail gönderilemedi: ${msg}`);
    } finally {
      setMailSending(false);
    }
  }

  async function handleAddNoteAndSend() {
    if (!customer || !newNoteText.trim()) return;
    setSavingNewNote(true);
    setNoteNotice(null);
    try {
      const created = await apiFetch<NoteRow>(`/api/notes/`, {
        method: "POST",
        body: JSON.stringify({
          customer: customer.id,
          text: newNoteText.trim(),
          send_mail: true,
          note_contact_name: noteContactName || null,
          note_contact_email: noteContactEmail || null,
          extra_emails: manualEmails || null
        })
      });
      setNotes((prev) => [created, ...prev]);
      setNewNoteText("");
      setNoteNotice("Not eklendi ve mail gönderildi.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
      setNoteNotice(`Not eklenemedi: ${msg}`);
    } finally {
      setSavingNewNote(false);
    }
  }

  const relatedNotes = useMemo(() => {
    const items: Array<{ source: string; title: string; note: string }> = [];
    for (const c of contracts) {
      if ((c.card_note || "").trim()) {
        items.push({
          source: "Sözleşme",
          title: c.contract_no || `Sözleşme #${c.id}`,
          note: (c.card_note || "").trim()
        });
      }
    }
    for (const d of docs) {
      if ((d.card_note || "").trim()) {
        items.push({
          source: "Evrak",
          title: d.doc_no,
          note: (d.card_note || "").trim()
        });
      }
    }
    for (const r of reports) {
      if ((r.card_note || "").trim()) {
        items.push({
          source: "Rapor",
          title: r.report_no,
          note: (r.card_note || "").trim()
        });
      }
    }
    return items;
  }, [contracts, docs, reports]);

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
            <div className="mt-1 text-sm text-ink/60">
              {customer.identity_type === "TCKN" ? `TCKN: ${customer.tckn || "-"}` : `Vergi No: ${customer.tax_no || "-"}`}
            </div>
          </div>
          <div className="flex items-center gap-2 print-hide">
            <BackButton />
            <Button variant="outline" onClick={() => setEditing((v) => !v)}>
              {editing ? "İptal" : "Düzenle"}
            </Button>
            <Button onClick={() => window.print()}>Yazdır</Button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-ink/10 bg-white p-4 text-sm">
            <div><b>Kimlik Türü:</b> {customer.identity_type === "TCKN" ? "TCKN" : "Vergi No"}</div>
            <div><b>Vergi No:</b> {customer.tax_no || "-"}</div>
            <div><b>TCKN:</b> {customer.tckn || "-"}</div>
            <div><b>Vergi Dairesi:</b> {customer.tax_office || "-"}</div>
            <div><b>Adres:</b> {customer.address || "-"}</div>
          </div>
          <div className="rounded-xl border border-ink/10 bg-white p-4 text-sm">
            <div><b>Telefon:</b> {formatPhoneDisplay(customer.phone)}</div>
            <div><b>E-posta:</b> {customer.email || "-"}</div>
            <div><b>Yetkili:</b> {customer.contact_person || "-"}</div>
            <div><b>Yetkili Telefon:</b> {formatPhoneDisplay(customer.contact_phone)}</div>
            <div><b>Yetkili E-posta:</b> {customer.contact_email || "-"}</div>
          </div>
        </div>
      </div>

      <div className={`rounded-2xl border p-6 ${cardNote?.trim() || noteFiles.length > 0 ? "border-amber-300 bg-amber-50/60" : "border-ink/10 bg-white/80"}`}>
        <div className="text-sm font-semibold text-ink">Notlar</div>
        {relatedNotes.length > 0 ? (
          <div className="mt-3 space-y-2 rounded-md border border-ink/15 bg-white p-3">
            <div className="text-xs font-medium text-ink/70">Kartlardan otomatik gelen notlar</div>
            {relatedNotes.map((n, i) => (
              <div key={`${n.source}-${n.title}-${i}`} className="rounded-md border border-ink/10 bg-haze/60 p-2 text-sm">
                <div className="text-xs text-ink/60">
                  {n.source}: {n.title}
                </div>
                <div className="mt-1 whitespace-pre-wrap text-ink/80">{n.note}</div>
              </div>
            ))}
          </div>
        ) : null}
        <textarea
          className="mt-3 h-28 w-full rounded-md border border-ink/20 bg-white px-3 py-2 text-sm"
          placeholder="Müşteri kartı notu"
          value={cardNote}
          onChange={(e) => setCardNote(e.target.value)}
        />
        <textarea
          className="mt-3 h-28 w-full rounded-md border border-ink/20 bg-white px-3 py-2 text-sm"
          placeholder="Yeni not yazın (bu not mail ile gönderilir)"
          value={newNoteText}
          onChange={(e) => setNewNoteText(e.target.value)}
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
          <Button variant="outline" onClick={handleSaveCardNote} disabled={noteSaving}>
            {noteSaving ? "Kaydediliyor..." : "Notu Kaydet"}
          </Button>
          <Button variant="outline" onClick={handleSendNoteMail} disabled={mailSending}>
            {mailSending ? "Gönderiliyor..." : "Notu Mail Gönder"}
          </Button>
          <Button variant="outline" onClick={handleAddNoteAndSend} disabled={savingNewNote || !newNoteText.trim()}>
            {savingNewNote ? "Kaydediliyor..." : "Yeni Notu Kaydet + Mail Gönder"}
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
                {isStaff ? (
                  <button className="text-xs text-red-600" onClick={() => handleDeleteNoteFile(f.id)}>
                    Sil
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
        {notes.length > 0 ? (
          <div className="mt-4 space-y-2">
            <div className="text-xs font-medium text-ink/70">Not Geçmişi</div>
            {notes.map((n) => (
              <div key={n.id} className="rounded-md border border-ink/10 bg-white p-2 text-sm">
                <div className="text-xs text-ink/60">{new Date(n.created_at).toLocaleString("tr-TR")}</div>
                <div className="mt-1 whitespace-pre-wrap text-ink/80">{n.text}</div>
              </div>
            ))}
          </div>
        ) : null}
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
            <div className="text-xs text-ink/60">Kimlik</div>
            <div className="text-base font-semibold">
              {customer.identity_type === "TCKN" ? customer.tckn : customer.tax_no}
            </div>
          </div>
        </div>
      </div>

      {notice ? <div className="text-sm text-ink/70">{notice}</div> : null}

      {editing ? (
        <form onSubmit={handleSave} className="rounded-2xl border border-ink/10 bg-white/80 p-6 space-y-3">
          <div className="text-sm text-ink/60">Müşteri bilgilerini düzenle</div>
          <Input placeholder="Müşteri adı" value={name} onChange={(e) => setName(e.target.value)} />
          <select
            className="h-10 rounded-md border border-ink/20 bg-white px-3 text-sm"
            value={identityType}
            onChange={(e) => setIdentityType(e.target.value as "VKN" | "TCKN")}
          >
            <option value="VKN">Vergi No</option>
            <option value="TCKN">TCKN</option>
          </select>
          {identityType === "VKN" ? (
            <Input
              placeholder="Vergi no (10)"
              value={taxNo}
              maxLength={10}
              inputMode="numeric"
              onChange={(e) => setTaxNo(onlyDigits(e.target.value).slice(0, 10))}
            />
          ) : (
            <Input
              placeholder="TCKN (11)"
              value={tckn}
              maxLength={11}
              inputMode="numeric"
              onChange={(e) => setTckn(onlyDigits(e.target.value).slice(0, 11))}
            />
          )}
          <Input placeholder="Vergi dairesi" value={taxOffice} onChange={(e) => setTaxOffice(e.target.value)} />
          <Input placeholder="Adres" value={address} onChange={(e) => setAddress(e.target.value)} />
          <Input placeholder="Telefon" value={phone} onChange={(e) => setPhone(formatPhoneInput(e.target.value))} />
          <Input placeholder="E-posta" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input placeholder="Yetkili kişi" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
          <Input placeholder="Yetkili telefon" value={contactPhone} onChange={(e) => setContactPhone(formatPhoneInput(e.target.value))} />
          <Input placeholder="Yetkili e-posta" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
          <Button
            type="submit"
            disabled={
              saving ||
              !name ||
              (identityType === "VKN" ? onlyDigits(taxNo).length !== 10 : onlyDigits(tckn).length !== 11)
            }
          >
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
                  <div className="mt-1 flex items-center gap-2 text-sm font-semibold">
                    {c.contract_no || "-"}
                    <span
                      className={
                        c.status === "DONE"
                          ? "inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700"
                          : "inline-flex items-center gap-1 rounded-full border border-ink/20 bg-white px-2 py-0.5 text-[11px] font-medium text-ink/60"
                      }
                    >
                      <span>{c.status === "DONE" ? "✓" : "○"}</span>
                      {c.status === "DONE" ? "Tamamlandı" : "Açık"}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-ink/60">
                    Tür: {c.contract_type || "-"} • Dönem: {formatPeriod(c)}
                  </div>
                  <div className="mt-2">
                    <Link className="text-sm text-terracotta" href={`/contracts/${c.id}`}>
                      Sözleşme Kartını Aç
                    </Link>
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
                      ? "rounded-xl border border-emerald-200 bg-emerald-100/60 p-4"
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
                      ? "rounded-xl border border-emerald-200 bg-emerald-100/60 p-4"
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
          <Button variant="outline" onClick={() => setShowOtherFiles((v) => !v)}>
            {showOtherFiles ? "Gizle" : "Göster"}
          </Button>
        </div>
        {showOtherFiles ? (
          <>
            <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
              <Input
                placeholder="Dosya adı (opsiyonel)"
                value={otherFileName}
                onChange={(e) => setOtherFileName(e.target.value)}
              />
              <input
                type="file"
                className="h-10 rounded-md border border-ink/20 bg-white px-3 text-sm"
                onChange={(e) => setOtherFile(e.target.files?.[0] || null)}
              />
              <Button variant="outline" onClick={handleUploadCustomerFiles} disabled={!otherFile}>
                Yükle
              </Button>
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


