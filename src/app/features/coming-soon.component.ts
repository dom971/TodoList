import { Component } from '@angular/core';

@Component({
  selector: 'app-coming-soon',
  template: `
    <section class="coming-soon" aria-labelledby="coming-soon-title">
      <p class="eyebrow">Roadmap</p>
      <h2 id="coming-soon-title">Prochaines fonctionnalités</h2>
      <p>
        Cet espace est prêt pour accueillir d'autres modules : notes, profil,
        dashboard ou suivi personnel.
      </p>
    </section>
  `,
  styles: `
    .coming-soon {
      padding: 20px;
      border: 1px dashed var(--app-border-strong);
      border-radius: 8px;
      background: var(--app-surface-muted);
    }

    .eyebrow {
      margin: 0 0 8px;
      color: var(--app-primary);
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    h2 {
      margin: 0;
      color: var(--app-text);
      font-size: 1.6rem;
      line-height: 1.2;
    }

    p:last-child {
      margin: 12px 0 0;
      color: var(--app-text-muted);
      line-height: 1.6;
    }
  `,
})
export class ComingSoonComponent {}
