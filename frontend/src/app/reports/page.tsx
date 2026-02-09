"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch, apiUpload, me, getSettings } from "@/lib/api";
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
  status?: string;
  received_date?: string;
  recipient?: string;
  subject?: string;
  period_start_month?: number;
  period_start_year?: number;
  period_end_month?: number;
  period_end_year?: number;
  delivery_method?: string;
  delivery_kargo_name?: string;
  delivery_kargo_tracking?: string;
  delivery_elden_name?: string;
  delivery_elden_date?: string;
  delivery_email?: string;
  delivery_ebys_id?: string;
  delivery_ebys_date?: string;
  delivery_other_desc?: string;
};

type Customer = {
  id: number;
  name: string;
  tax_no: string;
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

const REPORT_TYPES = ["TT", "KDV", "OAR", "DGR"];
const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const DELIVERY = [
  { value: "KARGO", label: "Kargo" },
  { value: "EPOSTA", label: "E-posta" },
  { value: "ELDEN", label: "Elden" },
  { value: "EBYS", label: "EBYS" },
  { value: "DIGER", label: "Diğer" }
];

export default function ReportsPage() {
  const [items, setItems] = useState<ReportRow[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [customerId, setCustomerId] = useState("");
  const [reportType, setReportType] = useState("TT");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [workingYear, setWorkingYear] = useState<number | null>(null);
  const [receivedDate, setReceivedDate] = useState("");
  const [periodStartMonth, setPeriodStartMonth] = useState("");
  const [periodStartYear, setPeriodStartYear] = useState(String(new Date().getFullYear()));
  const [periodEndMonth, setPeriodEndMonth] = useState("");
  const [periodEndYear, setPeriodEndYear] = useState(String(new Date().getFullYear()));
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("");
  const [deliveryKargoName, setDeliveryKargoName] = useState("");
  const [deliveryKargoTracking, setDeliveryKargoTracking] = useState("");
  const [deliveryEldenName, setDeliveryEldenName] = useState("");
  const [deliveryEldenDate, setDeliveryEldenDate] = useState("");
  const [deliveryEmail, setDeliveryEmail] = useState("");
  const [deliveryEbysId, setDeliveryEbysId] = useState("");
  const [deliveryEbysDate, setDeliveryEbysDate] = useState("");
  const [deliveryOtherDesc, setDeliveryOtherDesc] = useState("");
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [file3, setFile3] = useState<File | null>(null);
  const [manualReportNo, setManualReportNo] = useState("");
  const [manualTypeCumulative, setManualTypeCumulative] = useState("");
  const [manualYearSerialAll, setManualYearSerialAll] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [isStaff, setIsStaff] = useState(false);

  const [filterText, setFilterText] = useState("");
  const [filterCustomer, setFilterCustomer] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortBy, setSortBy] = useState("date_desc");

  async function load() {
    setLoading(true);
    try {
      const [reps, custs, meInfo, settings] = await Promise.all([
        apiFetch<ReportRow[]>("/api/reports/"),
        apiFetch<Customer[]>("/api/customers/"),
        me(),
        getSettings().catch(() => null)
      ]);
      setItems(reps);
      setCustomers(custs);
      setIsStaff(Boolean(meInfo?.is_staff));
      if (settings) {
        const y = String(settings.working_year);
        setWorkingYear(settings.working_year);
        setYear(y);
        setPeriodStartYear(y);
        setPeriodEndYear(y);
      }
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

  const customerMap = useMemo(() => {
    const m = new Map<number, Customer>();
    customers.forEach((c) => m.set(c.id, c));
    return m;
  }, [customers]);

  const manualAllowed = isStaff && year !== "" && Number(year) <= 2025;

  const filtered = useMemo(() => {
    let rows = items;
    if (filterCustomer) {
      rows = rows.filter((r) => String(r.customer) === filterCustomer);
    }
    if (filterType) {
      rows = rows.filter((r) => r.report_type === filterType);
    }
    if (filterStatus) {
      rows = rows.filter((r) => (r.status || "OPEN") === filterStatus);
    }
    if (filterText) {
      const t = filterText.toLowerCase();
      rows = rows.filter((r) =>
        [r.report_no, r.subject, r.recipient].filter(Boolean).join(" ").toLowerCase().includes(t)
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
  }, [items, filterCustomer, filterType, filterStatus, filterText, sortBy, customerMap]);

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
          recipient: recipient || null,
          subject: subject || null,
          description: description || null,
          delivery_method: deliveryMethod || null,
          period_start_month: periodStartMonth ? Number(periodStartMonth) : null,
          period_start_year: periodStartYear ? Number(periodStartYear) : null,
          period_end_month: periodEndMonth ? Number(periodEndMonth) : null,
          period_end_year: periodEndYear ? Number(periodEndYear) : null,
          delivery_kargo_name: deliveryKargoName || null,
          delivery_kargo_tracking: deliveryKargoTracking || null,
          delivery_elden_name: deliveryEldenName || null,
          delivery_elden_date: deliveryEldenDate || null,
          delivery_email: deliveryEmail || null,
          delivery_ebys_id: deliveryEbysId || null,
          delivery_ebys_date: deliveryEbysDate || null,
          delivery_other_desc: deliveryOtherDesc || null,
          ...(manualAllowed && manualReportNo && manualTypeCumulative && manualYearSerialAll
            ? {
                manual_report_no: manualReportNo,
                manual_type_cumulative: Number(manualTypeCumulative),
                manual_year_serial_all: Number(manualYearSerialAll)
              }
            : {})
        })
      });

      const filesToUpload = [file1, file2, file3].filter(Boolean) as File[];
      for (const f of filesToUpload) {
        const fd = new FormData();
        fd.append("file", f);
        fd.append("report", String(rep.id));
        await apiUpload("/api/files/upload/", fd);
      }
      setFile1(null);
      setFile2(null);
      setFile3(null);
      setManualReportNo("");
      setManualTypeCumulative("");
      setManualYearSerialAll("");

      setCustomerId("");
      setPeriodStartMonth("");
      setPeriodStartYear(String(workingYear ?? new Date().getFullYear()));
      setPeriodEndMonth("");
      setPeriodEndYear(String(workingYear ?? new Date().getFullYear()));
      setRecipient("");
      setSubject("");
      setDescription("");
      setDeliveryMethod("");
      setDeliveryKargoName("");
      setDeliveryKargoTracking("");
      setDeliveryEldenName("");
      setDeliveryEldenDate("");
      setDeliveryEmail("");
      setDeliveryEbysId("");
      setDeliveryEbysDate("");
      setDeliveryOtherDesc("");
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

  async function handleToggleStatus(id: number, current?: string) {
    const next = current === "DONE" ? "OPEN" : "DONE";
    try {
      await apiFetch(`/api/reports/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({ status: next })
      });
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
      alert(`Durum güncellenemedi: ${msg}`);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Raporlar</h1>
        <p className="text-ink/60">Rapor üretim ve durum izleme.</p>
      </div>

      <form onSubmit={handleCreate} className="grid gap-3 rounded-lg border border-ink/10 bg-white p-4 md:grid-cols-3">
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
        <select
          className="h-10 rounded-md border border-ink/20 bg-white px-3 text-sm"
          value={year}
          onChange={(e) => setYear(e.target.value)}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        <Input type="date" placeholder="Tarih" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} />

        <div className="flex gap-2">
          <select
            className="h-10 flex-1 rounded-md border border-ink/20 bg-white px-3 text-sm"
            value={periodStartMonth}
            onChange={(e) => setPeriodStartMonth(e.target.value)}
          >
            <option value="">Başlangıç ay</option>
            {MONTHS.map((m) => (
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
            <option value="">Bitiş ay</option>
            {MONTHS.map((m) => (
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
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <Input placeholder="Alıcı" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
        <Input placeholder="Konu" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <select
          className="h-10 rounded-md border border-ink/20 bg-white px-3 text-sm"
          value={deliveryMethod}
          onChange={(e) => setDeliveryMethod(e.target.value)}
        >
          <option value="">Teslim yöntemi</option>
          {DELIVERY.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
        {deliveryMethod === "KARGO" ? (
          <>
            <Input placeholder="Kargo adı" value={deliveryKargoName} onChange={(e) => setDeliveryKargoName(e.target.value)} />
            <Input placeholder="Takip no" value={deliveryKargoTracking} onChange={(e) => setDeliveryKargoTracking(e.target.value)} />
          </>
        ) : null}
        {deliveryMethod === "ELDEN" ? (
          <>
            <Input placeholder="Teslim alan (Ad Soyad)" value={deliveryEldenName} onChange={(e) => setDeliveryEldenName(e.target.value)} />
            <Input type="date" placeholder="Teslim tarihi" value={deliveryEldenDate} onChange={(e) => setDeliveryEldenDate(e.target.value)} />
          </>
        ) : null}
        {deliveryMethod === "EPOSTA" ? (
          <Input placeholder="E-posta adresi" value={deliveryEmail} onChange={(e) => setDeliveryEmail(e.target.value)} />
        ) : null}
        {deliveryMethod === "EBYS" ? (
          <>
            <Input placeholder="EBYS ID" value={deliveryEbysId} onChange={(e) => setDeliveryEbysId(e.target.value)} />
            <Input type="date" placeholder="EBYS tarihi" value={deliveryEbysDate} onChange={(e) => setDeliveryEbysDate(e.target.value)} />
          </>
        ) : null}
        {deliveryMethod === "DIGER" ? (
          <textarea
            className="h-24 rounded-md border border-ink/20 bg-white px-3 py-2 text-sm md:col-span-2"
            placeholder="Açıklama"
            value={deliveryOtherDesc}
            onChange={(e) => setDeliveryOtherDesc(e.target.value)}
          />
        ) : null}
        <textarea
          className="h-24 rounded-md border border-ink/20 bg-white px-3 py-2 text-sm md:col-span-2"
          placeholder="Açıklama (genel)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="grid gap-2 md:col-span-2 md:grid-cols-3">
          <FilePicker label="Ek 1" onChange={setFile1} />
          <FilePicker label="Ek 2" onChange={setFile2} />
          <FilePicker label="Ek 3" onChange={setFile3} />
        </div>

        {manualAllowed ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm md:col-span-3">
            <div className="font-medium text-ink/80">2024-2025 için manuel numara</div>
            <div className="mt-2 grid gap-2 md:grid-cols-3">
              <Input
                placeholder="Manuel rapor no (YMM-.../YYY-001)"
                value={manualReportNo}
                onChange={(e) => setManualReportNo(e.target.value)}
              />
              <Input
                placeholder="Tip kümülatif"
                value={manualTypeCumulative}
                onChange={(e) => setManualTypeCumulative(e.target.value)}
              />
              <Input
                placeholder="Yıl sayacı (tüm tipler)"
                value={manualYearSerialAll}
                onChange={(e) => setManualYearSerialAll(e.target.value)}
              />
            </div>
          </div>
        ) : null}

        <Button
          type="submit"
          disabled={
            !token ||
            saving ||
            !customerId ||
            !year ||
            !receivedDate ||
            !periodStartMonth ||
            !periodStartYear ||
            !periodEndMonth ||
            !periodEndYear
          }
        >
          {saving ? "Kaydediliyor..." : "Rapor Ekle"}
        </Button>
      </form>
      {notice ? <div className="text-sm text-ink/70">{notice}</div> : null}

      <div className="grid gap-2 rounded-lg border border-ink/10 bg-white p-3 md:grid-cols-5">
        <Input className="h-9 text-xs" placeholder="Arama" value={filterText} onChange={(e) => setFilterText(e.target.value)} />
        <select
          className="h-9 rounded-md border border-ink/20 bg-white px-3 text-xs"
          value={filterCustomer}
          onChange={(e) => setFilterCustomer(e.target.value)}
        >
          <option value="">Müşteri (tüm)</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border border-ink/20 bg-white px-3 text-xs"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="">Rapor türü (tüm)</option>
          {REPORT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border border-ink/20 bg-white px-3 text-xs"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">Durum (tüm)</option>
          <option value="OPEN">Açık</option>
          <option value="DONE">Tamamlandı</option>
        </select>
        <select
          className="h-9 rounded-md border border-ink/20 bg-white px-3 text-xs"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="date_desc">Tarih (yeni)</option>
          <option value="date_asc">Tarih (eski)</option>
          <option value="customer_asc">Müşteri A-Z</option>
        </select>
      </div>

      {loading ? <div>Yükleniyor...</div> : null}
      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      {!loading && !error ? (
        <div className="overflow-hidden rounded-lg border border-ink/10 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-haze text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Tarih</th>
                <th className="px-4 py-3 font-medium">Rapor No</th>
                <th className="px-4 py-3 font-medium">Müşteri</th>
                <th className="px-4 py-3 font-medium">Tür</th>
                <th className="px-4 py-3 font-medium">Dönem</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 font-medium">Detay</th>
                <th className="px-4 py-3 font-medium">Düzenle</th>
                {isStaff ? <th className="px-4 py-3 font-medium">Sil</th> : null}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  className={
                    item.status === "DONE"
                      ? "border-t border-emerald-100 bg-emerald-50/40"
                      : "border-t border-ink/10"
                  }
                >
                  {(() => {
                    const period =
                      item.period_start_month && item.period_start_year && item.period_end_month && item.period_end_year
                        ? `${String(item.period_start_month).padStart(2, "0")}/${item.period_start_year}-${String(
                            item.period_end_month
                          ).padStart(2, "0")}/${item.period_end_year}`
                        : "-";
                    return (
                      <>
                  <td className="px-4 py-3">{item.received_date}</td>
                  <td className="px-4 py-3">{item.report_no}</td>
                  <td className="px-4 py-3">{customerMap.get(item.customer)?.name}</td>
                  <td className="px-4 py-3">{item.report_type}</td>
                  <td className="px-4 py-3">{period}</td>
                  <td className="px-4 py-3">
                    <button
                      className={
                        item.status === "DONE"
                          ? "inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800"
                          : "inline-flex items-center gap-2 rounded-full border border-ink/20 bg-white px-2.5 py-1 text-xs font-medium text-ink/70"
                      }
                      onClick={() => handleToggleStatus(item.id, item.status)}
                    >
                      <span
                        className={
                          item.status === "DONE"
                            ? "inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] text-white"
                            : "inline-flex h-4 w-4 items-center justify-center rounded-full border border-ink/30 text-[10px] text-ink/60"
                        }
                      >
                        {item.status === "DONE" ? "✓" : "○"}
                      </span>
                      {item.status === "DONE" ? "Tamamlandı" : "Açık"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <Link className="text-terracotta" href={`/reports/${item.id}`}>
                      Aç
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link className="text-terracotta" href={`/reports/${item.id}?edit=1`}>
                      Düzenle
                    </Link>
                  </td>
                  {isStaff ? (
                    <td className="px-4 py-3">
                      <button className="text-red-600" onClick={() => handleDelete(item.id)}>Sil</button>
                    </td>
                  ) : null}
                      </>
                    );
                  })()}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

