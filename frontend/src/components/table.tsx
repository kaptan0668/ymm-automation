"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

type Row = {
  name: string;
  status: string;
  updated: string;
};

const data: Row[] = [
  { name: "Alpha Ltd", status: "Aktif", updated: "2026-02-01" },
  { name: "Beta AŞ", status: "Bekliyor", updated: "2026-01-22" },
  { name: "Gamma Taşımacılık", status: "Aktif", updated: "2026-01-18" }
];

const columns: ColumnDef<Row>[] = [
  { accessorKey: "name", header: "Kayıt" },
  { accessorKey: "status", header: "Durum" },
  { accessorKey: "updated", header: "Son Güncelleme" }
];

export default function DataTable() {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel()
  });

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Input placeholder="Filtre (örnek)" className="md:max-w-xs" />
        <div className="flex gap-2">
          <Button variant="outline">Filtre</Button>
          <Button>Dışa Aktar</Button>
        </div>
      </div>
      <div className="mt-4 overflow-hidden rounded-lg border border-ink/10 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-haze text-left">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-4 py-3 font-medium">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-t border-ink/10">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
