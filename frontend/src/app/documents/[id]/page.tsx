"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { apiFetch, apiUpload, me } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

type DocumentRow = {
  id: number;
  doc_no: string;
  doc_type: string;
  year: number;
  received_date?: string;
  reference_no?: string;
  sender?: string;
  recipient?: string;
  subject?: string;
  description?: string;
  delivery_method?: string;
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
};

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

export default function DocumentDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const [doc, setDoc] = useState<DocumentRow | null>(null);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [isStaff, setIsStaff] = useState(false);

  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [file3, setFile3] = useState<File | null>(null);

  const [referenceNo, setReferenceNo] = useState("");
  const [sender, setSender] = useState("");
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

  useEffect(() => {
    async function load() {
      try {
        const [d, f, meInfo] = await Promise.all([
          apiFetch<DocumentRow>(`/api/documents/${id}/`),
          apiFetch<FileRow[]>(`/api/files/?document=${id}`),
          me()
        ]);
        setDoc(d);
        setFiles(f);
        setIsStaff(Boolean(meInfo?.is_staff));
        setReferenceNo(d.reference_no || "");
        setSender(d.sender || "");
        setRecipient(d.recipient || "");
        setSubject(d.subject || "");
        setDescription(d.description || "");
        setDeliveryMethod(d.delivery_method || "");
        setDeliveryKargoName(d.delivery_kargo_name || "");
        setDeliveryKargoTracking(d.delivery_kargo_tracking || "");
        setDeliveryEldenName(d.delivery_elden_name || "");
        setDeliveryEldenDate(d.delivery_elden_date || "");
        setDeliveryEmail(d.delivery_email || "");
        setDeliveryEbysId(d.delivery_ebys_id || "");
        setDeliveryEbysDate(d.delivery_ebys_date || "");
        setDeliveryOtherDesc(d.delivery_other_desc || "");
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
    if (!doc) return;
    setSaving(true);
    setNotice(null);
    try {
      const updated = await apiFetch<DocumentRow>(`/api/documents/${doc.id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          reference_no: referenceNo || null,
          sender: sender || null,
          recipient: recipient || null,
          subject: subject || null,
          description: description || null,
          delivery_method: deliveryMethod || null,
          delivery_kargo_name: deliveryKargoName || null,
          delivery_kargo_tracking: deliveryKargoTracking || null,
          delivery_elden_name: deliveryEldenName || null,
          delivery_elden_date: deliveryEldenDate || null,
          delivery_email: deliveryEmail || null,
          delivery_ebys_id: deliveryEbysId || null,
          delivery_ebys_date: deliveryEbysDate || null,
          delivery_other_desc: deliveryOtherDesc || null
        })
      });
      setDoc(updated);
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
    if (!doc) return;
    const filesToUpload = [file1, file2, file3].filter(Boolean) as File[];
    if (filesToUpload.length === 0) return;
    for (const f of filesToUpload) {
      const fd = new FormData();
      fd.append("file", f);
      fd.append("document", String(doc.id));
      await apiUpload("/api/files/upload/", fd);
    }
    setFile1(null);
    setFile2(null);
    setFile3(null);
    const updatedFiles = await apiFetch<FileRow[]>(`/api/files/?document=${doc.id}`);
    setFiles(updatedFiles);
  }

  async function handleDeleteFile(fileId: number) {
    if (!confirm("Dosya silinsin mi?")) return;
    await apiFetch(`/api/files/${fileId}/`, { method: "DELETE" });
    const updatedFiles = await apiFetch<FileRow[]>(`/api/files/?document=${id}`);
    setFiles(updatedFiles);
  }

  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (!doc) return <div>Yükleniyor...</div>;

  return (
    <div className="space-y-6 print-area">
      <div className="rounded-2xl border border-ink/10 bg-white/80 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-ink/50">Evrak Detayı</div>
            <h1 className="text-3xl font-semibold">{doc.doc_no}</h1>
            <div className="mt-1 text-sm text-ink/60">{doc.subject || "Konu yok"}</div>
          </div>
          <div className="flex items-center gap-2">
            <Link className="text-sm text-terracotta print-hide" href={`/customers/${doc.customer}`}>
              Müşteri Kartı
            </Link>
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
            <div><b>Tarih:</b> {doc.received_date || "-"}</div>
            <div><b>Tür:</b> {doc.doc_type}</div>
            <div><b>Harici Sayı:</b> {doc.reference_no || "-"}</div>
            <div><b>Teslim:</b> {doc.delivery_method || "-"}</div>
            {doc.delivery_method === "KARGO" ? (
              <>
                <div><b>Kargo:</b> {doc.delivery_kargo_name || "-"}</div>
                <div><b>Takip No:</b> {doc.delivery_kargo_tracking || "-"}</div>
              </>
            ) : null}
            {doc.delivery_method === "ELDEN" ? (
              <>
                <div><b>Teslim Alan:</b> {doc.delivery_elden_name || "-"}</div>
                <div><b>Teslim Tarihi:</b> {doc.delivery_elden_date || "-"}</div>
              </>
            ) : null}
            {doc.delivery_method === "EPOSTA" ? (
              <div><b>E-posta:</b> {doc.delivery_email || "-"}</div>
            ) : null}
            {doc.delivery_method === "EBYS" ? (
              <>
                <div><b>EBYS ID:</b> {doc.delivery_ebys_id || "-"}</div>
                <div><b>EBYS Tarihi:</b> {doc.delivery_ebys_date || "-"}</div>
              </>
            ) : null}
            {doc.delivery_method === "DIGER" ? (
              <div><b>Diğer:</b> {doc.delivery_other_desc || "-"}</div>
            ) : null}
          </div>
        </div>
        <div className="rounded-2xl border border-ink/10 bg-white/80 p-6 text-sm">
          <div className="grid gap-3">
            <div><b>Gönderen:</b> {doc.sender || "-"}</div>
            <div><b>Alıcı:</b> {doc.recipient || "-"}</div>
            <div><b>Konu:</b> {doc.subject || "-"}</div>
            <div><b>Açıklama:</b> {doc.description || "-"}</div>
          </div>
        </div>
      </div>

      {editing ? (
        <form onSubmit={handleSave} className="rounded-2xl border border-ink/10 bg-white/80 p-6 space-y-3">
          <div className="text-sm text-ink/60">Düzenlenebilir alanlar</div>
          <Input placeholder="Harici sayı" value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} />
          <Input placeholder="Gönderen" value={sender} onChange={(e) => setSender(e.target.value)} />
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

      <div className="rounded-2xl border border-ink/10 bg-white/80 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Ekler</h2>
          <Button variant="outline" onClick={handleUploadFiles}>Dosya Yükle</Button>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-3">
          <FilePicker label="Ek 1" onChange={setFile1} />
          <FilePicker label="Ek 2" onChange={setFile2} />
          <FilePicker label="Ek 3" onChange={setFile3} />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {files.length === 0 ? (
            <div className="rounded-xl border border-ink/10 bg-white p-4 text-sm text-ink/60">
              Bu evraka ait ek yok.
            </div>
          ) : (
            files.map((f) => (
              <div key={f.id} className="rounded-xl border border-ink/10 bg-white p-4">
                <a className="text-sm font-semibold text-terracotta" href={f.url} target="_blank" rel="noreferrer">
                  {f.filename}
                </a>
                <div className="mt-2 flex items-center justify-between text-xs text-ink/50">
                  <span>İndir</span>
                  {isStaff ? (
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
