"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";

type ReportRow = {
  id: number;
  report_no: string;
  report_type: string;
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

export default function ReportDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [rep, setRep] = useState<ReportRow | null>(null);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [r, f] = await Promise.all([
          apiFetch<ReportRow>(`/api/reports/${id}/`),
          apiFetch<FileRow[]>(`/api/files/?report=${id}`)
        ]);
        setRep(r);
        setFiles(f);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
        setError(msg);
      }
    }
    load();
  }, [id]);

  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (!rep) return <div>Yukleniyor...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Rapor Detayi</h1>
          <p className="text-ink/60">{rep.report_no}</p>
        </div>
        <Button onClick={() => window.print()}>Yazdir</Button>
      </div>

      <div className="grid gap-3 rounded-lg border border-ink/10 bg-white p-4 text-sm">
        <div><b>Tarih:</b> {rep.received_date}</div>
        <div><b>Tur:</b> {rep.report_type}</div>
        <div><b>Harici Sayi:</b> {rep.reference_no}</div>
        <div><b>Gonderen:</b> {rep.sender}</div>
        <div><b>Alici:</b> {rep.recipient}</div>
        <div><b>Konu:</b> {rep.subject}</div>
        <div><b>Teslim:</b> {rep.delivery_method}</div>
        <div><b>Aciklama:</b> {rep.description}</div>
      </div>

      <div>
        <h2 className="text-xl font-semibold">Ekler</h2>
        <ul className="list-disc pl-5 text-sm">
          {files.map((f) => (
            <li key={f.id}>
              <a className="text-terracotta" href={f.url} target="_blank" rel="noreferrer">
                {f.filename}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
