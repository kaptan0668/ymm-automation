import DataTable from "@/components/table";

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Müşteriler</h1>
        <p className="text-ink/60">Müşteri listesi ve hareketler.</p>
      </div>
      <DataTable />
    </div>
  );
}
