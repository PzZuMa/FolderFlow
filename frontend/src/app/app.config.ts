import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http'; // Importa withInterceptors
import { provideAnimations } from '@angular/platform-browser/animations'; // Para Angular Material

import { routes } from './app.routes';
import { authTokenInterceptor } from './core/interceptors/auth-token.interceptor'; // Importa tu interceptor

// Importa los módulos de Angular Material que necesites globalmente o en componentes standalone
// import { MatSnackBarModule } from '@angular/material/snack-bar';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes), // Configura las rutas
    provideAnimations(), // Necesario para Angular Material
    provideHttpClient( // Configura HttpClient
      withInterceptors([authTokenInterceptor]) // Registra el interceptor aquí
    ),
    // Otros providers globales si los necesitas
    // importProvidersFrom(MatSnackBarModule) // Ejemplo si usas Snackbar globalmente
  ]
};