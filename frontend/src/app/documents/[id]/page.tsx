"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
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
  customer: number;
};

type FileRow = {
  id: number;
  filename: string;
  url: string;
};

export default function DocumentDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [doc, setDoc] = useState<DocumentRow | null>(null);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [d, f] = await Promise.all([
          apiFetch<DocumentRow>(`/api/documents/${id}/`),
          apiFetch<FileRow[]>(`/api/files/?document=${id}`)
        ]);
        setDoc(d);
        setFiles(f);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setError(msg);
      }
    }
    load();
  }, [id]);

  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (!doc) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-ink/10 bg-white/80 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-ink/50">Evrak Detayi</div>
            <h1 className="text-3xl font-semibold">{doc.doc_no}</h1>
            <div className="mt-1 text-sm text-ink/60">{doc.subject || "Konu yok"}</div>
          </div>
          <div className="flex items-center gap-2">
            <Link className="text-sm text-terracotta" href={`/customers/${doc.customer}`}>
              Musteri Karti
            </Link>
            <Button onClick={() => window.print()}>Yazdir</Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-ink/10 bg-white/80 p-6 text-sm">
          <div className="grid gap-3">
            <div><b>Tarih:</b> {doc.received_date || "-"}</div>
            <div><b>Tur:</b> {doc.doc_type}</div>
            <div><b>Harici Sayi:</b> {doc.reference_no || "-"}</div>
            <div><b>Teslim:</b> {doc.delivery_method || "-"}</div>
          </div>
        </div>
        <div className="rounded-2xl border border-ink/10 bg-white/80 p-6 text-sm">
          <div className="grid gap-3">
            <div><b>Gonderen:</b> {doc.sender || "-"}</div>
            <div><b>Alici:</b> {doc.recipient || "-"}</div>
            <div><b>Konu:</b> {doc.subject || "-"}</div>
            <div><b>Aciklama:</b> {doc.description || "-"}</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-ink/10 bg-white/80 p-6">
        <h2 className="text-xl font-semibold">Ekler</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {files.length === 0 ? (
            <div className="rounded-xl border border-ink/10 bg-white p-4 text-sm text-ink/60">
              Bu evraga ait ek yok.
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
