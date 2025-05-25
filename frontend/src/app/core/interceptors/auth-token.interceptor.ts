import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment.development';

export const authTokenInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);
  const authToken = authService.getToken();

  const isApiUrl = req.url.startsWith(environment.apiUrl);
  const isS3Url = req.url.includes('amazonaws.com');

  if (authToken && isApiUrl && !isS3Url) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${authToken}`
      }
    });
    return next(authReq);
  }

  if (isS3Url) {
    return next(req);
  }

  return next(req);
};