import { Component, computed, inject } from '@angular/core';

import { CycloneAlert } from './cyclone-alert.model';
import { CycloneAlertService } from './cyclone-alert.service';
import { SolarForecastDay } from './solar-forecast.model';
import { SolarForecastService } from './solar-forecast.service';

@Component({
  selector: 'app-solar-forecast',
  templateUrl: './solar-forecast.component.html',
  styleUrl: './solar-forecast.component.scss',
})
export class SolarForecastComponent {
  protected readonly cycloneAlertService = inject(CycloneAlertService);
  protected readonly solarForecastService = inject(SolarForecastService);

  protected readonly bestDay = computed(() =>
    [...this.solarForecastService.forecast()].sort(
      (first, second) => second.irradiationKwh - first.irradiationKwh,
    )[0],
  );
  protected readonly solarChart = computed(() => this.getSolarChart(this.solarForecastService.forecast()));

  constructor() {
    if (!this.solarForecastService.forecast().length) {
      void this.solarForecastService.loadForecast();
    }

    if (!this.cycloneAlertService.alert()) {
      void this.cycloneAlertService.loadAlert();
    }
  }

  protected reload(): Promise<void> {
    return Promise.all([
      this.solarForecastService.loadForecast(),
      this.cycloneAlertService.loadAlert(),
    ]).then(() => undefined);
  }

  protected formatDate(date: string): string {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    }).format(new Date(`${date}T12:00:00`));
  }

  protected formatShortDate(date: string): string {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
    }).format(new Date(`${date}T12:00:00`));
  }

  protected formatTime(dateTime: string): string {
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateTime));
  }

  protected formatDateTime(dateTime: string): string {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateTime));
  }

  protected getCyclonePanelClass(alert: CycloneAlert): string {
    return `cyclone-${alert.level}`;
  }

  protected getCycloneIcon(alert: CycloneAlert): string {
    if (alert.level === 'alert') {
      return '🌀';
    }

    if (alert.level === 'watch') {
      return '⚠️';
    }

    return '✅';
  }

  protected getSolarLevel(day: SolarForecastDay): string {
    if (day.irradiationKwh >= 6) {
      return 'Très favorable';
    }

    if (day.irradiationKwh >= 4.5) {
      return 'Favorable';
    }

    return 'Modéré';
  }

  protected getWeatherTrend(day: SolarForecastDay): WeatherTrend {
    const code = day.weatherCode;

    if (code === 0) {
      return { icon: '☀️', label: 'Ciel clair' };
    }

    if ([1, 2].includes(code)) {
      return { icon: '🌤️', label: 'Belles éclaircies' };
    }

    if (code === 3 || [45, 48].includes(code)) {
      return { icon: '☁️', label: 'Nuageux' };
    }

    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
      return { icon: '🌦️', label: 'Averses probables' };
    }

    if (code >= 95) {
      return { icon: '⛈️', label: 'Orageux' };
    }

    return { icon: '🌡️', label: 'Variable' };
  }

  protected getTemperatureTrend(day: SolarForecastDay): WeatherTrend {
    if (day.temperatureMax >= 32) {
      return { icon: '🔥', label: 'Chaud' };
    }

    if (day.temperatureMin <= 23) {
      return { icon: '🌬️', label: 'Plus frais' };
    }

    return { icon: '🌡️', label: 'Tropical' };
  }

  protected getPressureTrend(day: SolarForecastDay): WeatherTrend {
    if (day.pressureDelta <= -2) {
      return { icon: '↘️', label: 'Pression en baisse' };
    }

    if (day.pressureDelta >= 2) {
      return { icon: '↗️', label: 'Pression en hausse' };
    }

    return { icon: '➡️', label: 'Pression stable' };
  }

  protected getMoonPhase(day: SolarForecastDay): WeatherTrend {
    const synodicMonth = 29.530588853;
    const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14);
    const current = new Date(`${day.date}T12:00:00Z`).getTime();
    const age = (((current - knownNewMoon) / 86400000) % synodicMonth + synodicMonth) % synodicMonth;

    if (age < 1.85 || age >= 27.68) {
      return { icon: '🌑', label: 'Nouvelle lune' };
    }

    if (age < 5.54) {
      return { icon: '🌒', label: 'Premier croissant' };
    }

    if (age < 9.23) {
      return { icon: '🌓', label: 'Premier quartier' };
    }

    if (age < 12.92) {
      return { icon: '🌔', label: 'Gibbeuse croissante' };
    }

    if (age < 16.61) {
      return { icon: '🌕', label: 'Pleine lune' };
    }

    if (age < 20.3) {
      return { icon: '🌖', label: 'Gibbeuse décroissante' };
    }

    if (age < 23.99) {
      return { icon: '🌗', label: 'Dernier quartier' };
    }

    return { icon: '🌘', label: 'Dernier croissant' };
  }

  protected getStormRisk(day: SolarForecastDay): StormRisk {
    if (day.windGustsMax >= 118) {
      return {
        className: 'risk-extreme',
        icon: '🌀',
        label: 'Risque cyclonique',
        detail: 'Rafales compatibles avec une vigilance cyclonique.',
      };
    }

    if (day.windGustsMax >= 89) {
      return {
        className: 'risk-high',
        icon: '🌪️',
        label: 'Risque tempête',
        detail: 'Rafales fortes à surveiller.',
      };
    }

    if (
      day.windGustsMax >= 62 ||
      day.precipitationSum >= 25 ||
      day.precipitationProbabilityMax >= 75 ||
      day.weatherCode >= 95 ||
      day.pressureDelta <= -3
    ) {
      return {
        className: 'risk-watch',
        icon: '🌊',
        label: 'Onde tropicale possible',
        detail: 'Pluie, orages, rafales ou baisse de pression justifient une surveillance.',
      };
    }

    return {
      className: 'risk-low',
      icon: '✅',
      label: 'Risque faible',
      detail: 'Pas de signal fort sur les prévisions du jour.',
    };
  }

  private getSolarChart(days: SolarForecastDay[]): SolarChart {
    const width = 800;
    const height = 240;
    const paddingX = 34;
    const top = 24;
    const baseline = 182;
    const maxValue = Math.max(1, ...days.map((day) => day.irradiationKwh));
    const points = days.map((day, index) => {
      const x = days.length === 1
        ? width / 2
        : paddingX + (index * (width - paddingX * 2)) / (days.length - 1);
      const y = baseline - (day.irradiationKwh / maxValue) * (baseline - top);

      return {
        date: day.date,
        label: this.formatShortDate(day.date),
        value: day.irradiationKwh,
        x: Number(x.toFixed(1)),
        y: Number(y.toFixed(1)),
      };
    });
    const linePath = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');
    const areaPath = points.length
      ? `${linePath} L ${points.at(-1)?.x} ${baseline} L ${points[0].x} ${baseline} Z`
      : '';

    return {
      width,
      height,
      baseline,
      maxValue: Number(maxValue.toFixed(1)),
      linePath,
      areaPath,
      points,
    };
  }
}

interface WeatherTrend {
  icon: string;
  label: string;
}

interface StormRisk extends WeatherTrend {
  className: string;
  detail: string;
}

interface SolarChart {
  width: number;
  height: number;
  baseline: number;
  maxValue: number;
  linePath: string;
  areaPath: string;
  points: SolarChartPoint[];
}

interface SolarChartPoint {
  date: string;
  label: string;
  value: number;
  x: number;
  y: number;
}
