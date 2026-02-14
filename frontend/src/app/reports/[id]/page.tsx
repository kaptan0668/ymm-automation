"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { apiFetch, apiUpload, me } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { BackButton } from "@/components/back-button";

type ReportRow = {
  id: number;
  report_no: string;
  report_type: string;
  year: number;
  status?: string;
  received_date?: string;
  recipient?: string;
  subject?: string;
  description?: string;
  card_note?: string;
  note_contact_name?: string;
  note_contact_email?: string;
  delivery_method?: string;
  period_start_month?: number;
  period_start_year?: number;
  period_end_month?: number;
  period_end_year?: number;
  delivery_kargo_name?: string;
  delivery_kargo_tracking?: string;
  delivery_elden_name?: string;
  delivery_elden_date?: string;
  delivery_email?: string;
  delivery_ebys_id?: string;
  delivery_ebys_date?: string;
  delivery_other_desc?: string;
  customer: number;
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
  mail_sent_to?: string[];
  files?: FileRow[];
  source_label?: string;
  source_code?: string;
};

type CustomerMini = {
  id: number;
  contact_person?: string;
  contact_email?: string;
  email?: string;
};

export default function ReportDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const [rep, setRep] = useState<ReportRow | null>(null);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSuperuser, setIsSuperuser] = useState(false);

  const [uploadFiles, setUploadFiles] = useState<File[]>([]);

  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("");
  const [deliveryKargoName, setDeliveryKargoName] = useState("");
  const [deliveryKargoTracking, setDeliveryKargoTracking] = useState("");
  const [deliveryEldenName, setDeliveryEldenName] = useState("");
  const [deliveryEldenDate, setDeliveryEldenDate] = useState("");
  const [deliveryEmail, setDeliveryEmail] = useState("");
  const [deliveryEbysId, setDeliveryEbysId] = useState("");
  const [deliveryEbysDate, setDeliveryEbysDate] = useState("");
  const [deliveryOtherDesc, setDeliveryOtherDesc] = useState("");
  const [cardNote, setCardNote] = useState("");
  const [noteNotice, setNoteNotice] = useState<string | null>(null);
  const [noteContactName, setNoteContactName] = useState("");
  const [noteContactEmail, setNoteContactEmail] = useState("");
  const [manualEmails, setManualEmails] = useState("");
  const [recipientEmails, setRecipientEmails] = useState("");
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [newNoteSubject, setNewNoteSubject] = useState("Bu rapor hakkında");
  const [newNoteText, setNewNoteText] = useState("");
  const [newNoteFiles, setNewNoteFiles] = useState<File[]>([]);
  const [noteActionLoading, setNoteActionLoading] = useState<"save" | "send" | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerMini | null>(null);

  function uniqueEmails(values: Array<string | undefined | null>) {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const v of values) {
      const e = (v || "").trim();
      if (!e) continue;
      const key = e.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(e);
    }
    return out;
  }

  useEffect(() => {
    async function load() {
      try {
        const [r, f, n, meInfo] = await Promise.all([
          apiFetch<ReportRow>(`/api/reports/${id}/`),
          apiFetch<FileRow[]>(`/api/files/?report=${id}&note_scope=0`),
          apiFetch<NoteRow[]>(`/api/notes/?report=${id}`),
          me()
        ]);
        setRep(r);
        setFiles(f);
        setNotes(n);
        setIsSuperuser(Boolean(meInfo?.is_superuser));
        setRecipient(r.recipient || "");
        setSubject(r.subject || "");
        setDescription(r.description || "");
        setDeliveryMethod(r.delivery_method || "");
        setDeliveryKargoName(r.delivery_kargo_name || "");
        setDeliveryKargoTracking(r.delivery_kargo_tracking || "");
        setDeliveryEldenName(r.delivery_elden_name || "");
        setDeliveryEldenDate(r.delivery_elden_date || "");
        setDeliveryEmail(r.delivery_email || "");
        setDeliveryEbysId(r.delivery_ebys_id || "");
        setDeliveryEbysDate(r.delivery_ebys_date || "");
        setDeliveryOtherDesc(r.delivery_other_desc || "");
        setCardNote(r.card_note || "");
        setNoteContactName(r.note_contact_name || "");
        setNoteContactEmail(r.note_contact_email || "");
        const c = await apiFetch<CustomerMini>(`/api/customers/${r.customer}/`);
        setCustomerInfo(c);
        const defaultName = r.note_contact_name || c.contact_person || "";
        const defaultEmail = r.note_contact_email || c.contact_email || c.email || "";
        setNoteContactName(defaultName);
        setNoteContactEmail(defaultEmail);
        setRecipientEmails(
          uniqueEmails([r.note_contact_email, r.delivery_email, c.contact_email, c.email]).join(", ")
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
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
    if (!rep) return;
    setSaving(true);
    setNotice(null);
    try {
      const updated = await apiFetch<ReportRow>(`/api/reports/${rep.id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          recipient: recipient || null,
          subject: subject || null,
          description: description || null,
          delivery_method: deliveryMethod || null,
          delivery_kargo_name: deliveryKargoName || null,
          delivery_kargo_tracking: deliveryKargoTracking || null,
          delivery_elden_name: deliveryEldenName || null,
          delivery_elden_date: deliveryEldenDate || null,
          delivery_email: deliveryEmail || null,
          note_contact_name: noteContactName || null,
          note_contact_email: noteContactEmail || null,
          delivery_ebys_id: deliveryEbysId || null,
          delivery_ebys_date: deliveryEbysDate || null,
          delivery_other_desc: deliveryOtherDesc || null
        })
      });
      setRep(updated);
      setEditing(false);
      setNotice("Kaydedildi.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
      setNotice(`Kaydedilemedi: ${msg}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleUploadFiles() {
    if (!rep) return;
    const filesToUpload = uploadFiles;
    if (filesToUpload.length === 0) return;
    for (const f of filesToUpload) {
      const fd = new FormData();
      fd.append("file", f);
      fd.append("report", String(rep.id));
      await apiUpload("/api/files/upload/", fd);
    }
    setUploadFiles([]);
    const updatedFiles = await apiFetch<FileRow[]>(`/api/files/?report=${rep.id}&note_scope=0`);
    setFiles(updatedFiles);
  }

  async function handleDeleteFile(fileId: number) {
    if (!confirm("Dosya silinsin mi?")) return;
    await apiFetch(`/api/files/${fileId}/`, { method: "DELETE" });
    const updatedFiles = await apiFetch<FileRow[]>(`/api/files/?report=${id}&note_scope=0`);
    setFiles(updatedFiles);
  }

  async function handleToggleStatus() {
    if (!rep) return;
    const next = rep.status === "DONE" ? "OPEN" : "DONE";
    try {
      await apiFetch(`/api/reports/${rep.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ status: next })
      });
      const updated = await apiFetch<ReportRow>(`/api/reports/${id}/`);
      setRep(updated);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
      setNotice(`Durum güncellenemedi: ${msg}`);
    }
  }

  async function handleSaveNote(sendMail: boolean) {
    if (!rep || !newNoteText.trim()) return;
    setModalError(null);
    if (sendMail && !recipientEmails.trim()) {
      setModalError("Mail göndermek için en az bir alıcı e-posta girin.");
      return;
    }
    setNoteActionLoading(sendMail ? "send" : "save");
    setNoteNotice(null);
    try {
      const created = await apiFetch<NoteRow>(`/api/notes/`, {
        method: "POST",
        body: JSON.stringify({
          report: rep.id,
          subject: newNoteSubject.trim() || "Bu rapor hakkında",
          text: newNoteText.trim()
        })
      });
      for (const f of newNoteFiles) {
        const fd = new FormData();
        fd.append("file", f);
        fd.append("report", String(rep.id));
        fd.append("note", String(created.id));
        fd.append("note_scope", "1");
        await apiUpload("/api/files/upload/", fd);
      }
      if (sendMail) {
        const mailRes = await apiFetch<{ sent_to?: string[] }>(`/api/notes/${created.id}/send_mail/`, {
          method: "POST",
          body: JSON.stringify({
            subject: newNoteSubject.trim() || "Bu rapor hakkında",
            note_contact_name: noteContactName || null,
            note_contact_email: noteContactEmail || null,
            extra_emails: manualEmails || null,
            recipients: recipientEmails
          })
        });
        const sentTo = (mailRes.sent_to || []).join(", ");
        if (sentTo) {
          setNoteNotice(`Not kaydedildi ve mail gönderildi: ${sentTo}`);
        }
      }
      const [updatedRep, updatedNotes] = await Promise.all([
        apiFetch<ReportRow>(`/api/reports/${rep.id}/`),
        apiFetch<NoteRow[]>(`/api/notes/?report=${rep.id}`)
      ]);
      setRep(updatedRep);
      setCardNote(updatedRep.card_note || "");
      setNotes(updatedNotes);
      setNewNoteText("");
      setNewNoteFiles([]);
      setNoteModalOpen(false);
      if (!sendMail) setNoteNotice("Not kaydedildi.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
      setNoteNotice(`Not işlemi başarısız: ${msg}`);
      setModalError(`Not işlemi başarısız: ${msg}`);
    } finally {
      setNoteActionLoading(null);
    }
  }

  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (!rep) return <div>Yükleniyor...</div>;

  const periodText =
    rep.period_start_month && rep.period_start_year && rep.period_end_month && rep.period_end_year
      ? `${String(rep.period_start_month).padStart(2, "0")}/${rep.period_start_year}-${String(
          rep.period_end_month
        ).padStart(2, "0")}/${rep.period_end_year}`
      : "-";

  return (
    <div className="space-y-6 print-area">
      <div className="rounded-2xl border border-ink/10 bg-white/80 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-ink/50">Rapor Detayı</div>
            <h1 className="text-3xl font-semibold">{rep.report_no}</h1>
            <div className="mt-1 text-sm text-ink/60">{rep.subject || "Konu yok"}</div>
            <div className="mt-2 text-sm">
              <span className={rep.status === "DONE" ? "text-emerald-700" : "text-ink/70"}>
                {rep.status === "DONE" ? "Tamamlandı" : "Açık"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <BackButton />
            <Link className="text-sm text-terracotta print-hide" href={`/customers/${rep.customer}`}>
              Mükellef Kartı
            </Link>
            <Button className="print-hide" variant="outline" onClick={handleToggleStatus}>
              {rep.status === "DONE" ? "Geri al" : "Tamamla"}
            </Button>
            <Button className="print-hide" variant="outline" onClick={() => setEditing((v) => !v)}>
              {editing ? "İptal" : "Düzenle"}
            </Button>
            <Button className="print-hide" onClick={() => window.print()}>Yazdır</Button>
          </div>
        </div>
      </div>

      {notice ? <div className="text-sm text-ink/70">{notice}</div> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-ink/10 bg-white/80 p-6 text-sm">
            <div className="grid gap-3">
            <div><b>Tarih:</b> {rep.received_date || "-"}</div>
            <div><b>Tür:</b> {rep.report_type}</div>
            <div><b>Dönemi:</b> {periodText}</div>
            <div><b>Teslim:</b> {rep.delivery_method || "-"}</div>
            {rep.delivery_method === "KARGO" ? (
              <>
                <div><b>Kargo:</b> {rep.delivery_kargo_name || "-"}</div>
                <div><b>Takip No:</b> {rep.delivery_kargo_tracking || "-"}</div>
              </>
            ) : null}
            {rep.delivery_method === "ELDEN" ? (
              <>
                <div><b>Teslim Alan:</b> {rep.delivery_elden_name || "-"}</div>
                <div><b>Teslim Tarihi:</b> {rep.delivery_elden_date || "-"}</div>
              </>
            ) : null}
            {rep.delivery_method === "EPOSTA" ? (
              <div><b>E-posta:</b> {rep.delivery_email || "-"}</div>
            ) : null}
            {rep.delivery_method === "EBYS" ? (
              <>
                <div><b>EBYS ID:</b> {rep.delivery_ebys_id || "-"}</div>
                <div><b>EBYS Tarihi:</b> {rep.delivery_ebys_date || "-"}</div>
              </>
            ) : null}
            {rep.delivery_method === "DIGER" ? (
              <div><b>Diğer:</b> {rep.delivery_other_desc || "-"}</div>
            ) : null}
          </div>
        </div>
        <div className="rounded-2xl border border-ink/10 bg-white/80 p-6 text-sm">
          <div className="grid gap-3">
            <div><b>Alıcı:</b> {rep.recipient || "-"}</div>
            <div><b>Konu:</b> {rep.subject || "-"}</div>
            <div><b>Açıklama:</b> {rep.description || "-"}</div>
          </div>
        </div>
      </div>

      {editing ? (
        <form onSubmit={handleSave} className="rounded-2xl border border-ink/10 bg-white/80 p-6 space-y-3">
          <div className="text-sm text-ink/60">Düzenlenebilir alanlar</div>
          <Input placeholder="Alıcı" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
          <Input placeholder="Konu" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <select
            className="h-10 rounded-md border border-ink/20 bg-white px-3 text-sm"
            value={deliveryMethod}
            onChange={(e) => setDeliveryMethod(e.target.value)}
          >
            <option value="">Teslim yöntemi</option>
            <option value="KARGO">Kargo</option>
            <option value="EPOSTA">E-posta</option>
            <option value="ELDEN">Elden</option>
            <option value="EBYS">EBYS</option>
            <option value="DIGER">Diğer</option>
          </select>
          {deliveryMethod === "KARGO" ? (
            <>
              <Input placeholder="Kargo adı" value={deliveryKargoName} onChange={(e) => setDeliveryKargoName(e.target.value)} />
              <Input placeholder="Takip no" value={deliveryKargoTracking} onChange={(e) => setDeliveryKargoTracking(e.target.value)} />
            </>
          ) : null}
          {deliveryMethod === "ELDEN" ? (
            <>
              <Input placeholder="Teslim alan (Ad Soyad)" value={deliveryEldenName} onChange={(e) => setDeliveryEldenName(e.target.value)} />
              <Input type="date" placeholder="Teslim tarihi" value={deliveryEldenDate} onChange={(e) => setDeliveryEldenDate(e.target.value)} />
            </>
          ) : null}
          {deliveryMethod === "EPOSTA" ? (
            <Input placeholder="E-posta adresi" value={deliveryEmail} onChange={(e) => setDeliveryEmail(e.target.value)} />
          ) : null}
          {deliveryMethod === "EBYS" ? (
            <>
              <Input placeholder="EBYS ID" value={deliveryEbysId} onChange={(e) => setDeliveryEbysId(e.target.value)} />
              <Input type="date" placeholder="EBYS tarihi" value={deliveryEbysDate} onChange={(e) => setDeliveryEbysDate(e.target.value)} />
            </>
          ) : null}
          {deliveryMethod === "DIGER" ? (
            <textarea
              className="h-24 rounded-md border border-ink/20 bg-white px-3 py-2 text-sm"
              placeholder="Açıklama"
              value={deliveryOtherDesc}
              onChange={(e) => setDeliveryOtherDesc(e.target.value)}
            />
          ) : null}
          <textarea
            className="h-24 rounded-md border border-ink/20 bg-white px-3 py-2 text-sm"
            placeholder="Açıklama (genel)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Button type="submit" disabled={saving}>
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </form>
      ) : null}

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
          <Button
            variant="outline"
            onClick={() => {
              setManualEmails("");
              setRecipientEmails(uniqueEmails([rep.note_contact_email, rep.delivery_email, customerInfo?.contact_email, customerInfo?.email]).join(", "));
              setNoteModalOpen(true);
            }}
          >
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
                {n.mail_sent_to && n.mail_sent_to.length > 0 ? (
                  <div className="mt-1 text-xs text-ink/60">Gönderilen: {n.mail_sent_to.join(", ")}</div>
                ) : null}
                {n.subject ? <div className="mt-1 font-medium text-ink/80">Konu: {n.subject}</div> : null}
                <div className="mt-1 whitespace-pre-wrap text-ink/80">{n.text}</div>
                {n.files && n.files.length > 0 ? (
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {n.files.map((f) => (
                      <div key={f.id} className="flex items-center justify-between rounded border border-ink/10 p-1">
                        <a className="text-xs text-terracotta" href={f.signed_url ?? f.url} target="_blank" rel="noreferrer">
                          {f.filename}
                        </a>
                        {isSuperuser ? (
                          <button
                            className="text-[11px] text-red-600"
                            onClick={async () => {
                              if (!confirm("Bu not dosyası silinsin mi?")) return;
                              await apiFetch(`/api/files/${f.id}/`, { method: "DELETE" });
                              const updatedNotes = await apiFetch<NoteRow[]>(`/api/notes/?report=${id}`);
                              setNotes(updatedNotes);
                            }}
                          >
                            Sil
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
                {isSuperuser ? (
                  <div className="mt-2">
                    <button
                      className="text-xs text-red-600"
                      onClick={async () => {
                        if (!confirm("Bu not silinsin mi?")) return;
                        await apiFetch(`/api/notes/${n.id}/`, { method: "DELETE" });
                        const [updatedNotes, updatedRep] = await Promise.all([
                          apiFetch<NoteRow[]>(`/api/notes/?report=${id}`),
                          apiFetch<ReportRow>(`/api/reports/${id}/`)
                        ]);
                        setNotes(updatedNotes);
                        setRep(updatedRep);
                        setCardNote(updatedRep.card_note || "");
                      }}
                    >
                      Notu Sil
                    </button>
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
            <Input
              className="mt-3"
              placeholder="Alıcı e-postalar (virgülle)"
              value={recipientEmails}
              onChange={(e) => setRecipientEmails(e.target.value)}
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
                  <span key={`${f.name}-${f.size}`} className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-2 py-0.5 text-xs">
                    {f.name}
                    <button
                      className="text-red-600"
                      onClick={() => setNewNoteFiles((prev) => prev.filter((x) => !(x.name === f.name && x.size === f.size)))}
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
            {modalError ? <div className="mt-2 text-sm text-red-600">{modalError}</div> : null}
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
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Ekler</h2>
          <Button variant="outline" onClick={handleUploadFiles}>Dosya Yükle</Button>
        </div>
        <div className="mt-4 rounded-lg border border-dashed border-ink/20 bg-white p-3">
          <label className="text-sm text-ink/70">Ek Dosyalar</label>
          <input
            type="file"
            multiple
            className="mt-2 block w-full text-sm"
            onChange={(e) => setUploadFiles(Array.from(e.target.files || []))}
          />
          {uploadFiles.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {uploadFiles.map((f) => (
                <span key={`${f.name}-${f.size}`} className="rounded-full border border-ink/20 px-2 py-0.5 text-xs">
                  {f.name}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {files.length === 0 ? (
            <div className="rounded-xl border border-ink/10 bg-white p-4 text-sm text-ink/60">
              Bu rapora ait ek yok.
            </div>
          ) : (
            files.map((f) => (
              <div key={f.id} className="rounded-xl border border-ink/10 bg-white p-4">
                <a
                  className="text-sm font-semibold text-terracotta"
                  href={f.signed_url ?? f.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {f.filename}
                </a>
                <div className="mt-2 flex items-center justify-between text-xs text-ink/50">
                  <span>İndir</span>
                  {isSuperuser ? (
                    <button className="text-xs text-red-600" onClick={() => handleDeleteFile(f.id)}>
                      Sil
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}



