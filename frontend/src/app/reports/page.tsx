import DataTable from "@/components/table";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Raporlar</h1>
        <p className="text-ink/60">Rapor uretim ve durum izleme.</p>
      </div>
      <DataTable />
    </div>
  );
}
