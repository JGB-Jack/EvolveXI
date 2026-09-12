"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

export function PlayerProgressChart({
  data,
}: {
  data: { pillar: string; score: number }[];
}) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart
          data={data}
          outerRadius="65%"
          margin={{ top: 10, right: 25, bottom: 10, left: 25 }}
        >
          <PolarGrid />
          <PolarAngleAxis dataKey="pillar" tick={{ fontSize: 11 }} />
          <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 10 }} />
          <Radar
            dataKey="score"
            stroke="var(--primary)"
            fill="var(--primary)"
            fillOpacity={0.4}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
