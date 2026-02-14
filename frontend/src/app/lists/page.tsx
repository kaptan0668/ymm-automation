"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch, apiUpload, sendTableMail } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Customer = {
  id: number;
  name: string;
  tax_no?: string;
  identity_type?: string;
  tckn?: string;
  phone?: string;
  email?: string;
  contact_person?: string;
  contact_email?: string;
};

type Contract = {
  id: number;
  customer: number;
  contract_no?: string;
  contract_date?: string;
  contract_type?: string;
  status?: "OPEN" | "DONE";
};

type Document = {
  id: number;
  customer: number;
  contract?: number | null;
  doc_no: string;
  doc_type: "GLE" | "GDE" | "KIT" | "DGR";
  status?: "OPEN" | "DONE";
  received_date?: string;
  subject?: string;
};

type Report = {
  id: number;
  customer: number;
  contract?: number | null;
  report_no: string;
  report_type: "TT" | "KDV" | "OAR" | "DGR";
  status?: "OPEN" | "DONE";
  received_date?: string;
  subject?: string;
};

type Tab = "customers" | "documents" | "reports" | "contracts";

function toCsv(columns: string[], rows: string[][]) {
  const esc = (v: string) => `"${(v || "").replace(/"/g, '""')}"`;
  return [columns.map(esc).join(","), ...rows.map((r) => r.map((x) => esc(x || "")).join(","))].join("\n");
}

export default function ListsPage() {
  const [tab, setTab] = useState<Tab>("customers");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [saveCustomerId, setSaveCustomerId] = useState("");
  const [mailTo, setMailTo] = useState("");
  const [mailing, setMailing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const customerMap = useMemo(() => new Map(customers.map((c) => [c.id, c.name])), [customers]);
  const contractMap = useMemo(
    () => new Map(contracts.map((c) => [c.id, c.contract_no || `Sozlesme #${c.id}`])),
    [contracts]
  );

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
        setError(err instanceof Error ? err.message : "Veriler yuklenemedi.");
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
    const q = search.trim().toLowerCase();

    if (tab === "customers") {
      return customers.filter((x) => {
        if (!q) return true;
        return (
          (x.name || "").toLowerCase().includes(q) ||
          (x.tax_no || "").toLowerCase().includes(q) ||
          (x.tckn || "").toLowerCase().includes(q) ||
          (x.email || "").toLowerCase().includes(q)
        );
      });
    }

    if (tab === "documents") {
      return documents.filter((x) => {
        if (customerFilter && String(x.customer) !== customerFilter) return false;
        if (statusFilter && (x.status || "") !== statusFilter) return false;
        if (typeFilter && x.doc_type !== typeFilter) return false;
        if (!dateOk(x.received_date)) return false;
        if (q && !(x.doc_no || "").toLowerCase().includes(q) && !(x.subject || "").toLowerCase().includes(q)) return false;
        return true;
      });
    }

    if (tab === "reports") {
      return reports.filter((x) => {
        if (customerFilter && String(x.customer) !== customerFilter) return false;
        if (statusFilter && (x.status || "") !== statusFilter) return false;
        if (typeFilter && x.report_type !== typeFilter) return false;
        if (!dateOk(x.received_date)) return false;
        if (q && !(x.report_no || "").toLowerCase().includes(q) && !(x.subject || "").toLowerCase().includes(q)) return false;
        return true;
      });
    }

    return contracts.filter((x) => {
      if (customerFilter && String(x.customer) !== customerFilter) return false;
      if (statusFilter && (x.status || "") !== statusFilter) return false;
      if (typeFilter && (x.contract_type || "") !== typeFilter) return false;
      if (!dateOk(x.contract_date)) return false;
      if (q && !(x.contract_no || "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tab, customers, documents, reports, contracts, customerFilter, statusFilter, typeFilter, dateFrom, dateTo, search]);

  const columns = useMemo(() => {
    if (tab === "customers") return ["Mukellef", "Kimlik", "Telefon", "E-posta", "Yetkili", "Yetkili E-posta"];
    if (tab === "documents") return ["No", "Mukellef", "Sozlesme", "Evrak Turu", "Durum", "Tarih", "Konu"];
    if (tab === "reports") return ["No", "Mukellef", "Sozlesme", "Rapor Turu", "Durum", "Tarih", "Konu"];
    return ["Sozlesme No", "Mukellef", "Sozlesme Turu", "Durum", "Tarih"];
  }, [tab]);

  const tableRows = useMemo(() => {
    if (tab === "customers") {
      return (filteredRows as Customer[]).map((x) => [
        x.name || "-",
        x.identity_type === "TCKN" ? x.tckn || "-" : x.tax_no || "-",
        x.phone || "-",
        x.email || "-",
        x.contact_person || "-",
        x.contact_email || "-"
      ]);
    }
    if (tab === "documents") {
      return (filteredRows as Document[]).map((x) => [
        x.doc_no,
        customerMap.get(x.customer) || "-",
        x.contract ? contractMap.get(x.contract) || "-" : "-",
        x.doc_type,
        x.status === "DONE" ? "Tamamlandi" : "Acik",
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
        x.status === "DONE" ? "Tamamlandi" : "Acik",
        x.received_date || "-",
        x.subject || "-"
      ]);
    }
    return (filteredRows as Contract[]).map((x) => [
      x.contract_no || "-",
      customerMap.get(x.customer) || "-",
      x.contract_type || "-",
      x.status === "DONE" ? "Tamamlandi" : "Acik",
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
    setNotice("Liste dosyasi mukellef kartina kaydedildi.");
  }

  async function handleMailList() {
    if (!mailTo.trim()) {
      setNotice("Mail adresi zorunlu.");
      return;
    }
    if (!window.confirm(`Bu listeyi su alicilara gondereceksiniz:\n${mailTo}`)) return;
    setMailing(true);
    try {
      const title =
        tab === "customers"
          ? "Mukellef Liste Raporu"
          : tab === "documents"
          ? "Evrak Liste Raporu"
          : tab === "reports"
          ? "Rapor Liste Raporu"
          : "Sozlesme Liste Raporu";
      const res = await sendTableMail({
        to_emails: mailTo,
        title,
        subject: title,
        columns,
        rows: tableRows
      });
      setNotice(`Mail gonderildi: ${(res.sent_to || []).join(", ")}`);
    } catch (err) {
      setNotice(`Mail gonderilemedi: ${err instanceof Error ? err.message : "Hata"}`);
    } finally {
      setMailing(false);
    }
  }

  function printOrPdf() {
    window.print();
  }

  return (
    <div className="space-y-5 report-print">
      <div>
        <h1 className="text-3xl font-semibold">Liste Raporlari</h1>
        <p className="text-ink/60">A4 uyumlu satir bazli listeler. PDF icin Yazdir/Save as PDF kullanin.</p>
      </div>

      <div className="flex gap-2 print-hide">
        <Button variant={tab === "customers" ? "default" : "outline"} onClick={() => setTab("customers")}>Mukellef</Button>
        <Button variant={tab === "documents" ? "default" : "outline"} onClick={() => setTab("documents")}>Evrak</Button>
        <Button variant={tab === "reports" ? "default" : "outline"} onClick={() => setTab("reports")}>Rapor</Button>
        <Button variant={tab === "contracts" ? "default" : "outline"} onClick={() => setTab("contracts")}>Sozlesme</Button>
      </div>

      <div className="grid gap-2 rounded-lg border border-ink/10 bg-white p-4 print-hide md:grid-cols-4">
        <Input placeholder="Ara (no, konu, ad, vergi no)" value={search} onChange={(e) => setSearch(e.target.value)} />
        {tab !== "customers" ? (
          <select className="h-10 rounded-md border border-ink/20 bg-white px-3 text-sm" value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)}>
            <option value="">Mukellef (Tumu)</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        ) : (
          <div />
        )}
        {tab !== "customers" ? (
          <select className="h-10 rounded-md border border-ink/20 bg-white px-3 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Durum (Tumu)</option>
            <option value="OPEN">Acik</option>
            <option value="DONE">Tamamlandi</option>
          </select>
        ) : (
          <div />
        )}
        {tab === "documents" ? (
          <select className="h-10 rounded-md border border-ink/20 bg-white px-3 text-sm" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">Evrak Turu (Tumu)</option>
            <option value="GLE">GLE</option>
            <option value="GDE">GDE</option>
            <option value="KIT">KIT</option>
            <option value="DGR">DGR</option>
          </select>
        ) : tab === "reports" ? (
          <select className="h-10 rounded-md border border-ink/20 bg-white px-3 text-sm" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">Rapor Turu (Tumu)</option>
            <option value="TT">TT</option>
            <option value="KDV">KDV</option>
            <option value="OAR">OAR</option>
            <option value="DGR">DGR</option>
          </select>
        ) : tab === "contracts" ? (
          <Input placeholder="Sozlesme Turu" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} />
        ) : (
          <div />
        )}
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        <Button
          variant="outline"
          onClick={() => {
            setSearch("");
            setCustomerFilter("");
            setStatusFilter("");
            setTypeFilter("");
            setDateFrom("");
            setDateTo("");
          }}
        >
          Temizle
        </Button>
        <div className="flex gap-2">
          <Button onClick={printOrPdf}>Yazdir</Button>
          <Button variant="outline" onClick={printOrPdf}>PDF</Button>
        </div>
      </div>

      {loading ? <div>Yukleniyor...</div> : null}
      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      {!loading && !error ? (
        <div className="overflow-hidden rounded-lg border border-ink/10 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-haze text-left">
              <tr>
                {columns.map((c) => (
                  <th key={c} className="px-3 py-2 font-medium">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r, i) => (
                <tr key={i} className="border-t border-ink/10">
                  {r.map((v, idx) => (
                    <td key={idx} className="px-3 py-2">
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
              {tableRows.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-ink/60" colSpan={columns.length}>
                    Kayit bulunamadi.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="grid gap-2 rounded-lg border border-ink/10 bg-white p-4 print-hide md:grid-cols-3">
        <select className="h-10 rounded-md border border-ink/20 bg-white px-3 text-sm" value={saveCustomerId} onChange={(e) => setSaveCustomerId(e.target.value)}>
          <option value="">Dosyayi kaydetmek icin mukellef secin</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <Button variant="outline" onClick={handleSaveToCustomer} disabled={!saveCustomerId}>
          Mukellef Dosyasina Kaydet
        </Button>
        <div />
        <Input placeholder="Mail alicilari (virgulle)" value={mailTo} onChange={(e) => setMailTo(e.target.value)} />
        <Button onClick={handleMailList} disabled={mailing}>
          {mailing ? "Gonderiliyor..." : "Listeyi Mail Gonder"}
        </Button>
      </div>

      {notice ? <div className="text-sm text-ink/70">{notice}</div> : null}
    </div>
  );
}
