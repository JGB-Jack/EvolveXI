"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export function SeasonTrendChart({
  data,
  playerFirstName,
}: {
  data: { date: string; score: number }[];
  playerFirstName: string;
}) {
  if (data.length < 2) {
    return (
      <p className="text-sm text-muted-foreground">
        Needs at least 2 completed sessions to show a trend &mdash;{" "}
        {playerFirstName} has {data.length} so far. Only sessions marked
        as finished count, so this updates once the current session is
        finished.
      </p>
    );
  }

  const change = data[data.length - 1].score - data[0].score;
  const changeLabel =
    Math.abs(change) < 0.05
      ? "No change since first session"
      : `${change > 0 ? "Up" : "Down"} ${Math.abs(change).toFixed(1)} since first session`;
  const Icon =
    Math.abs(change) < 0.05 ? Minus : change > 0 ? TrendingUp : TrendingDown;
  const changeColor =
    Math.abs(change) < 0.05
      ? "text-muted-foreground"
      : change > 0
        ? "text-green-600 dark:text-green-500"
        : "text-red-600 dark:text-red-500";

  return (
    <div className="space-y-2">
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis domain={[0, 5]} tick={{ fontSize: 10 }} width={20} />
            <Line
              type="monotone"
              dataKey="score"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className={cn("flex items-center gap-1.5 text-sm font-medium", changeColor)}>
        <Icon className="size-4" />
        {changeLabel}
      </div>
    </div>
  );
}
