import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { DashboardComponent } from './features/dashboard/dashboard.component'; // Pública
import { authGuard } from './core/guards/auth.guard';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component'; // <<<--- El Layout Principal
// Importa los componentes de contenido que irán DENTRO del layout
import { HomeComponent } from './features/home/home.component';
import { DocumentExplorerComponent } from './features/documents/document-explorer/document-explorer.component';
import { FolderExplorerComponent } from './features/folders/folder-explorer/folder-explorer.component';

export const routes: Routes = [
  // Rutas públicas
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'dashboard', component: DashboardComponent },

  // --- Sección Protegida usando el Layout ---
  {
    path: '',                       // <<<--- Path base para usuarios logueados
    component: MainLayoutComponent,    // <<<--- Usa el Layout como contenedor
    canActivate: [authGuard],          // <<<--- Protege todo bajo /app
    children: [                        // <<<--- Rutas que se mostrarán en el <router-outlet> del Layout
      {
        path: 'home',                  // <<<--- Ruta para la vista de inicio (3+3 items) -> /home
        component: HomeComponent,
      },
      {
        path: 'documents',             // <<<--- Ruta para el explorador -> /documents
        component: DocumentExplorerComponent,
      },
      {
        path: 'folders',               // <<<--- Ruta para las carpetas -> /folders
        component: FolderExplorerComponent
      },
      // --- Añade aquí otras rutas protegidas ---
      // { path: 'settings', component: SettingsComponent },
      
      // --- Fin otras rutas ---
      {
        path: '', redirectTo: 'home', pathMatch: 'full' // Redirige a /home si ya está autenticado
      }
    ]
  },

  // Redirección por defecto si no estás logueado o vas a '/'
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },

  // Ruta comodín
  { path: '**', redirectTo: '/dashboard' },
];