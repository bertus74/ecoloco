"use client";

import { useEffect, useRef } from "react";
import {
  Chart,
  ArcElement,
  BarController,
  DoughnutController,
  BarElement,
  CategoryScale,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";

Chart.register(
  ArcElement,
  BarController,
  DoughnutController,
  BarElement,
  CategoryScale,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
);

// Palette catégorielle en ordre fixe (validée CVD/contraste ; légende + tooltip toujours présents).
export const SERIES_COULEURS = ["#1A7A4A", "#2E5FA6", "#7040B0", "#E07B39"];

// Une couleur fixe par pack (suit l'entité, pas le rang) ; ordre de l'anneau validé CVD.
export const COULEURS_PACKS: Record<string, string> = {
  economies_immediates: "#1A7A4A",
  maitrise_froid: "#2E5FA6",
  chaleur_productive: "#E07B39",
  eau_maitrisee: "#7040B0",
  pilotage_intelligent: "#B8336A",
  sans_pack: "#9CA3AF",
};

export interface Serie {
  label: string;
  data: number[];
  color: string;
}

const AXES = {
  ticks: { color: "#6B7280", font: { size: 11 } },
  border: { display: false },
};
const GRILLE = { color: "#EEF0F3" };
const LEGENDE = {
  position: "bottom" as const,
  labels: { usePointStyle: true, pointStyle: "circle", boxWidth: 6, boxHeight: 6, color: "#4B5563", font: { size: 11 } },
};

function useChart(build: (canvas: HTMLCanvasElement) => Chart, deps: unknown[]) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const chart = build(ref.current);
    return () => chart.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

export function BarresGroupees({
  labels,
  series,
  horizontal = false,
  hauteur = 260,
  ariaLabel,
}: {
  labels: string[];
  series: Serie[];
  horizontal?: boolean;
  hauteur?: number;
  ariaLabel: string;
}) {
  const ref = useChart(
    (canvas) =>
      new Chart(canvas, {
        type: "bar",
        data: {
          labels,
          datasets: series.map((s) => ({
            label: s.label,
            data: s.data,
            backgroundColor: s.color,
            borderRadius: 4,
            borderSkipped: "start",
            maxBarThickness: horizontal ? 12 : 22,
            categoryPercentage: 0.75,
            barPercentage: 0.9,
          })),
        },
        options: {
          indexAxis: horizontal ? "y" : "x",
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          plugins: { legend: { ...LEGENDE, display: series.length > 1 } },
          scales: {
            x: { ...AXES, grid: horizontal ? GRILLE : { display: false }, beginAtZero: true },
            y: { ...AXES, grid: horizontal ? { display: false } : GRILLE, beginAtZero: true },
          },
        },
      }),
    [labels, series, horizontal],
  );

  return (
    <div style={{ position: "relative", width: "100%", height: hauteur }}>
      <canvas ref={ref} role="img" aria-label={ariaLabel} />
    </div>
  );
}

export function Courbes({
  labels,
  series,
  hauteur = 260,
  ariaLabel,
}: {
  labels: string[];
  series: Serie[];
  hauteur?: number;
  ariaLabel: string;
}) {
  const ref = useChart(
    (canvas) =>
      new Chart(canvas, {
        type: "line",
        data: {
          labels,
          datasets: series.map((s) => ({
            label: s.label,
            data: s.data,
            borderColor: s.color,
            backgroundColor: s.color,
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 4,
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            pointHoverRadius: 5,
          })),
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          plugins: { legend: LEGENDE },
          scales: {
            x: { ...AXES, grid: { display: false } },
            y: { ...AXES, grid: GRILLE, beginAtZero: true, ticks: { ...AXES.ticks, precision: 0 } },
          },
        },
      }),
    [labels, series],
  );

  return (
    <div style={{ position: "relative", width: "100%", height: hauteur }}>
      <canvas ref={ref} role="img" aria-label={ariaLabel} />
    </div>
  );
}

export function Camembert({
  labels,
  data,
  couleurs,
  hauteur = 240,
  ariaLabel,
}: {
  labels: string[];
  data: number[];
  couleurs: string[];
  hauteur?: number;
  ariaLabel: string;
}) {
  const ref = useChart(
    (canvas) =>
      new Chart(canvas, {
        type: "doughnut",
        data: {
          labels,
          datasets: [{ data, backgroundColor: couleurs, borderColor: "#fff", borderWidth: 2, hoverOffset: 4 }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "58%",
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.label} : ${Number(ctx.raw).toLocaleString("fr-FR")} €`,
              },
            },
          },
        },
      }),
    [labels, data, couleurs],
  );

  return (
    <div style={{ position: "relative", width: "100%", height: hauteur }}>
      <canvas ref={ref} role="img" aria-label={ariaLabel} />
    </div>
  );
}
