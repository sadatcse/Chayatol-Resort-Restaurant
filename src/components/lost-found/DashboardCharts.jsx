import React, { useState } from "react";

// ================= MONTHLY STATS BAR CHART =================
export const MonthlyStatsChart = ({ data = [] }) => {
  const [hoveredBar, setHoveredBar] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-brand-sage uppercase font-bold text-xs">
        No monthly data available
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => Math.max(d.found, d.returned, 1)));
  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="w-full relative space-y-4">
      <div className="flex justify-end items-center gap-4 text-xs font-semibold pb-2">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-brand-primary" />
          <span className="text-brand-charcoal dark:text-brand-offwhite">Found Items</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-500" />
          <span className="text-brand-charcoal dark:text-brand-offwhite">Returned Items</span>
        </div>
      </div>

      <div className="h-64 flex items-stretch gap-2 relative border-b border-l border-brand-beige/40 dark:border-brand-dark-grey/40 pl-6 pb-6 pt-2">
        {/* Grid lines */}
        <div className="absolute inset-y-0 left-6 right-0 flex flex-col justify-between pointer-events-none pb-6 pt-2 pr-2">
          {gridLines.reverse().map((ratio, idx) => (
            <div
              key={idx}
              className="w-full border-t border-brand-beige/10 dark:border-brand-dark-grey/10 relative"
            >
              <span className="absolute right-full mr-2 -translate-y-1/2 text-[9px] font-mono text-brand-sage">
                {Math.round(ratio * maxVal)}
              </span>
            </div>
          ))}
        </div>

        {/* Bar Series */}
        <div className="flex-1 flex justify-around items-end z-10">
          {data.map((item, idx) => {
            const foundHeight = `${(item.found / maxVal) * 85}%`;
            const returnedHeight = `${(item.returned / maxVal) * 85}%`;

            return (
              <div key={idx} className="flex flex-col items-center gap-2 group w-1/6 relative">
                <div className="w-full flex justify-center items-end gap-1 h-48">
                  {/* Found Bar */}
                  <div
                    onMouseEnter={() => setHoveredBar({ index: idx, type: "found", value: item.found })}
                    onMouseLeave={() => setHoveredBar(null)}
                    style={{ height: foundHeight }}
                    className="w-4 sm:w-6 bg-brand-primary hover:bg-brand-primary/80 rounded-t-sm transition-all duration-300 relative cursor-pointer"
                  />
                  {/* Returned Bar */}
                  <div
                    onMouseEnter={() => setHoveredBar({ index: idx, type: "returned", value: item.returned })}
                    onMouseLeave={() => setHoveredBar(null)}
                    style={{ height: returnedHeight }}
                    className="w-4 sm:w-6 bg-emerald-500 hover:bg-emerald-400 rounded-t-sm transition-all duration-300 relative cursor-pointer"
                  />
                </div>
                {/* X-Axis Label */}
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-sage text-center truncate w-full">
                  {item.month.split(" ")[0]}
                </span>

                {/* Tooltip */}
                {hoveredBar && hoveredBar.index === idx && (
                  <div className="absolute bottom-full mb-2 bg-brand-charcoal text-white text-[10px] p-2 rounded-lg shadow-xl border border-brand-dark-grey z-20 pointer-events-none flex flex-col items-center">
                    <span className="font-bold capitalize">{hoveredBar.type}</span>
                    <span className="font-mono text-xs">{hoveredBar.value} items</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ================= CATEGORY DONUT CHART =================
export const CategoryPieChart = ({ data = [] }) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-brand-sage uppercase font-bold text-xs">
        No category data available
      </div>
    );
  }

  const colors = [
    "#0F172A", // slate-900
    "#1E293B", // slate-800
    "#0ea5e9", // sky-500
    "#10b981", // emerald-500
    "#f59e0b", // amber-500
    "#ef4444", // red-500
    "#8b5cf6", // violet-500
    "#ec4899", // pink-500
    "#64748b", // slate-500
  ];

  const total = data.reduce((acc, curr) => acc + curr.count, 0);
  let accumulatedAngle = 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
      {/* SVG Donut */}
      <div className="flex justify-center relative">
        <svg width="180" height="180" viewBox="0 0 100 100" className="rotate-[-90deg]">
          {data.map((item, idx) => {
            const percentage = item.count / total;
            const angle = percentage * 360;
            const strokeDash = `${percentage * 282.7} 282.7`;
            const strokeOffset = 282.7 - (accumulatedAngle / 360) * 282.7;
            accumulatedAngle += angle;

            const isHovered = hoveredIdx === idx;
            const color = colors[idx % colors.length];

            return (
              <circle
                key={idx}
                cx="50"
                cy="50"
                r="45"
                fill="transparent"
                stroke={color}
                strokeWidth={isHovered ? 10 : 8}
                strokeDasharray={strokeDash}
                strokeDashoffset={strokeOffset}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="transition-all duration-300 cursor-pointer"
              />
            );
          })}
        </svg>
        {/* Central Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-black text-brand-charcoal dark:text-brand-offwhite">{total}</span>
          <span className="text-[10px] uppercase font-bold tracking-widest text-brand-sage">Total Items</span>
        </div>
      </div>

      {/* Legend list */}
      <div className="space-y-2">
        {data.slice(0, 7).map((item, idx) => {
          const color = colors[idx % colors.length];
          const pct = ((item.count / total) * 100).toFixed(0);

          return (
            <div
              key={idx}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className={`flex items-center justify-between p-1.5 rounded-lg transition-colors cursor-pointer ${
                hoveredIdx === idx ? "bg-brand-offwhite dark:bg-brand-dark-grey/30" : ""
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span style={{ backgroundColor: color }} className="w-2.5 h-2.5 rounded-full shrink-0" />
                <span className="text-xs font-semibold text-brand-charcoal dark:text-brand-offwhite truncate">
                  {item.name}
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-brand-charcoal dark:text-brand-offwhite">{item.count}</span>
                <span className="text-brand-sage text-[10px] font-bold">{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ================= LOCATION DISTRIBUTION CHART =================
export const LocationBarChart = ({ data = [] }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-brand-sage uppercase font-bold text-xs">
        No location data available
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="space-y-4">
      {data.slice(0, 6).map((item, idx) => {
        const pct = `${(item.count / maxVal) * 100}%`;

        return (
          <div key={idx} className="space-y-1">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-brand-charcoal dark:text-brand-offwhite truncate max-w-[70%]">
                {item.name}
              </span>
              <span className="font-mono text-brand-primary dark:text-brand-sage">
                {item.count} items
              </span>
            </div>
            {/* Bar Track */}
            <div className="w-full bg-brand-offwhite dark:bg-brand-dark-grey/40 h-2.5 rounded-full overflow-hidden">
              <div
                style={{ width: pct }}
                className="bg-brand-primary h-full rounded-full transition-all duration-500"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
