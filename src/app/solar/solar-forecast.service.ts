import { Injectable, signal } from '@angular/core';

import { SolarForecastDay } from './solar-forecast.model';

const PETIT_CANAL_LATITUDE = 16.383333;
const PETIT_CANAL_LONGITUDE = -61.483333;
const SOLAR_FORECAST_URL = new URL('https://api.open-meteo.com/v1/forecast');

SOLAR_FORECAST_URL.searchParams.set('latitude', String(PETIT_CANAL_LATITUDE));
SOLAR_FORECAST_URL.searchParams.set('longitude', String(PETIT_CANAL_LONGITUDE));
SOLAR_FORECAST_URL.searchParams.set(
  'daily',
  'shortwave_radiation_sum,sunshine_duration,uv_index_max',
);
SOLAR_FORECAST_URL.searchParams.set('timezone', 'America/Guadeloupe');
SOLAR_FORECAST_URL.searchParams.set('forecast_days', '7');

@Injectable({
  providedIn: 'root',
})
export class SolarForecastService {
  readonly forecast = signal<SolarForecastDay[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

  async loadForecast(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const response = await fetch(SOLAR_FORECAST_URL.toString());

      if (!response.ok) {
        throw new Error('Prévisions solaires indisponibles.');
      }

      const data = (await response.json()) as OpenMeteoSolarResponse;

      this.forecast.set(
        data.daily.time.map((date, index) => ({
          date,
          irradiationKwh: this.toKwh(data.daily.shortwave_radiation_sum[index]),
          sunshineHours: this.toHours(data.daily.sunshine_duration[index]),
          uvIndexMax: data.daily.uv_index_max[index],
        })),
      );
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Prévisions solaires indisponibles.',
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  private toKwh(megaJoules: number): number {
    return Number((megaJoules / 3.6).toFixed(2));
  }

  private toHours(seconds: number): number {
    return Number((seconds / 3600).toFixed(1));
  }
}

interface OpenMeteoSolarResponse {
  daily: {
    time: string[];
    shortwave_radiation_sum: number[];
    sunshine_duration: number[];
    uv_index_max: number[];
  };
}
