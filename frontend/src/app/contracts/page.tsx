"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch, apiUpload, me } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

type ContractRow = {
  id: number;
  contract_no?: string;
  contract_date?: string;
  contract_type?: string;
  period_start_month?: number;
  period_start_year?: number;
  period_end_month?: number;
  period_end_year?: number;
  customer: number;
  file_url?: string;
  signed_url?: string;
};

type Customer = {
  id: number;
  name: string;
  tax_no: string;
};

export default function ContractsPage() {
  const [items, setItems] = useState<ContractRow[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadıng, setLoadıng] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [contractNo, setContractNo] = useState("");
  const [contractDate, setContractDate] = useState("");
  const [contractType, setContractType] = useState("");
  const [periodStartMonth, setPeriodStartMonth] = useState("");
  const [periodStartYear, setPeriodStartYear] = useState("");
  const [periodEndMonth, setPeriodEndMonth] = useState("");
  const [periodEndYear, setPeriodEndYear] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isStaff, setIsStaff] = useState(false);

  async function load() {
    setLoadıng(true);
    try {
      const [contracts, custs, meInfo] = await Promise.all([
        apiFetch<ContractRow[]>("/api/contracts/"),
        apiFetch<Customer[]>("/api/customers/"),
        me()
      ]);
      setItems(contracts);
      setCustomers(custs);
      setIsStaff(Boolean(meInfo?.is_staff));
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
      setError(msg);
    } finally {
      setLoadıng(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const token = getAccessToken();

  const years = useMemo(() => {
    const now = new Date().getFullYear();
    const ys: string[] = [];
    for (let y = 2010; y <= now; y += 1) {
      ys.push(String(y));
    }
    return ys;
  }, []);
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));

  const customerMap = useMemo(() => {
    const m = new Map<number, Customer>();
    customers.forEach((c) => m.set(c.id, c));
    return m;
  }, [customers]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    if (!file || !customerId) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("customer", customerId);
      if (contractNo) fd.append("contract_no", contractNo);
      if (contractDate) fd.append("contract_date", contractDate);
      if (contractType) fd.append("contract_type", contractType);
      if (periodStartMonth) fd.append("period_start_month", periodStartMonth);
      if (periodStartYear) fd.append("period_start_year", periodStartYear);
      if (periodEndMonth) fd.append("period_end_month", periodEndMonth);
      if (periodEndYear) fd.append("period_end_year", periodEndYear);

      await apiUpload("/api/contracts/upload/", fd);
      setFile(null);
      setCustomerId("");
      setContractNo("");
      setContractDate("");
      setContractType("");
      setPeriodStartMonth("");
      setPeriodStartYear("");
      setPeriodEndMonth("");
      setPeriodEndYear("");
      await load();
      setNotice("Sözleşme yüklendi ve kart oluşturuldu.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
      setNotice(`Yüklenemedi: ${msg}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Sözleşme silinsin mi?")) return;
    try {
      await apiFetch(`/api/contracts/${id}/`, { method: "DELETE" });
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
      alert(`Silinemedi: ${msg}`);
    }
  }

  function formatPeriod(item: ContractRow) {
    if (item.period_start_month && item.period_start_year && item.period_end_month && item.period_end_year) {
      const s = `${String(item.period_start_month).padStart(2, "0")}/${item.period_start_year}`;
      const e = `${String(item.period_end_month).padStart(2, "0")}/${item.period_end_year}`;
      return `${s}-${e}`;
    }
    return "-";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Sözleşmeler</h1>
        <p className="text-ink/60">Sözleşme listesi ve otomatik kartlar.</p>
      </div>

      <form onSubmit={handleUpload} className="grid gap-3 rounded-lg border border-ink/10 bg-white p-4 md:grid-cols-3">
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
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <Input placeholder="Sözleşme no (zorunlu)" value={contractNo} onChange={(e) => setContractNo(e.target.value)} />
        <Input type="date" placeholder="Sözleşme tarihi" value={contractDate} onChange={(e) => setContractDate(e.target.value)} />
        <Input placeholder="Sözleşme türü (zorunlu)" value={contractType} onChange={(e) => setContractType(e.target.value)} />
        <div className="flex gap-2">
          <select
            className="h-10 flex-1 rounded-md border border-ink/20 bg-white px-3 text-sm"
            value={periodStartMonth}
            onChange={(e) => setPeriodStartMonth(e.target.value)}
          >
            <option value="">Dönem başlangıç ay</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select
            className="h-10 flex-1 rounded-md border border-ink/20 bg-white px-3 text-sm"
            value={periodStartYear}
            onChange={(e) => setPeriodStartYear(e.target.value)}
          >
            <option value="">Başlangıç yil</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <select
            className="h-10 flex-1 rounded-md border border-ink/20 bg-white px-3 text-sm"
            value={periodEndMonth}
            onChange={(e) => setPeriodEndMonth(e.target.value)}
          >
            <option value="">Dönem bitiş ay</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select
            className="h-10 flex-1 rounded-md border border-ink/20 bg-white px-3 text-sm"
            value={periodEndYear}
            onChange={(e) => setPeriodEndYear(e.target.value)}
          >
            <option value="">Bitis yil</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={!token || saving || !file || !customerId || !contractNo.trim() || !contractType.trim()}>
          {saving ? "Yükleniyor..." : "Sözleşme Yükle"}
        </Button>
      </form>
      {notice ? <div className="text-sm text-ink/70">{notice}</div> : null}

      {loadıng ? <div>Yükleniyor...</div> : null}
      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      {!loadıng && !error ? (
        <div className="overflow-hidden rounded-lg border border-ink/10 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-haze text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Sözleşme Tarihi</th>
                <th className="px-4 py-3 font-medium">Sözleşme No</th>
                <th className="px-4 py-3 font-medium">Müşteri</th>
                <th className="px-4 py-3 font-medium">Dönemi</th>
                <th className="px-4 py-3 font-medium">Sözleşme Türü</th>
                <th className="px-4 py-3 font-medium">Kart</th>
                {isStaff ? <th className="px-4 py-3 font-medium">Sil</th> : null}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-ink/10">
                  <td className="px-4 py-3">{item.contract_date || "-"}</td>
                  <td className="px-4 py-3">{item.contract_no || "-"}</td>
                  <td className="px-4 py-3">{customerMap.get(item.customer)?.name || "-"}</td>
                  <td className="px-4 py-3">{formatPeriod(item)}</td>
                  <td className="px-4 py-3">{item.contract_type || "-"}</td>
                  <td className="px-4 py-3">
                    <Link className="text-terracotta" href={`/contracts/${item.id}`}>
                      Kartı Gör
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



