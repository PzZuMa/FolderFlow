import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard de rutas que restringe el acceso a rutas protegidas si el usuario no está autenticado.
 * Si el usuario no está logueado, lo redirige al dashboard y guarda la URL de retorno.
 */
export const authGuard: CanActivateFn = (route, state) => {
  // Inyecta el servicio de autenticación y el router
  const authService = inject(AuthService);
  const router = inject(Router);

  // Si el usuario está logueado, permite el acceso a la ruta
  if (authService.isLoggedIn) {
    console.log('AuthGuard: Usuario logueado, acceso permitido a', state.url);
    return true;
  } else {
    // Si no está logueado, redirige al dashboard y guarda la URL de retorno
    console.log('AuthGuard: Usuario no logueado, redirigiendo a /dashboard');
    router.navigate(['/dashboard'], { queryParams: { returnUrl: state.url } });
    return false;
  }
};