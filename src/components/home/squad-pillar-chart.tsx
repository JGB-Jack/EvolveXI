"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function SquadPillarChart({
  data,
}: {
  data: { pillar: string; score: number }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Squad pillar breakdown</CardTitle>
        <CardDescription>
          Averages across every completed session and player
        </CardDescription>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ bottom: 45 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="pillar"
              tick={{ fontSize: 11 }}
              interval={0}
              angle={-35}
              textAnchor="end"
            />
            <YAxis
              domain={[0, 5]}
              ticks={[0, 1, 2, 3, 4, 5]}
              tick={{ fontSize: 10 }}
            />
            <Bar dataKey="score" fill="var(--primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
