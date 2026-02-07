"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch, apiUpload } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
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
      await apiUpload("/api/contracts/upload/", fd);
      setFile(null);
      await load();
      setNotice("SÃ¶zleÅŸme yÃ¼klendi ve kart oluÅŸturuldu.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
      setNotice(`YÃ¼klenemedi: ${msg}`);
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
        <h1 className="text-3xl font-semibold">SÃ¶zleÅŸmeler</h1>
        <p className="text-ink/60">SÃ¶zleÅŸme listesi ve otomatik kartlar.</p>
      </div>

      <form onSubmit={handleUpload} className="flex flex-wrap items-center gap-3 rounded-lg border border-ink/10 bg-white p-4">
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <Button type="submit" disabled={!token || saving || !file}>
          {saving ? "YÃ¼kleniyor..." : "SÃ¶zleÅŸme YÃ¼kle"}
        </Button>
      </form>
      {notice ? <div className="text-sm text-ink/70">{notice}</div> : null}

      {loading ? <div>YÃ¼kleniyor...</div> : null}
      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      {!loading && !error ? (
        <div className="overflow-hidden rounded-lg border border-ink/10 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-haze text-left">
              <tr>
                <th className="px-4 py-3 font-medium">SÃ¶zleÅŸme Tarihi</th>
                <th className="px-4 py-3 font-medium">SÃ¶zleÅŸme No</th>
                <th className="px-4 py-3 font-medium">MÃ¼ÅŸteri</th>
                <th className="px-4 py-3 font-medium">DÃ¶nemi</th>
                <th className="px-4 py-3 font-medium">SÃ¶zleÅŸme TÃ¼rÃ¼</th>
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
                      KartÄ± GÃ¶r
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

