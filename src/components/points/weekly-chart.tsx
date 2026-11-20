import { formatDate, formatNumber } from "@/lib/utils";
import type { WeeklyProgress } from "@/lib/types";

/**
 * Small dependency-free area chart for weekly points. Rendered on the server;
 * the SVG keeps a fixed viewBox so it scales cleanly on mobile and in RTL.
 */
export function WeeklyPointsChart({
  data,
  locale,
  pointsLabel,
  emptyLabel,
}: {
  data: WeeklyProgress[];
  locale: string;
  pointsLabel: string;
  emptyLabel: string;
}) {
  const width = 720;
  const height = 220;
  const padX = 12;
  const padTop = 16;
  const padBottom = 34;

  const values = data.map((row) => Math.max(0, Number(row.points)));
  const hasData = values.some((value) => value > 0);

  if (!hasData) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        {emptyLabel}
      </div>
    );
  }

  const rawMax = Math.max(...values, 1);
  const max = Math.max(10, Math.ceil(rawMax / 10) * 10);
  const innerWidth = width - padX * 2;
  const innerHeight = height - padTop - padBottom;
  const step = data.length > 1 ? innerWidth / (data.length - 1) : 0;

  const coords = values.map((value, index) => {
    const x = padX + step * index;
    const y = padTop + innerHeight - (value / max) * innerHeight;
    return { x, y, value, row: data[index] };
  });

  const linePath = coords
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L${coords[coords.length - 1].x.toFixed(1)} ${(padTop + innerHeight).toFixed(1)} L${coords[0].x.toFixed(1)} ${(padTop + innerHeight).toFixed(1)} Z`;

  const showEveryOther = data.length > 6;

  return (
    <div dir="ltr" className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-56 w-full"
        role="img"
        aria-label={pointsLabel}
      >
        <defs>
          <linearGradient id="weeklyPointsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {[0, 0.5, 1].map((ratio) => {
          const y = padTop + innerHeight * ratio;
          return (
            <line
              key={ratio}
              x1={padX}
              x2={width - padX}
              y1={y}
              y2={y}
              stroke="currentColor"
              strokeWidth="1"
              className="text-slate-200 dark:text-slate-700"
            />
          );
        })}

        <path d={areaPath} fill="url(#weeklyPointsFill)" />
        <path
          d={linePath}
          fill="none"
          stroke="#6366f1"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {coords.map((point, index) => (
          <g key={point.row.week_start}>
            <circle
              cx={point.x}
              cy={point.y}
              r={3.5}
              fill="#6366f1"
              stroke="white"
              strokeWidth="1.5"
              className="dark:stroke-slate-900"
            >
              <title>
                {formatDate(point.row.week_start, locale, {
                  day: "numeric",
                  month: "short",
                })}
                {": "}
                {formatNumber(point.value, locale, 1)}
              </title>
            </circle>
            {index % (showEveryOther ? 2 : 1) === 0 || index === coords.length - 1 ? (
              <text
                x={point.x}
                y={height - 10}
                textAnchor={index === 0 ? "start" : index === coords.length - 1 ? "end" : "middle"}
                className="fill-slate-500 text-[11px] dark:fill-slate-400"
              >
                {formatDate(point.row.week_start, locale, {
                  day: "numeric",
                  month: "short",
                })}
              </text>
            ) : null}
          </g>
        ))}

        <text
          x={padX}
          y={padTop - 4}
          className="fill-slate-400 text-[11px] dark:fill-slate-500"
        >
          {formatNumber(max, locale)}
        </text>
      </svg>
    </div>
  );
}
