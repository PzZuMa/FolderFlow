import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service'; // <<< Asegúrate que la ruta sea correcta
import { environment } from '../../../environments/environment.development'; // <<< Importa environment

export const authTokenInterceptor: HttpInterceptorFn = (
    req: HttpRequest<unknown>,
    next: HttpHandlerFn
  ): Observable<HttpEvent<unknown>> => {

  const authService = inject(AuthService);
  const authToken = authService.getToken();

  // --- Identificar tipos de URL ---
  const isApiUrl = req.url.startsWith(environment.apiUrl); // Petición a nuestra API backend
  // Identifica URLs de S3 (ajusta 'amazonaws.com' si usas un dominio personalizado para S3)
  const isS3Url = req.url.includes('amazonaws.com');
  // --- Fin identificación ---

  // Añadir el token SOLO si:
  // 1. Existe un token.
  // 2. La petición va a nuestra API backend (isApiUrl).
  // 3. La petición NO va a S3 (!isS3Url).
  if (authToken && isApiUrl && !isS3Url) {
    // Clonar y añadir cabecera
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${authToken}`
      }
    });
    // console.log('Interceptor: Añadiendo token a API local:', req.url); // Log específico
    return next(authReq); // Pasa la petición clonada con token
  }

  // Si es una URL de S3, pasa la petición SIN modificar (SIN token)
  if (isS3Url) {
    // console.log('Interceptor: Omitiendo token para URL de S3:', req.url); // Log específico
    return next(req); // Pasa la petición original
  }

  // Si es una petición a nuestra API pero no hay token, o es una URL externa
  // (que no es S3 y no es nuestra API), pasa la petición original.
  // Esto cubre las llamadas a /login y /register si no tienen token,
  // y cualquier otra llamada externa.
  // console.log('Interceptor: Petición sin token o externa (no S3):', req.url); // Log general
  return next(req); // Pasa la petición original
};