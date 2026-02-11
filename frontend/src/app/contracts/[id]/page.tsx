"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/back-button";
import { formatPhoneDisplay } from "@/lib/format";

type ContractRow = {
  id: number;
  contract_no?: string;
  contract_date?: string;
  contract_type?: string;
  period_start_month?: number;
  period_start_year?: number;
  period_end_month?: number;
  period_end_year?: number;
  filename?: string;
  file_url?: string;
  signed_url?: string;
  customer: number;
};

type Customer = {
  id: number;
  name: string;
  identity_type?: "VKN" | "TCKN";
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

export default function ContractDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [contract, setContract] = useState<ContractRow | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const c = await apiFetch<ContractRow>(`/api/contracts/${id}/`);
        setContract(c);
        const cust = await apiFetch<Customer>(`/api/customers/${c.customer}/`);
        setCustomer(cust);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
        setError(msg);
      }
    }
    load();
  }, [id]);

  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (!contract || !customer) return <div>Yukleniyor...</div>;

  const period =
    contract.period_start_month &&
    contract.period_start_year &&
    contract.period_end_month &&
    contract.period_end_year
      ? `${String(contract.period_start_month).padStart(2, "0")}/${contract.period_start_year}-${String(
          contract.period_end_month
        ).padStart(2, "0")}/${contract.period_end_year}`
      : "-";

  return (
    <div className="space-y-6 print-area">
      <div className="rounded-2xl border border-ink/10 bg-white/80 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-ink/50">Sozlesme Karti</div>
            <h1 className="text-3xl font-semibold">{contract.contract_no || "Sozlesme"}</h1>
            <div className="mt-1 text-sm text-ink/60">{customer.name}</div>
          </div>
          <div className="flex items-center gap-2">
            <BackButton />
            <Link className="text-sm text-terracotta print-hide" href={`/customers/${customer.id}`}>
              Musteri Karti
            </Link>
            <Button className="print-hide" onClick={() => window.print()}>Yazdir</Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-ink/10 bg-white/80 p-6 text-sm">
          <div className="grid gap-3">
            <div><b>Sozlesme Tarihi:</b> {contract.contract_date || "-"}</div>
            <div><b>Sozlesme No:</b> {contract.contract_no || "-"}</div>
            <div><b>Sozlesme Turu:</b> {contract.contract_type || "-"}</div>
            <div><b>Donemi:</b> {period}</div>
          </div>
        </div>
        <div className="rounded-2xl border border-ink/10 bg-white/80 p-6 text-sm">
          <div className="grid gap-3">
            <div><b>Vergi No:</b> {customer.tax_no || "-"}</div>
            <div><b>TCKN:</b> {customer.tckn || "-"}</div>
            <div><b>Vergi Dairesi:</b> {customer.tax_office || "-"}</div>
            <div><b>Yetkili:</b> {customer.contact_person || "-"}</div>
            <div><b>Yetkili Telefon:</b> {formatPhoneDisplay(customer.contact_phone)}</div>
            <div><b>Yetkili E-posta:</b> {customer.contact_email || "-"}</div>
            <div><b>Telefon:</b> {formatPhoneDisplay(customer.phone)}</div>
            <div><b>E-posta:</b> {customer.email || "-"}</div>
            <div><b>Adres:</b> {customer.address || "-"}</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-ink/10 bg-white/80 p-6">
        <h2 className="text-xl font-semibold">Dosya</h2>
        <div className="mt-4">
          {contract.file_url || contract.signed_url ? (
            <a className="text-terracotta" href={contract.signed_url ?? contract.file_url} target="_blank" rel="noreferrer">
              {contract.filename || "Sozlesme dosyasi"}
            </a>
          ) : (
            <div className="text-sm text-ink/60">Dosya bulunamadi.</div>
          )}
        </div>
      </div>
    </div>
  );
}
