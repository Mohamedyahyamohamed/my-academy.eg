"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn, formatCurrency } from "@/lib/utils";

const axisProps = {
  stroke: "#94a3b8",
  fontSize: 12,
  tickLine: false,
  axisLine: false,
};

const gridProps = {
  strokeDasharray: "3 3",
  stroke: "#e2e8f0",
  vertical: false,
};

type FormatToken = "currency" | "number";

const resolveFormat = (token?: FormatToken) => {
  if (token === "currency") return (v: number) => formatCurrency(v);
  return undefined;
};

/* ---------------- Area ---------------- */
export function TrendArea({
  data,
  dataKey = "value",
  xKey = "name",
  color = "#7c5cfc",
  height = 220,
  format,
}: {
  data: Record<string, number | string>[];
  dataKey?: string;
  xKey?: string;
  color?: string;
  height?: number;
  format?: FormatToken;
}) {
  const id = React.useId();
  const fmt = resolveFormat(format);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} tickFormatter={fmt} width={48} />
        <Tooltip
          formatter={(v) => [fmt ? fmt(Number(v)) : (v as number), ""]}
          contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2.5}
          fill={`url(#${id})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ---------------- Bars ---------------- */
export function Bars({
  data,
  dataKey = "value",
  xKey = "name",
  color = "#7c5cfc",
  height = 220,
  format,
}: {
  data: Record<string, number | string>[];
  dataKey?: string;
  xKey?: string;
  color?: string;
  height?: number;
  format?: FormatToken;
}) {
  const fmt = resolveFormat(format);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} tickFormatter={fmt} width={48} />
        <Tooltip
          cursor={{ fill: "#f1f5f9" }}
          formatter={(v) => [fmt ? fmt(Number(v)) : (v as number), ""]}
          contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
        />
        <Bar dataKey={dataKey} fill={color} radius={[6, 6, 0, 0]} maxBarSize={44} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ---------------- Multi-bars (e.g. revenue vs collected) ---------------- */
export function GroupedBars({
  data,
  keys,
  xKey = "name",
  height = 260,
}: {
  data: Record<string, number | string>[];
  keys: { key: string; label: string; color: string }[];
  xKey?: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} width={48} />
        <Tooltip
          cursor={{ fill: "#f1f5f9" }}
          contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
        />
        <Legend
          iconType="circle"
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
        />
        {keys.map((k) => (
          <Bar
            key={k.key}
            dataKey={k.key}
            name={k.label}
            fill={k.color}
            radius={[6, 6, 0, 0]}
            maxBarSize={26}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ---------------- Line ---------------- */
export function LineTrend({
  data,
  dataKey = "value",
  xKey = "name",
  color = "#0ea5e9",
  height = 220,
}: {
  data: Record<string, number | string>[];
  dataKey?: string;
  xKey?: string;
  color?: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} width={48} domain={[0, 100]} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
        />
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2.5}
          dot={{ r: 3, fill: color }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ---------------- Donut ---------------- */
export function Donut({
  data,
  height = 220,
  centerLabel,
  centerValue,
}: {
  data: { name: string; value: number; color: string }[];
  height?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="100%"
            paddingAngle={2}
            stroke="none"
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>
      {(centerLabel || centerValue) && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {centerValue && (
            <span className={cn("text-2xl font-semibold text-foreground")}>
              {centerValue}
            </span>
          )}
          {centerLabel && (
            <span className="text-xs text-muted-foreground">{centerLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
