import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.initialize();

  if (auth.session()) {
    return true;
  }

  return router.createUrlTree(['/auth']);
};

export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.initialize();

  if (!auth.session()) {
    return true;
  }

  return router.createUrlTree(['/app/todos']);
};
