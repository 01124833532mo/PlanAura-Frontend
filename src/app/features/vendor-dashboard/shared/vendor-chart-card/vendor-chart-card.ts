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

/** Everything a vendor dashboard chart might configure; all optional except chart/series. */
export interface VendorChartConfig {
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

/** Planura's Ember/Pine brand palette applied to vendor dashboard charts — the same palette used
 * everywhere else in the app (admin included), so a chart never looks like it belongs to a
 * different product: ember primary, pine success, bronze accent, warm neutral, ink-navy, error. */
export const VENDOR_CHART_PALETTE = [
  '#d8461f', // primary ember
  '#1f6e5c', // pine / success
  '#a8763f', // bronze accent
  '#8f8477', // secondary/neutral
  '#2b3a55', // ink-navy (cool outlier for series contrast)
  '#b8341e', // error
];

/**
 * Titled card wrapping ng-apexcharts' <apx-chart>, styled for the vendor business dashboard
 * (mirrors the admin dashboard's admin-chart-card pattern but on Planura's vendor-facing design
 * tokens). Handles loading and empty states so every chart on Overview looks intentional even for
 * a brand-new vendor with no data yet, instead of rendering an empty axis grid.
 */
@Component({
  selector: 'vendor-chart-card',
  standalone: true,
  imports: [ChartComponent],
  templateUrl: './vendor-chart-card.html',
  styleUrl: './vendor-chart-card.css',
})
export class VendorChartCard {
  @Input({ required: true }) title!: string;
  @Input() subtitle: string | null = null;
  @Input() config: VendorChartConfig | null = null;
  @Input() height = 300;
  @Input() loading = false;
  @Input() emptyTitle = 'No data yet';
  @Input() emptyMessage = 'Once activity comes in, your chart will appear here.';
  @Input() emptyIcon = 'bar_chart';

  protected get isEmpty(): boolean {
    const series = this.config?.series;
    if (!series || series.length === 0) {
      return true;
    }
    if (typeof series[0] === 'object' && series[0] !== null && 'data' in (series[0] as object)) {
      return (series as { data: unknown[] }[]).every((s) => !s.data || s.data.length === 0);
    }
    return false;
  }
}
