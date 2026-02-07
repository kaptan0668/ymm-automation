"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch, apiUpload, me } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

type ReportRow = {
  id: number;
  report_no: string;
  report_type: string;
  year: number;
  customer: number;
  received_date?: string;
  sender?: string;
  recipient?: string;
  subject?: string;
  reference_no?: string;
  delivery_method?: string;
};

type Customer = {
  id: number;
  name: string;
  tax_no: string;
};

const REPORT_TYPES = ["TT", "KDV", "OAR", "DGR"];
const DELIVERY = [
  { value: "KARGO", label: "Kargo" },
  { value: "EPOSTA", label: "E-posta" },
  { value: "ELDEN", label: "Elden" },
  { value: "EBYS", label: "EBYS" },
  { value: "DIGER", label: "Diðer" }
];

export default function ReportsPage() {
  const [items, setItems] = useState<ReportRow[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [customerId, setCustomerId] = useState("");
  const [reportType, setReportType] = useState("TT");
  const [year, setYear] = useState("2026");
  const [receivedDate, setReceivedDate] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [sender, setSender] = useState("");
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [isStaff, setIsStaff] = useState(false);

  const [filterText, setFilterText] = useState("");
  const [filterCustomer, setFilterCustomer] = useState("");
  const [sortBy, setSortBy] = useState("date_desc");

  async function load() {
    setLoading(true);
    try {
      const [reps, custs, meInfo] = await Promise.all([
        apiFetch<ReportRow[]>("/api/reports/"),
        apiFetch<Customer[]>("/api/customers/"),
        me()
      ]);
      setItems(reps);
      setCustomers(custs);
      setIsStaff(Boolean(meInfo?.is_staff));
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const token = getAccessToken();

  const customerMap = useMemo(() => {
    const m = new Map<number, Customer>();
    customers.forEach((c) => m.set(c.id, c));
    return m;
  }, [customers]);

  const filtered = useMemo(() => {
    let rows = items;
    if (filterCustomer) {
      rows = rows.filter((r) => String(r.customer) === filterCustomer);
    }
    if (filterText) {
      const t = filterText.toLowerCase();
      rows = rows.filter((r) =>
        [r.report_no, r.subject, r.sender, r.recipient].filter(Boolean).join(" ").toLowerCase().includes(t)
      );
    }
    if (sortBy === "date_asc") {
      rows = [...rows].sort((a, b) => (a.received_date || "").localeCompare(b.received_date || ""));
    } else if (sortBy === "date_desc") {
      rows = [...rows].sort((a, b) => (b.received_date || "").localeCompare(a.received_date || ""));
    } else if (sortBy === "customer_asc") {
      rows = [...rows].sort((a, b) => (customerMap.get(a.customer)?.name || "").localeCompare(customerMap.get(b.customer)?.name || ""));
    }
    return rows;
  }, [items, filterCustomer, filterText, sortBy, customerMap]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    setSaving(true);
    try {
      const rep = await apiFetch<ReportRow>("/api/reports/", {
        method: "POST",
        body: JSON.stringify({
          customer: Number(customerId),
          report_type: reportType,
          year: Number(year),
          received_date: receivedDate || null,
          reference_no: referenceNo || null,
          sender: sender || null,
          recipient: recipient || null,
          subject: subject || null,
          description: description || null,
          delivery_method: deliveryMethod || null
        })
      });

      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("report", String(rep.id));
        await apiUpload("/api/files/upload/", fd);
        setFile(null);
      }

      setCustomerId("");
      setReferenceNo("");
      setSender("");
      setRecipient("");
      setSubject("");
      setDescription("");
      setDeliveryMethod("");
      await load();
      setNotice(`Rapor eklendi. Rapor No: ${rep.report_no}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
      setNotice(`Rapor eklenemedi: ${msg}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Rapor silinsin mi?")) return;
    try {
      await apiFetch(`/api/reports/${id}/`, { method: "DELETE" });
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
      alert(`Silinemedi: ${msg}`);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Raporlar</h1>
        <p className="text-ink/60">Rapor uretim ve durum izleme.</p>
      </div>

      <form onSubmit={handleCreate} className="grid gap-3 rounded-lg border border-ink/10 bg-white p-4 md:grid-cols-3">
        <select
          className="h-10 rounded-md border border-ink/20 bg-white px-3 text-sm"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
        >
          <option value="">Musteri sec</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.tax_no})
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border border-ink/20 bg-white px-3 text-sm"
          value={reportType}
          onChange={(e) => setReportType(e.target.value)}
        >
          {REPORT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <Input placeholder="Yil" value={year} onChange={(e) => setYear(e.target.value)} />

        <Input type="date" placeholder="Tarih" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} />
        <Input placeholder="Harici sayi" value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} />
        <Input placeholder="Gonderen" value={sender} onChange={(e) => setSender(e.target.value)} />
        <Input placeholder="Alici" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
        <Input placeholder="Konu" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <select
          className="h-10 rounded-md border border-ink/20 bg-white px-3 text-sm"
          value={deliveryMethod}
          onChange={(e) => setDeliveryMethod(e.target.value)}
        >
          <option value="">Teslim yontemi</option>
          {DELIVERY.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
        <textarea
          className="h-24 rounded-md border border-ink/20 bg-white px-3 py-2 text-sm md:col-span-2"
          placeholder="Aciklama"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />

        <Button type="submit" disabled={!token || saving || !customerId || !year || !receivedDate}>
          {saving ? "Kaydediliyor..." : "Rapor Ekle"}
        </Button>
      </form>
      {notice ? <div className="text-sm text-ink/70">{notice}</div> : null}

      <div className="grid gap-3 rounded-lg border border-ink/10 bg-white p-4 md:grid-cols-3">
        <Input placeholder="Arama" value={filterText} onChange={(e) => setFilterText(e.target.value)} />
        <select
          className="h-10 rounded-md border border-ink/20 bg-white px-3 text-sm"
          value={filterCustomer}
          onChange={(e) => setFilterCustomer(e.target.value)}
        >
          <option value="">Musteri (tum)</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border border-ink/20 bg-white px-3 text-sm"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="date_desc">Tarih (yeni)</option>
          <option value="date_asc">Tarih (eski)</option>
          <option value="customer_asc">Musteri A-Z</option>
        </select>
      </div>

      {loading ? <div>Yukleniyor...</div> : null}
      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      {!loading && !error ? (
        <div className="overflow-hidden rounded-lg border border-ink/10 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-haze text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Tarih</th>
                <th className="px-4 py-3 font-medium">Rapor No</th>
                <th className="px-4 py-3 font-medium">Musteri</th>
                <th className="px-4 py-3 font-medium">Konu</th>
                <th className="px-4 py-3 font-medium">Detay</th>
                {isStaff ? <th className="px-4 py-3 font-medium">Sil</th> : null}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-t border-ink/10">
                  <td className="px-4 py-3">{item.received_date}</td>
                  <td className="px-4 py-3">{item.report_no}</td>
                  <td className="px-4 py-3">{customerMap.get(item.customer)?.name}</td>
                  <td className="px-4 py-3">{item.subject}</td>
                  <td className="px-4 py-3">
                    <Link className="text-terracotta" href={`/reports/${item.id}`}>
                      Ac
                    </Link>
                  </td>
                  {isStaff ? (
                    <td className="px-4 py-3">
                      <button className="text-red-600" onClick={() => handleDelete(item.id)}>Sil</button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
