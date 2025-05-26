import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment.development';

/**
 * Interceptor que añade el token de autenticación Bearer a las peticiones HTTP dirigidas a la API.
 * No añade el token a las peticiones dirigidas a Amazon S3.
 */
export const authTokenInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  // Inyecta el servicio de autenticación para obtener el token actual
  const authService = inject(AuthService);
  const authToken = authService.getToken();

  // Determina si la URL es de la API propia
  const isApiUrl = req.url.startsWith(environment.apiUrl);
  // Determina si la URL es de Amazon S3
  const isS3Url = req.url.includes('amazonaws.com');

  // Si existe token, la petición es a la API y no es a S3, añade el header Authorization
  if (authToken && isApiUrl && !isS3Url) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${authToken}`
      }
    });
    // Continúa la cadena de interceptores con la petición modificada
    return next(authReq);
  }

  // Si la petición es a S3, no modifica la petición
  if (isS3Url) {
    return next(req);
  }

  // Para cualquier otro caso, continúa sin modificar la petición
  return next(req);
};