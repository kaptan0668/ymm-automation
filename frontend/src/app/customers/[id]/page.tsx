"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
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

type DocumentRow = {
  id: number;
  doc_no: string;
  received_date?: string;
  subject?: string;
};

type ReportRow = {
  id: number;
  report_no: string;
  received_date?: string;
  subject?: string;
};

type FileRow = {
  id: number;
  filename: string;
  url: string;
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
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [taxNo, setTaxNo] = useState("");
  const [taxOffice, setTaxOffice] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [contactPerson, setContactPerson] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [c, d, r, f] = await Promise.all([
          apiFetch<Customer>(`/api/customers/${id}/`),
          apiFetch<DocumentRow[]>(`/api/documents/?customer=${id}`),
          apiFetch<ReportRow[]>(`/api/reports/?customer=${id}`),
          apiFetch<FileRow[]>(`/api/files/?customer=${id}`)
        ]);
        setCustomer(c);
        setDocs(d);
        setReports(r);
        setFiles(f);
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

  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (!customer) return <div>Yukleniyor...</div>;

  const docCount = docs.length;
  const reportCount = reports.length;
  const fileCount = files.length;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-ink/10 bg-white/80 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-ink/50">Musteri Karti</div>
            <h1 className="text-3xl font-semibold">{customer.name}</h1>
            <div className="mt-1 text-sm text-ink/60">Vergi No: {customer.tax_no}</div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setEditing((v) => !v)}>
              {editing ? "Iptal" : "Duzenle"}
            </Button>
            <Button onClick={() => window.print()}>Yazdir</Button>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
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
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-ink/10 bg-white p-4 text-sm">
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
      {notice ? <div className="text-sm text-ink/70">{notice}</div> : null}

      {editing ? (
        <form onSubmit={handleSave} className="rounded-2xl border border-ink/10 bg-white/80 p-6 space-y-3">
          <div className="text-sm text-ink/60">Musteri bilgilerini duzenle</div>
          <Input placeholder="Musteri adi" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Vergi no" value={taxNo} onChange={(e) => setTaxNo(e.target.value)} />
          <Input placeholder="Vergi dairesi" value={taxOffice} onChange={(e) => setTaxOffice(e.target.value)} />
          <Input placeholder="Adres" value={address} onChange={(e) => setAddress(e.target.value)} />
          <Input placeholder="Telefon" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input placeholder="E-posta" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input placeholder="Yetkili kisi" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
          <Button type="submit" disabled={saving}>
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </form>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-ink/10 bg-white/80 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Evraklar</h2>
            <Link className="text-sm text-terracotta" href="/documents">
              Tumunu Gor
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {docs.length === 0 ? (
              <EmptyState title="Evrak yok" subtitle="Bu musteri icin kayitli evrak bulunamadi." />
            ) : (
              docs.map((d) => (
                <Link
                  key={d.id}
                  href={`/documents/${d.id}`}
                  className="block rounded-xl border border-ink/10 bg-white p-4 hover:bg-haze"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-ink/60">{d.received_date || "-"}</div>
                    <div className="text-xs text-ink/50">Detay</div>
                  </div>
                  <div className="mt-1 text-sm font-semibold">{d.doc_no}</div>
                  <div className="mt-1 text-sm text-ink/60">{d.subject || "Konu yok"}</div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-white/80 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Raporlar</h2>
            <Link className="text-sm text-terracotta" href="/reports">
              Tumunu Gor
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {reports.length === 0 ? (
              <EmptyState title="Rapor yok" subtitle="Bu musteri icin kayitli rapor bulunamadi." />
            ) : (
              reports.map((r) => (
                <Link
                  key={r.id}
                  href={`/reports/${r.id}`}
                  className="block rounded-xl border border-ink/10 bg-white p-4 hover:bg-haze"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-ink/60">{r.received_date || "-"}</div>
                    <div className="text-xs text-ink/50">Detay</div>
                  </div>
                  <div className="mt-1 text-sm font-semibold">{r.report_no}</div>
                  <div className="mt-1 text-sm text-ink/60">{r.subject || "Konu yok"}</div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-ink/10 bg-white/80 p-6">
        <h2 className="text-xl font-semibold">Ekler</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {files.length === 0 ? (
            <EmptyState title="Ek yok" subtitle="Musteriye ait dosya bulunamadi." />
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
