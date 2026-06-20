"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { buildChartData, type ChartDatum } from "@/lib/report-view";
import { formatPercentage, formatRate } from "@/lib/formatters";
import type { FacilityReport } from "@/lib/types";

const SERIES = [
  { key: "Facility", color: "#1f6feb" },
  { key: "State", color: "#54aeff" },
  { key: "National", color: "#9ec5fe" },
] as const;

function MeasureChart({ datum }: { datum: ChartDatum }) {
  const data = SERIES.map((s) => ({
    name: s.key,
    value: datum[s.key],
    color: s.color,
  })).filter((d) => d.value !== null);

  const formatLabel = (value: unknown) => {
    const n = value as number;
    return datum.unit === "%" ? formatPercentage(n) : formatRate(n);
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <h4 className="mb-2 text-sm font-semibold text-slate-700">{datum.name}</h4>
      {data.length === 0 ? (
        <p className="flex h-[140px] items-center justify-center text-sm text-slate-400">
          No data available
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
            <Tooltip formatter={formatLabel} cursor={{ fill: "#f1f5f9" }} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              <LabelList
                dataKey="value"
                position="top"
                formatter={formatLabel}
                style={{ fontSize: 10, fill: "#475569" }}
              />
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function ComparisonCharts({ report }: { report: FacilityReport }) {
  const chartData = buildChartData(report);
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {chartData.map((datum) => (
        <MeasureChart key={datum.name} datum={datum} />
      ))}
    </div>
  );
}
