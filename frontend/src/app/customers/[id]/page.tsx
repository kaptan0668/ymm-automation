"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";

type Customer = {
  id: number;
  name: string;
  tax_no: string;
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

export default function CustomerCardPage() {
  const params = useParams();
  const id = params?.id as string;
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [error, setError] = useState<string | null>(null);

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
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
        setError(msg);
      }
    }
    load();
  }, [id]);

  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (!customer) return <div>Yükleniyor...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Müþteri Kartý</h1>
          <p className="text-ink/60">{customer.name} • {customer.tax_no}</p>
        </div>
        <Button onClick={() => window.print()}>Yazdýr</Button>
      </div>

      <div>
        <h2 className="text-xl font-semibold">Evraklar</h2>
        <ul className="list-disc pl-5 text-sm">
          {docs.map((d) => (
            <li key={d.id}>
              {d.received_date} • {d.doc_no} • {d.subject}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-xl font-semibold">Raporlar</h2>
        <ul className="list-disc pl-5 text-sm">
          {reports.map((r) => (
            <li key={r.id}>
              {r.received_date} • {r.report_no} • {r.subject}
            </li>
          ))}
        </ul>
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
