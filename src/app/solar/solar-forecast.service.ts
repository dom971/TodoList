import { Injectable, signal } from '@angular/core';

import { SolarForecastDay } from './solar-forecast.model';

const PETIT_CANAL_LATITUDE = 16.383333;
const PETIT_CANAL_LONGITUDE = -61.483333;
const SOLAR_FORECAST_URL = new URL('https://api.open-meteo.com/v1/forecast');

SOLAR_FORECAST_URL.searchParams.set('latitude', String(PETIT_CANAL_LATITUDE));
SOLAR_FORECAST_URL.searchParams.set('longitude', String(PETIT_CANAL_LONGITUDE));
SOLAR_FORECAST_URL.searchParams.set(
  'daily',
  [
    'weather_code',
    'temperature_2m_max',
    'temperature_2m_min',
    'sunrise',
    'sunset',
    'daylight_duration',
    'sunshine_duration',
    'uv_index_max',
    'precipitation_sum',
    'precipitation_probability_max',
    'wind_speed_10m_max',
    'wind_gusts_10m_max',
    'shortwave_radiation_sum',
  ].join(','),
);
SOLAR_FORECAST_URL.searchParams.set('hourly', 'pressure_msl');
SOLAR_FORECAST_URL.searchParams.set('timezone', 'America/Guadeloupe');
SOLAR_FORECAST_URL.searchParams.set('forecast_days', '8');

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
      const pressureByDate = this.getDailyPressure(data.hourly);

      this.forecast.set(
        data.daily.time.map((date, index) => {
          const pressureMean = pressureByDate.get(date) ?? 0;
          const previousPressure = pressureByDate.get(data.daily.time[index - 1]) ?? pressureMean;

          return {
            date,
            irradiationKwh: this.toKwh(data.daily.shortwave_radiation_sum[index]),
            sunshineHours: this.toHours(data.daily.sunshine_duration[index]),
            uvIndexMax: data.daily.uv_index_max[index],
            weatherCode: data.daily.weather_code[index],
            temperatureMax: this.round(data.daily.temperature_2m_max[index]),
            temperatureMin: this.round(data.daily.temperature_2m_min[index]),
            precipitationProbabilityMax: data.daily.precipitation_probability_max[index] ?? 0,
            precipitationSum: this.round(data.daily.precipitation_sum[index] ?? 0),
            pressureMean,
            pressureDelta: this.round(pressureMean - previousPressure),
            windSpeedMax: this.round(data.daily.wind_speed_10m_max[index] ?? 0),
            windGustsMax: this.round(data.daily.wind_gusts_10m_max[index] ?? 0),
            sunrise: data.daily.sunrise[index],
            sunset: data.daily.sunset[index],
            daylightHours: this.toHours(data.daily.daylight_duration[index]),
          };
        }),
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

  private round(value: number): number {
    return Number(value.toFixed(1));
  }

  private getDailyPressure(hourly: OpenMeteoSolarResponse['hourly']): Map<string, number> {
    const pressureGroups = hourly.time.reduce((groups, time, index) => {
      const date = time.slice(0, 10);
      const value = hourly.pressure_msl[index];

      if (!Number.isFinite(value)) {
        return groups;
      }

      const values = groups.get(date) ?? [];
      values.push(value);
      groups.set(date, values);

      return groups;
    }, new Map<string, number[]>());

    return new Map(
      [...pressureGroups.entries()].map(([date, values]) => [
        date,
        this.round(values.reduce((total, value) => total + value, 0) / values.length),
      ]),
    );
  }
}

interface OpenMeteoSolarResponse {
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    sunrise: string[];
    sunset: string[];
    daylight_duration: number[];
    shortwave_radiation_sum: number[];
    sunshine_duration: number[];
    uv_index_max: number[];
    precipitation_sum: number[];
    precipitation_probability_max: number[];
    wind_speed_10m_max: number[];
    wind_gusts_10m_max: number[];
  };
  hourly: {
    time: string[];
    pressure_msl: number[];
  };
}
