import { Component, computed, inject } from '@angular/core';

import { SolarForecastDay } from './solar-forecast.model';
import { SolarForecastService } from './solar-forecast.service';

@Component({
  selector: 'app-solar-forecast',
  templateUrl: './solar-forecast.component.html',
  styleUrl: './solar-forecast.component.scss',
})
export class SolarForecastComponent {
  protected readonly solarForecastService = inject(SolarForecastService);

  protected readonly bestDay = computed(() =>
    [...this.solarForecastService.forecast()].sort(
      (first, second) => second.irradiationKwh - first.irradiationKwh,
    )[0],
  );

  constructor() {
    if (!this.solarForecastService.forecast().length) {
      void this.solarForecastService.loadForecast();
    }
  }

  protected reload(): Promise<void> {
    return this.solarForecastService.loadForecast();
  }

  protected formatDate(date: string): string {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    }).format(new Date(`${date}T12:00:00`));
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
}
