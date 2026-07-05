export interface SolarForecastDay {
  date: string;
  irradiationKwh: number;
  sunshineHours: number;
  uvIndexMax: number;
  weatherCode: number;
  temperatureMax: number;
  temperatureMin: number;
  precipitationProbabilityMax: number;
  precipitationSum: number;
  windSpeedMax: number;
  windGustsMax: number;
  sunrise: string;
  sunset: string;
  daylightHours: number;
}
