import { Component, Input } from '@angular/core';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexFill,
  ApexGrid,
  ApexLegend,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
  ChartComponent,
} from 'ng-apexcharts';

/** Everything an admin chart page might configure; all optional except chart/series. */
export interface AdminChartConfig {
  chart: ApexChart;
  series: ApexAxisChartSeries | ApexNonAxisChartSeries;
  xaxis?: ApexXAxis;
  yaxis?: ApexYAxis | ApexYAxis[];
  colors?: string[];
  labels?: string[];
  legend?: ApexLegend;
  stroke?: ApexStroke;
  fill?: ApexFill;
  dataLabels?: ApexDataLabels;
  tooltip?: ApexTooltip;
  grid?: ApexGrid;
  plotOptions?: ApexPlotOptions;
}

/** Admin's own navy/slate-blue data-viz palette — deliberately not the vendor dashboard's
 * Ember/Pine VENDOR_CHART_PALETTE, matching the admin console's distinct visual identity. Ordered
 * for a typical multi-series chart: deep navy primary, slate blue, soft blue, then semantic
 * success/warning/danger for status-distribution charts. */
export const ADMIN_CHART_PALETTE = ['#1f3a63', '#4d6aa0', '#3f7dc9', '#1a8a46', '#c17a1f', '#cc3333'];

/**
 * Titled card wrapping ng-apexcharts' <apx-chart>. Used for every chart on the Analytics/Reports
 * pages (line, bar, area, pie/donut — the type lives in config.chart.type).
 */
@Component({
  selector: 'admin-chart-card',
  standalone: true,
  imports: [ChartComponent],
  templateUrl: './admin-chart-card.html',
  styleUrl: './admin-chart-card.css',
})
export class AdminChartCard {
  @Input({ required: true }) title!: string;
  @Input() subtitle: string | null = null;
  @Input({ required: true }) config!: AdminChartConfig;
  @Input() height = 320;
  @Input() loading = false;
  @Input() emptyMessage = 'No data available yet.';

  protected get isEmpty(): boolean {
    const series = this.config?.series;
    if (!series || series.length === 0) {
      return true;
    }
    // Axis series: [{ data: [...] }, ...] — empty if every series has no points.
    if (typeof series[0] === 'object' && series[0] !== null && 'data' in (series[0] as object)) {
      return (series as { data: unknown[] }[]).every((s) => !s.data || s.data.length === 0);
    }
    return false;
  }
}
