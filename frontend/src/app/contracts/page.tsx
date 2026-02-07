"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch, apiUpload } from "@/lib/api";
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
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [taxNo, setTaxNo] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [contractNo, setContractNo] = useState("");
  const [contractDate, setContractDate] = useState("");
  const [contractType, setContractType] = useState("");
  const [periodStartMonth, setPeriodStartMonth] = useState("");
  const [periodStartYear, setPeriodStartYear] = useState("");
  const [periodEndMonth, setPeriodEndMonth] = useState("");
  const [periodEndYear, setPeriodEndYear] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [contracts, custs] = await Promise.all([
        apiFetch<ContractRow[]>("/api/contracts/"),
        apiFetch<Customer[]>("/api/customers/")
      ]);
      setItems(contracts);
      setCustomers(custs);
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
    if (!file) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (taxNo) fd.append("tax_no", taxNo);
      if (customerName) fd.append("customer_name", customerName);
      if (contractNo) fd.append("contract_no", contractNo);
      if (contractDate) fd.append("contract_date", contractDate);
      if (contractType) fd.append("contract_type", contractType);
      if (periodStartMonth) fd.append("period_start_month", periodStartMonth);
      if (periodStartYear) fd.append("period_start_year", periodStartYear);
      if (periodEndMonth) fd.append("period_end_month", periodEndMonth);
      if (periodEndYear) fd.append("period_end_year", periodEndYear);

      await apiUpload("/api/contracts/upload/", fd);
      setFile(null);
      setTaxNo("");
      setCustomerName("");
      setContractNo("");
      setContractDate("");
      setContractType("");
      setPeriodStartMonth("");
      setPeriodStartYear("");
      setPeriodEndMonth("");
      setPeriodEndYear("");
      await load();
      setNotice("Sozlesme yuklendi ve kart olusturuldu.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
      setNotice(`Yuklenemedi: ${msg}`);
    } finally {
      setSaving(false);
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
        <h1 className="text-3xl font-semibold">Sozlesmeler</h1>
        <p className="text-ink/60">Sozlesme listesi ve otomatik kartlar.</p>
      </div>

      <form onSubmit={handleUpload} className="grid gap-3 rounded-lg border border-ink/10 bg-white p-4 md:grid-cols-3">
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <Input placeholder="Vergi no (opsiyonel)" value={taxNo} onChange={(e) => setTaxNo(e.target.value)} />
        <Input placeholder="Musteri adi (opsiyonel)" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
        <Input placeholder="Sozlesme no (opsiyonel)" value={contractNo} onChange={(e) => setContractNo(e.target.value)} />
        <Input type="date" placeholder="Sozlesme tarihi (opsiyonel)" value={contractDate} onChange={(e) => setContractDate(e.target.value)} />
        <Input placeholder="Sozlesme turu (opsiyonel)" value={contractType} onChange={(e) => setContractType(e.target.value)} />
        <div className="flex gap-2">
          <select
            className="h-10 flex-1 rounded-md border border-ink/20 bg-white px-3 text-sm"
            value={periodStartMonth}
            onChange={(e) => setPeriodStartMonth(e.target.value)}
          >
            <option value="">Donem baslangic ay</option>
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
            <option value="">Baslangic yil</option>
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
            <option value="">Donem bitis ay</option>
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
        <Button type="submit" disabled={!token || saving || !file}>
          {saving ? "Yukleniyor..." : "Sozlesme Yukle"}
        </Button>
      </form>
      {notice ? <div className="text-sm text-ink/70">{notice}</div> : null}

      {loading ? <div>Yukleniyor...</div> : null}
      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      {!loading && !error ? (
        <div className="overflow-hidden rounded-lg border border-ink/10 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-haze text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Sozlesme Tarihi</th>
                <th className="px-4 py-3 font-medium">Sozlesme No</th>
                <th className="px-4 py-3 font-medium">Musteri</th>
                <th className="px-4 py-3 font-medium">Donemi</th>
                <th className="px-4 py-3 font-medium">Sozlesme Turu</th>
                <th className="px-4 py-3 font-medium">Kart</th>
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
                      Karti Gor
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}