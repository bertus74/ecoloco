"use client";

import { useEffect, useRef } from "react";
import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
} from "chart.js";

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

const BLUE_RAMP = ["#B5D4F4", "#85B7EB", "#378ADD", "#185FA5", "#0C447C", "#042C53", "#021624"];

export function StatutBarChart({
  labels,
  data,
}: {
  labels: string[];
  data: number[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const chart = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Prospects",
            data,
            backgroundColor: labels.map((_, i) => BLUE_RAMP[i % BLUE_RAMP.length]),
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { grid: { display: false } } },
      },
    });
    return () => chart.destroy();
  }, [labels, data]);

  return (
    <div style={{ position: "relative", width: "100%", height: 220 }}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Répartition des prospects par statut du pipeline"
      />
    </div>
  );
}

export function ParCommercialBarChart({
  labels,
  data,
}: {
  labels: string[];
  data: number[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const chart = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Prospects",
            data,
            backgroundColor: "#378ADD",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { grid: { display: false } } },
      },
    });
    return () => chart.destroy();
  }, [labels, data]);

  return (
    <div style={{ position: "relative", width: "100%", height: 220 }}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Nombre de prospects par commercial"
      />
    </div>
  );
}
