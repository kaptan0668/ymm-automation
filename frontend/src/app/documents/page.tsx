"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type DocumentRow = {
  id: number;
  doc_no: string;
  doc_type: string;
  year: number;
  customer: number;
  direction?: string;
  sender?: string;
  recipient?: string;
  subject?: string;
  reference_no?: string;
  received_date?: string;
  delivery_method?: string;
};

type Customer = {
  id: number;
  name: string;
  tax_no: string;
};

const DOC_TYPES = ["GLE", "GDE", "KIT", "DGR"];
const DIRECTIONS = [
  { value: "GELEN", label: "Gelen" },
  { value: "GIDEN", label: "Giden" },
  { value: "DAHILI", label: "Dahili" }
];
const DELIVERY = [
  { value: "KARGO", label: "Kargo" },
  { value: "EPOSTA", label: "E-posta" },
  { value: "ELDEN", label: "Elden" },
  { value: "EBYS", label: "EBYS" },
  { value: "DIGER", label: "Diğer" }
];

export default function DocumentsPage() {
  const [items, setItems] = useState<DocumentRow[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [customerId, setCustomerId] = useState("");
  const [docType, setDocType] = useState("GLE");
  const [year, setYear] = useState("2026");
  const [direction, setDirection] = useState("GELEN");
  const [receivedDate, setReceivedDate] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [sender, setSender] = useState("");
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    try {
      const [docs, custs] = await Promise.all([
        apiFetch<DocumentRow[]>("/api/documents/"),
        apiFetch<Customer[]>("/api/customers/")
      ]);
      setItems(docs);
      setCustomers(custs);
      setError(null);
    } catch {
      setError("Veriler yüklenemedi. Giriş yapmanız gerekebilir.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const token = getAccessToken();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    setSaving(true);
    try {
      await apiFetch<DocumentRow>("/api/documents/", {
        method: "POST",
        body: JSON.stringify({
          customer: Number(customerId),
          doc_type: docType,
          year: Number(year),
          direction,
          received_date: receivedDate || null,
          reference_no: referenceNo || null,
          sender: sender || null,
          recipient: recipient || null,
          subject: subject || null,
          description: description || null,
          delivery_method: deliveryMethod || null
        })
      });
      setCustomerId("");
      setReferenceNo("");
      setSender("");
      setRecipient("");
      setSubject("");
      setDescription("");
      setDeliveryMethod("");
      await load();
      setNotice("Evrak eklendi.");
    } catch {
      setNotice("Evrak eklenemedi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Evraklar</h1>
        <p className="text-ink/60">Gelen/giden evrak kayıtları.</p>
      </div>

      <form onSubmit={handleCreate} className="grid gap-3 rounded-lg border border-ink/10 bg-white p-4 md:grid-cols-3">
        <select
          className="h-10 rounded-md border border-ink/20 bg-white px-3 text-sm"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
        >
          <option value="">Müşteri seç</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.tax_no})
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border border-ink/20 bg-white px-3 text-sm"
          value={docType}
          onChange={(e) => setDocType(e.target.value)}
        >
          {DOC_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <Input placeholder="Yıl" value={year} onChange={(e) => setYear(e.target.value)} />

        <select
          className="h-10 rounded-md border border-ink/20 bg-white px-3 text-sm"
          value={direction}
          onChange={(e) => setDirection(e.target.value)}
        >
          {DIRECTIONS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
        <Input type="date" placeholder="Tarih" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} />
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
          {DELIVERY.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
        <textarea
          className="h-24 rounded-md border border-ink/20 bg-white px-3 py-2 text-sm md:col-span-2"
          placeholder="Açıklama"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <Button type="submit" disabled={!token || saving || !customerId || !year}>
          {saving ? "Kaydediliyor..." : "Evrak Ekle"}
        </Button>
      </form>
      {notice ? <div className="text-sm text-ink/70">{notice}</div> : null}

      {loading ? <div>Yükleniyor...</div> : null}
      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      {!loading && !error ? (
        <div className="overflow-hidden rounded-lg border border-ink/10 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-haze text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Evrak No</th>
                <th className="px-4 py-3 font-medium">Yön</th>
                <th className="px-4 py-3 font-medium">Tür</th>
                <th className="px-4 py-3 font-medium">Konu</th>
                <th className="px-4 py-3 font-medium">Gönderen</th>
                <th className="px-4 py-3 font-medium">Alıcı</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-ink/10">
                  <td className="px-4 py-3">{item.doc_no}</td>
                  <td className="px-4 py-3">{item.direction}</td>
                  <td className="px-4 py-3">{item.doc_type}</td>
                  <td className="px-4 py-3">{item.subject}</td>
                  <td className="px-4 py-3">{item.sender}</td>
                  <td className="px-4 py-3">{item.recipient}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
