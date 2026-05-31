import { Component } from '@angular/core';

@Component({
  selector: 'app-coming-soon',
  template: `
    <section class="coming-soon" aria-labelledby="coming-soon-title">
      <p class="eyebrow">Roadmap</p>
      <h2 id="coming-soon-title">Prochaines fonctionnalites</h2>
      <p>
        Cet espace est pret pour accueillir d'autres modules : notes, profil,
        dashboard ou suivi personnel.
      </p>
    </section>
  `,
  styles: `
    .coming-soon {
      padding: 20px;
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      background: #f8fafc;
    }

    .eyebrow {
      margin: 0 0 8px;
      color: #2563eb;
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    h2 {
      margin: 0;
      color: #111827;
      font-size: 1.6rem;
      line-height: 1.2;
    }

    p:last-child {
      margin: 12px 0 0;
      color: #64748b;
      line-height: 1.6;
    }
  `,
})
export class ComingSoonComponent {}
