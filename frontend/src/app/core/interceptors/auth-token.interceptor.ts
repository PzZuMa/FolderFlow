import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authTokenInterceptor: HttpInterceptorFn = (
    req: HttpRequest<unknown>,
    next: HttpHandlerFn
  ): Observable<HttpEvent<unknown>> => {

  const authService = inject(AuthService);
  const authToken = authService.getToken();

  // Clona la petición y añade la cabecera Authorization si existe token
  if (authToken) {
    // No añadir token a las peticiones de login/registro (opcional, pero buena práctica)
    if (req.url.includes('/api/auth/login') || req.url.includes('/api/auth/register')) {
        return next(req);
    }

    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${authToken}`
      }
      // Alternativa si usas 'headers: req.headers.set(...)'
      // headers: req.headers.set('Authorization', `Bearer ${authToken}`)
    });
    // console.log('Interceptor: Añadiendo token Bearer'); // Debug
    return next(authReq); // Pasa la petición clonada
  }

  // Si no hay token, pasa la petición original
  // console.log('Interceptor: No hay token, pasando petición original'); // Debug
  return next(req);
};