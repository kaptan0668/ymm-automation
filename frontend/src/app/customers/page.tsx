"use client";

import { useEffect, useState } from "react";
import { apiFetch, apiUpload, me } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { formatPhoneInput, normalizePhoneForApi, onlyDigits } from "@/lib/format";

type Customer = {
  id: number;
  name: string;
  identity_type: "VKN" | "TCKN";
  tax_no?: string;
  tckn?: string;
  tax_office?: string;
  address?: string;
  phone?: string;
  email?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
};

type FileRow = {
  id: number;
  filename: string;
  url: string;
};

function FilePicker({
  label,
  onChange
}: {
  label: string;
  onChange: (file: File | null) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-lg border border-dashed border-ink/20 bg-white px-3 py-2 text-sm text-ink/70 hover:bg-haze">
      <span>{label}</span>
      <span className="text-xs text-terracotta">Seç</span>
      <input
        type="file"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />
    </label>
  );
}

export default function CustomersPage() {
  const [items, setItems] = useState<Customer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadıng, setLoadıng] = useState(true);
  const [name, setName] = useState("");
  const [identityType, setIdentityType] = useState<"VKN" | "TCKN">("VKN");
  const [taxNo, setTaxNo] = useState("");
  const [tckn, setTckn] = useState("");
  const [taxOffice, setTaxOffice] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
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
      setError("Veriler yüklenemedi. Giriş yapmanız gerekebilir.");
    } finally {
      setLoadıng(false);
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
          identity_type: identityType,
          tax_no: identityType === "VKN" ? onlyDigits(taxNo).slice(0, 10) : null,
          tckn: identityType === "TCKN" ? onlyDigits(tckn).slice(0, 11) : null,
          tax_office: taxOffice || null,
          address: address || null,
          phone: normalizePhoneForApi(phone) || null,
          email: email || null,
          contact_person: contactPerson || null,
          contact_phone: normalizePhoneForApi(contactPhone) || null,
          contact_email: contactEmail || null
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
      setIdentityType("VKN");
      setTaxNo("");
      setTckn("");
      setTaxOffice("");
      setAddress("");
      setPhone("");
      setEmail("");
      setContactPerson("");
      setContactPhone("");
      setContactEmail("");
      await load();
      setNotice("Mükellef eklendi.");
    } catch {
      setNotice("Mükellef eklenemedi.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Mükellef silinsin mi?")) return;
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
        <h1 className="text-3xl font-semibold">Mükellefler</h1>
        <p className="text-ink/60">Mükellef listesi ve kartlar.</p>
      </div>

      <form onSubmit={handleCreate} className="grid gap-3 rounded-lg border border-ink/10 bg-white p-4 md:grid-cols-3">
        <Input placeholder="Mükellef adı" value={name} onChange={(e) => setName(e.target.value)} />
        <select
          className="h-10 rounded-md border border-ink/20 bg-white px-3 text-sm"
          value={identityType}
          onChange={(e) => setIdentityType(e.target.value as "VKN" | "TCKN")}
        >
          <option value="VKN">Vergi No</option>
          <option value="TCKN">TCKN</option>
        </select>
        {identityType === "VKN" ? (
          <Input
            placeholder="Vergi no (10)"
            value={taxNo}
            maxLength={10}
            inputMode="numeric"
            onChange={(e) => setTaxNo(onlyDigits(e.target.value).slice(0, 10))}
          />
        ) : (
          <Input
            placeholder="TCKN (11)"
            value={tckn}
            maxLength={11}
            inputMode="numeric"
            onChange={(e) => setTckn(onlyDigits(e.target.value).slice(0, 11))}
          />
        )}
        <Input placeholder="Vergi dairesi" value={taxOffice} onChange={(e) => setTaxOffice(e.target.value)} />
        <Input placeholder="Adres" value={address} onChange={(e) => setAddress(e.target.value)} />
        <Input placeholder="Telefon" value={phone} onChange={(e) => setPhone(formatPhoneInput(e.target.value))} />
        <Input placeholder="E-posta" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input placeholder="Yetkili kisi" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
        <Input placeholder="Yetkili telefon" value={contactPhone} onChange={(e) => setContactPhone(formatPhoneInput(e.target.value))} />
        <Input placeholder="Yetkili e-posta" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
        <FilePicker label="Sözleşme dosyası (opsiyonel)" onChange={setContractFile} />
        <Button
          type="submit"
          disabled={
            !token ||
            saving ||
            !name ||
            (identityType === "VKN" ? onlyDigits(taxNo).length !== 10 : onlyDigits(tckn).length !== 11)
          }
        >
          {saving ? "Kaydediliyor..." : "Mükellef Ekle"}
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
                <th className="px-4 py-3 font-medium">Mükellef</th>
                <th className="px-4 py-3 font-medium">Kimlik</th>
                <th className="px-4 py-3 font-medium">Kart</th>
                <th className="px-4 py-3 font-medium">Düzenle</th>
                {isStaff ? <th className="px-4 py-3 font-medium">Sil</th> : null}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-ink/10">
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3">
                    {item.identity_type === "TCKN" ? `TCKN: ${item.tckn || "-"}` : `VKN: ${item.tax_no || "-"}`}
                  </td>
                  <td className="px-4 py-3">
                    <Link className="text-terracotta" href={`/customers/${item.id}`}>
                      Kartı Gör
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link className="text-terracotta" href={`/customers/${item.id}?edit=1`}>
                      Düzenle
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




