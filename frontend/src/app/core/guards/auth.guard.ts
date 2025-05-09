import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs/operators'; // Para la versión con Observable

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Versión Síncrona (más simple, usa el estado actual)
  if (authService.isLoggedIn) { // Usamos el getter síncrono
    console.log('AuthGuard: Usuario logueado, acceso permitido a', state.url);
    return true;
  } else {
      // Redirigir a la página de login
      console.log('AuthGuard: Usuario no logueado, redirigiendo a /dashboard');
      router.navigate(['/dashboard'], { queryParams: { returnUrl: state.url } }); // Opcional: guardar URL de retorno
      return false;
  }

  /*
  // Versión Asíncrona (basada en el Observable, más reactiva si el estado cambia)
  // Necesitarías ajustar el AuthService para que isLoggedIn$ refleje el estado inicial correctamente
  return authService.isLoggedIn$.pipe(
      take(1), // Tomar solo el primer valor emitido para decidir
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