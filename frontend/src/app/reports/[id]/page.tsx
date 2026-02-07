"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

type ReportRow = {
  id: number;
  report_no: string;
  report_type: string;
  year: number;
  received_date?: string;
  recipient?: string;
  subject?: string;
  description?: string;
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
};

export default function ReportDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const [rep, setRep] = useState<ReportRow | null>(null);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

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
        const [r, f] = await Promise.all([
          apiFetch<ReportRow>(`/api/reports/${id}/`),
          apiFetch<FileRow[]>(`/api/files/?report=${id}`)
        ]);
        setRep(r);
        setFiles(f);
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

  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (!rep) return <div>Loading...</div>;

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
            <div className="text-xs uppercase tracking-widest text-ink/50">Rapor Detayi</div>
            <h1 className="text-3xl font-semibold">{rep.report_no}</h1>
            <div className="mt-1 text-sm text-ink/60">{rep.subject || "Konu yok"}</div>
          </div>
          <div className="flex items-center gap-2">
            <Link className="text-sm text-terracotta print-hide" href={`/customers/${rep.customer}`}>
              Musteri Karti
            </Link>
            <Button className="print-hide" variant="outline" onClick={() => setEditing((v) => !v)}>
              {editing ? "Iptal" : "Duzenle"}
            </Button>
            <Button className="print-hide" onClick={() => window.print()}>Yazdir</Button>
          </div>
        </div>
      </div>

      {notice ? <div className="text-sm text-ink/70">{notice}</div> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-ink/10 bg-white/80 p-6 text-sm">
          <div className="grid gap-3">
            <div><b>Tarih:</b> {rep.received_date || "-"}</div>
            <div><b>Tur:</b> {rep.report_type}</div>
            <div><b>Donemi:</b> {periodText}</div>
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
              <div><b>Diger:</b> {rep.delivery_other_desc || "-"}</div>
            ) : null}
          </div>
        </div>
        <div className="rounded-2xl border border-ink/10 bg-white/80 p-6 text-sm">
          <div className="grid gap-3">
            <div><b>Alici:</b> {rep.recipient || "-"}</div>
            <div><b>Konu:</b> {rep.subject || "-"}</div>
            <div><b>Aciklama:</b> {rep.description || "-"}</div>
          </div>
        </div>
      </div>

      {editing ? (
        <form onSubmit={handleSave} className="rounded-2xl border border-ink/10 bg-white/80 p-6 space-y-3">
          <div className="text-sm text-ink/60">Duzenlenebilir alanlar</div>
          <Input placeholder="Alici" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
          <Input placeholder="Konu" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <select
            className="h-10 rounded-md border border-ink/20 bg-white px-3 text-sm"
            value={deliveryMethod}
            onChange={(e) => setDeliveryMethod(e.target.value)}
          >
            <option value="">Teslim yontemi</option>
            <option value="KARGO">Kargo</option>
            <option value="EPOSTA">E-posta</option>
            <option value="ELDEN">Elden</option>
            <option value="EBYS">EBYS</option>
            <option value="DIGER">Diger</option>
          </select>
          {deliveryMethod === "KARGO" ? (
            <>
              <Input placeholder="Kargo adi" value={deliveryKargoName} onChange={(e) => setDeliveryKargoName(e.target.value)} />
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
              placeholder="Aciklama"
              value={deliveryOtherDesc}
              onChange={(e) => setDeliveryOtherDesc(e.target.value)}
            />
          ) : null}
          <textarea
            className="h-24 rounded-md border border-ink/20 bg-white px-3 py-2 text-sm"
            placeholder="Aciklama (genel)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Button type="submit" disabled={saving}>
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </form>
      ) : null}

      <div className="rounded-2xl border border-ink/10 bg-white/80 p-6">
        <h2 className="text-xl font-semibold">Ekler</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {files.length === 0 ? (
            <div className="rounded-xl border border-ink/10 bg-white p-4 text-sm text-ink/60">
              Bu rapora ait ek yok.
            </div>
          ) : (
            files.map((f) => (
              <a
                key={f.id}
                className="rounded-xl border border-ink/10 bg-white p-4 hover:bg-haze"
                href={f.url}
                target="_blank"
                rel="noreferrer"
              >
                <div className="text-sm font-semibold">{f.filename}</div>
                <div className="mt-1 text-xs text-ink/50">Indir</div>
              </a>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
