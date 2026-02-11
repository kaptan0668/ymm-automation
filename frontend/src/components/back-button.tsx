"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function BackButton({ label = "Geri" }: { label?: string }) {
  const router = useRouter();
  return (
    <Button variant="outline" className="print-hide" onClick={() => router.back()}>
      <- {label}
    </Button>
  );
}
