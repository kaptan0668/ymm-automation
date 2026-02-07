"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Document Detail</h1>
          <p className="text-ink/60">{doc.doc_no}</p>
        </div>
        <Button onClick={() => window.print()}>Print</Button>
      </div>

      <div className="grid gap-3 rounded-lg border border-ink/10 bg-white p-4 text-sm">
        <div><b>Date:</b> {doc.received_date}</div>
        <div><b>Type:</b> {doc.doc_type}</div>
        <div><b>Ref No:</b> {doc.reference_no}</div>
        <div><b>Sender:</b> {doc.sender}</div>
        <div><b>Recipient:</b> {doc.recipient}</div>
        <div><b>Subject:</b> {doc.subject}</div>
        <div><b>Delivery:</b> {doc.delivery_method}</div>
        <div><b>Description:</b> {doc.description}</div>
      </div>

      <div>
        <h2 className="text-xl font-semibold">Attachments</h2>
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
