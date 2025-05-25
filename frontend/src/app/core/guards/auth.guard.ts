import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs/operators';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn) {
    console.log('AuthGuard: Usuario logueado, acceso permitido a', state.url);
    return true;
  } else {
    console.log('AuthGuard: Usuario no logueado, redirigiendo a /dashboard');
    router.navigate(['/dashboard'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  /*
  return authService.isLoggedIn$.pipe(
    take(1),
    map(isLoggedIn => {
      if (isLoggedIn) {
        return true;
      } else {
        console.log('AuthGuard: Usuario no logueado, redirigiendo a /login');
        router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
        return false;
      }
    })
  );
  */
};