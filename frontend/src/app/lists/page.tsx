"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch, apiUpload, sendTableMail } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Customer = { id: number; name: string; tax_no?: string };
type Contract = {
  id: number;
  customer: number;
  contract_no?: string;
  contract_date?: string;
  contract_type?: string;
  status?: string;
};
type Document = {
  id: number;
  customer: number;
  contract?: number | null;
  doc_no: string;
  doc_type: string;
  status?: string;
  received_date?: string;
  subject?: string;
};
type Report = {
  id: number;
  customer: number;
  contract?: number | null;
  report_no: string;
  report_type: string;
  status?: string;
  received_date?: string;
  subject?: string;
};

type Tab = "documents" | "reports" | "contracts";

function toCsv(columns: string[], rows: string[][]) {
  const esc = (v: string) => `"${(v || "").replace(/"/g, '""')}"`;
  return [columns.map(esc).join(","), ...rows.map((r) => r.map((x) => esc(x || "")).join(","))].join("\n");
}

export default function ListsPage() {
  const [tab, setTab] = useState<Tab>("documents");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [contractFilter, setContractFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [saveCustomerId, setSaveCustomerId] = useState("");
  const [mailTo, setMailTo] = useState("");
  const [mailing, setMailing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const customerMap = useMemo(() => new Map(customers.map((c) => [c.id, c.name])), [customers]);
  const contractMap = useMemo(() => new Map(contracts.map((c) => [c.id, c.contract_no || `Sözleşme #${c.id}`])), [contracts]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [cust, ctrs, docs, reps] = await Promise.all([
          apiFetch<Customer[]>("/api/customers/"),
          apiFetch<Contract[]>("/api/contracts/"),
          apiFetch<Document[]>("/api/documents/"),
          apiFetch<Report[]>("/api/reports/")
        ]);
        setCustomers(cust);
        setContracts(ctrs);
        setDocuments(docs);
        setReports(reps);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Veriler yüklenemedi.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredRows = useMemo(() => {
    const dateOk = (d?: string) => {
      if (!d) return true;
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      return true;
    };
    if (tab === "documents") {
      return documents.filter((x) => {
        if (customerFilter && String(x.customer) !== customerFilter) return false;
        if (contractFilter && String(x.contract || "") !== contractFilter) return false;
        if (statusFilter && (x.status || "") !== statusFilter) return false;
        if (typeFilter && x.doc_type !== typeFilter) return false;
        if (!dateOk(x.received_date)) return false;
        return true;
      });
    }
    if (tab === "reports") {
      return reports.filter((x) => {
        if (customerFilter && String(x.customer) !== customerFilter) return false;
        if (contractFilter && String(x.contract || "") !== contractFilter) return false;
        if (statusFilter && (x.status || "") !== statusFilter) return false;
        if (typeFilter && x.report_type !== typeFilter) return false;
        if (!dateOk(x.received_date)) return false;
        return true;
      });
    }
    return contracts.filter((x) => {
      if (customerFilter && String(x.customer) !== customerFilter) return false;
      if (statusFilter && (x.status || "") !== statusFilter) return false;
      if (typeFilter && (x.contract_type || "") !== typeFilter) return false;
      if (!dateOk(x.contract_date)) return false;
      return true;
    });
  }, [tab, documents, reports, contracts, customerFilter, contractFilter, statusFilter, typeFilter, dateFrom, dateTo]);

  const columns = useMemo(() => {
    if (tab === "documents") return ["No", "Mükellef", "Sözleşme", "Tür", "Durum", "Tarih", "Konu"];
    if (tab === "reports") return ["No", "Mükellef", "Sözleşme", "Tür", "Durum", "Tarih", "Konu"];
    return ["Sözleşme No", "Mükellef", "Tür", "Durum", "Tarih"];
  }, [tab]);

  const tableRows = useMemo(() => {
    if (tab === "documents") {
      return (filteredRows as Document[]).map((x) => [
        x.doc_no,
        customerMap.get(x.customer) || "-",
        x.contract ? contractMap.get(x.contract) || "-" : "-",
        x.doc_type,
        x.status === "DONE" ? "Tamamlandı" : "Açık",
        x.received_date || "-",
        x.subject || "-"
      ]);
    }
    if (tab === "reports") {
      return (filteredRows as Report[]).map((x) => [
        x.report_no,
        customerMap.get(x.customer) || "-",
        x.contract ? contractMap.get(x.contract) || "-" : "-",
        x.report_type,
        x.status === "DONE" ? "Tamamlandı" : "Açık",
        x.received_date || "-",
        x.subject || "-"
      ]);
    }
    return (filteredRows as Contract[]).map((x) => [
      x.contract_no || "-",
      customerMap.get(x.customer) || "-",
      x.contract_type || "-",
      x.status === "DONE" ? "Tamamlandı" : "Açık",
      x.contract_date || "-"
    ]);
  }, [tab, filteredRows, customerMap, contractMap]);

  async function handleSaveToCustomer() {
    if (!saveCustomerId) return;
    const csv = toCsv(columns, tableRows);
    const file = new File([csv], `${tab}_liste_${new Date().toISOString().slice(0, 10)}.csv`, { type: "text/csv" });
    const fd = new FormData();
    fd.append("file", file);
    fd.append("customer", saveCustomerId);
    fd.append("filename", file.name);
    await apiUpload("/api/files/upload/", fd);
    setNotice("Liste dosyası mükellef kartına kaydedildi.");
  }

  async function handleMailList() {
    if (!mailTo.trim()) {
      setNotice("Mail adresi zorunlu.");
      return;
    }
    if (!window.confirm(`Bu listeyi şu alıcılara göndereceksiniz:\n${mailTo}`)) return;
    setMailing(true);
    try {
      const title =
        tab === "documents" ? "Evrak Liste Raporu" : tab === "reports" ? "Rapor Liste Raporu" : "Sözleşme Liste Raporu";
      const res = await sendTableMail({
        to_emails: mailTo,
        title,
        subject: title,
        columns,
        rows: tableRows
      });
      setNotice(`Mail gönderildi: ${(res.sent_to || []).join(", ")}`);
    } catch (err) {
      setNotice(`Mail gönderilemedi: ${err instanceof Error ? err.message : "Hata"}`);
    } finally {
      setMailing(false);
    }
  }

  return (
    <div className="space-y-5 report-print">
      <div>
        <h1 className="text-3xl font-semibold">Liste Raporları</h1>
        <p className="text-ink/60">A4 uyumlu satır bazlı evrak/rapor/sözleşme listeleri.</p>
      </div>

      <div className="flex gap-2 print-hide">
        <Button variant={tab === "documents" ? "default" : "outline"} onClick={() => setTab("documents")}>Evrak</Button>
        <Button variant={tab === "reports" ? "default" : "outline"} onClick={() => setTab("reports")}>Rapor</Button>
        <Button variant={tab === "contracts" ? "default" : "outline"} onClick={() => setTab("contracts")}>Sözleşme</Button>
      </div>

      <div className="grid gap-2 rounded-lg border border-ink/10 bg-white p-4 print-hide md:grid-cols-4">
        <select className="h-10 rounded-md border border-ink/20 bg-white px-3 text-sm" value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)}>
          <option value="">Mükellef (Tümü)</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {tab !== "contracts" ? (
          <select className="h-10 rounded-md border border-ink/20 bg-white px-3 text-sm" value={contractFilter} onChange={(e) => setContractFilter(e.target.value)}>
            <option value="">Sözleşme (Tümü)</option>
            {contracts.map((c) => <option key={c.id} value={c.id}>{c.contract_no || `Sözleşme #${c.id}`}</option>)}
          </select>
        ) : <div />}
        <select className="h-10 rounded-md border border-ink/20 bg-white px-3 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Durum (Tümü)</option>
          <option value="OPEN">Açık</option>
          <option value="DONE">Tamamlandı</option>
        </select>
        <Input placeholder={tab === "contracts" ? "Sözleşme Türü" : "Tür"} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value.toUpperCase())} />
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        <Button variant="outline" onClick={() => { setCustomerFilter(""); setContractFilter(""); setStatusFilter(""); setTypeFilter(""); setDateFrom(""); setDateTo(""); }}>Temizle</Button>
        <Button onClick={() => window.print()}>Yazdır</Button>
      </div>

      {loading ? <div>Yükleniyor...</div> : null}
      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      {!loading && !error ? (
        <div className="overflow-hidden rounded-lg border border-ink/10 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-haze text-left">
              <tr>{columns.map((c) => <th key={c} className="px-3 py-2 font-medium">{c}</th>)}</tr>
            </thead>
            <tbody>
              {tableRows.map((r, i) => (
                <tr key={i} className="border-t border-ink/10">
                  {r.map((v, idx) => <td key={idx} className="px-3 py-2">{v}</td>)}
                </tr>
              ))}
              {tableRows.length === 0 ? (
                <tr><td className="px-3 py-3 text-ink/60" colSpan={columns.length}>Kayıt bulunamadı.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="grid gap-2 rounded-lg border border-ink/10 bg-white p-4 print-hide md:grid-cols-3">
        <select className="h-10 rounded-md border border-ink/20 bg-white px-3 text-sm" value={saveCustomerId} onChange={(e) => setSaveCustomerId(e.target.value)}>
          <option value="">Dosyayı kaydetmek için mükellef seçin</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <Button variant="outline" onClick={handleSaveToCustomer} disabled={!saveCustomerId}>Mükellef Dosyasına Kaydet</Button>
        <div />
        <Input placeholder="Mail alıcıları (virgülle)" value={mailTo} onChange={(e) => setMailTo(e.target.value)} />
        <Button onClick={handleMailList} disabled={mailing}>{mailing ? "Gönderiliyor..." : "Listeyi Mail Gönder"}</Button>
      </div>
      {notice ? <div className="text-sm text-ink/70">{notice}</div> : null}
    </div>
  );
}
