import DataTable from "@/components/table";

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Evraklar</h1>
        <p className="text-ink/60">Evrak giriş ve arşiv takibi.</p>
      </div>
      <DataTable />
    </div>
  );
}
