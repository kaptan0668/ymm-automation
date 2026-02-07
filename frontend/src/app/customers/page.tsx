"use client";

import { useEffect, useState } from "react";
import { apiFetch, apiUpload, me } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

type Customer = {
  id: number;
  name: string;
  tax_no: string;
  tax_office?: string;
  address?: string;
  phone?: string;
  email?: string;
  contact_person?: string;
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
  const [taxOffice, setTaxOffice] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [isStaff, setIsStaff] = useState(false);

  async function load() {
    try {
      const [data, meInfo] = await Promise.all([
        apiFetch<Customer[]>("/api/customers/"),
        me()
      ]);
      setItems(data);
      setIsStaff(Boolean(meInfo?.is_staff));
      setError(null);
    } catch (err) {
      setError("Veriler yÃ¼klenemedi. GiriÅŸ yapmanÄ±z gerekebilir.");
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
        body: JSON.stringify({
          name,
          tax_no: taxNo,
          tax_office: taxOffice || null,
          address: address || null,
          phone: phone || null,
          email: email || null,
          contact_person: contactPerson || null
        })
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
      setTaxOffice("");
      setAddress("");
      setPhone("");
      setEmail("");
      setContactPerson("");
      await load();
      setNotice("MÃ¼ÅŸteri eklendi.");
    } catch {
      setNotice("MÃ¼ÅŸteri eklenemedi.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("MÃ¼ÅŸteri silinsin mi?")) return;
    try {
      await apiFetch(`/api/customers/${id}/`, { method: "DELETE" });
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
      alert(`Silinemedi: ${msg}`);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">MÃ¼ÅŸteriler</h1>
        <p className="text-ink/60">MÃ¼ÅŸteri listesi ve kartlar.</p>
      </div>

      <form onSubmit={handleCreate} className="grid gap-3 rounded-lg border border-ink/10 bg-white p-4 md:grid-cols-3">
        <Input placeholder="MÃ¼ÅŸteri adÄ±" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Vergi no" value={taxNo} onChange={(e) => setTaxNo(e.target.value)} />
        <Input placeholder="Vergi dairesi" value={taxOffice} onChange={(e) => setTaxOffice(e.target.value)} />
        <Input placeholder="Adres" value={address} onChange={(e) => setAddress(e.target.value)} />
        <Input placeholder="Telefon" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input placeholder="E-posta" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input placeholder="Yetkili kiÅŸi" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
        <Input type="file" onChange={(e) => setContractFile(e.target.files?.[0] || null)} />
        <Button type="submit" disabled={!token || saving || !name || !taxNo}>
          {saving ? "Kaydediliyor..." : "MÃ¼ÅŸteri Ekle"}
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
                <th className="px-4 py-3 font-medium">MÃ¼ÅŸteri</th>
                <th className="px-4 py-3 font-medium">Vergi No</th>
                <th className="px-4 py-3 font-medium">Kart</th>
                <th className="px-4 py-3 font-medium">DÃ¼zenle</th>
                {isStaff ? <th className="px-4 py-3 font-medium">Sil</th> : null}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-ink/10">
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3">{item.tax_no}</td>
                  <td className="px-4 py-3">
                    <Link className="text-terracotta" href={`/customers/${item.id}`}>
                      KartÄ± GÃ¶r
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link className="text-terracotta" href={`/customers/${item.id}?edit=1`}>
                      DÃ¼zenle
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