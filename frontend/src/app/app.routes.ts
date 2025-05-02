// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { DashboardComponent } from './features/dashboard/dashboard.component'; // Pública
import { authGuard } from './core/guards/auth.guard';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component'; // <<<--- El Layout Principal
// Importa los componentes de contenido que irán DENTRO del layout
import { HomeComponent } from './features/home/home.component'; // <<<--- Para el contenido 3+3
import { DocumentExplorerComponent } from './features/documents/document-explorer/document-explorer.component';

export const routes: Routes = [
  // Rutas públicas
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'dashboard', component: DashboardComponent },

  // --- Sección Protegida usando el Layout ---
  {
    path: 'app',                       // <<<--- Path base para usuarios logueados
    component: MainLayoutComponent,    // <<<--- Usa el Layout como contenedor
    canActivate: [authGuard],          // <<<--- Protege todo bajo /app
    children: [                        // <<<--- Rutas que se mostrarán en el <router-outlet> del Layout
      {
        path: 'home',                  // <<<--- Ruta para la vista de inicio (3+3 items) -> /app/home
        component: HomeComponent, // <<<--- Componente específico para esa vista
      },
      {
        path: 'documents',             // <<<--- Ruta para el explorador -> /app/documents
        component: DocumentExplorerComponent,
      },
      // --- Añade aquí otras rutas protegidas ---
      // { path: 'settings', component: SettingsComponent },
      // --- Fin otras rutas ---
      {
        path: '', redirectTo: 'home', pathMatch: 'full' // Redirige /app a /app/home por defecto
      }
    ]
  },

  // Redirección por defecto si no estás logueado o vas a '/'
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },

  // Ruta comodín
  { path: '**', redirectTo: '/dashboard' },
];