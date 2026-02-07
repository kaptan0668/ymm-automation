"use client";

import { useEffect, useState } from "react";
import { apiFetch, apiUpload } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

type Customer = {
  id: number;
  name: string;
  tax_no: string;
};

type FileRow = {
  id: number;
  filename: string;
  url: string;
};

export default function CustomersPage() {
  const [items, setItems] = useState<Customer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [taxNo, setTaxNo] = useState("");
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    try {
      const data = await apiFetch<Customer[]>("/api/customers/");
      setItems(data);
      setError(null);
    } catch (err) {
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
      const customer = await apiFetch<Customer>("/api/customers/", {
        method: "POST",
        body: JSON.stringify({ name, tax_no: taxNo })
      });

      if (contractFile) {
        const fd = new FormData();
        fd.append("file", contractFile);
        fd.append("customer", String(customer.id));
        await apiUpload("/api/files/upload/", fd);
        setContractFile(null);
      }

      setName("");
      setTaxNo("");
      await load();
      setNotice("Müşteri eklendi.");
    } catch {
      setNotice("Müşteri eklenemedi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Müşteriler</h1>
        <p className="text-ink/60">Müşteri listesi ve kartlar.</p>
      </div>

      <form onSubmit={handleCreate} className="grid gap-3 rounded-lg border border-ink/10 bg-white p-4 md:grid-cols-3">
        <Input placeholder="Müşteri adı" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Vergi no" value={taxNo} onChange={(e) => setTaxNo(e.target.value)} />
        <Input type="file" onChange={(e) => setContractFile(e.target.files?.[0] || null)} />
        <Button type="submit" disabled={!token || saving || !name || !taxNo}>
          {saving ? "Kaydediliyor..." : "Müşteri Ekle"}
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
                <th className="px-4 py-3 font-medium">Müşteri</th>
                <th className="px-4 py-3 font-medium">Vergi No</th>
                <th className="px-4 py-3 font-medium">Kart</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-ink/10">
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3">{item.tax_no}</td>
                  <td className="px-4 py-3">
                    <Link className="text-terracotta" href={`/customers/${item.id}`}>
                      Kartı Gör
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
