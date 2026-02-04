import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-semibold">YMM Dashboard</h1>
        <p className="mt-2 text-ink/60">
          Genel durum, hizli metrikler ve gorevler.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="text-sm text-ink/60">Musteriler</div>
              <Badge>Aktif</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">128</div>
            <div className="text-sm text-ink/50">Son 30 gun +12</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="text-sm text-ink/60">Evraklar</div>
              <Badge>Yil 2026</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">876</div>
            <div className="text-sm text-ink/50">Bugun 8 adet</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="text-sm text-ink/60">Raporlar</div>
              <Badge>Q1</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">42</div>
            <div className="text-sm text-ink/50">Bekleyen 5</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
