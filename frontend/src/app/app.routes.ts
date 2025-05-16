import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { DashboardComponent } from './features/dashboard/dashboard.component'; // Pública
import { authGuard } from './core/guards/auth.guard';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component'; // <<<--- El Layout Principal
// Importa los componentes de contenido que irán DENTRO del layout
import { HomeComponent } from './layout/home/home.component';
import { DocumentExplorerComponent } from './features/documents/document-explorer/document-explorer.component';
import { FolderExplorerComponent } from './features/folders/folder-explorer/folder-explorer.component';
import { TarifasComponent } from './features/tarifas/tarifas.component'; // Pública
import { ContactoComponent } from './features/contacto/contacto.component';
import { InfoComponent } from './features/info/info.component'; // Pública
import { AvisoLegalComponent } from './features/aviso-legal/aviso-legal.component';
import { PoliticaPrivacidadComponent } from './features/politica-privacidad/politica-privacidad.component';
import { PoliticaCookiesComponent } from './features/politica-cookies/politica-cookies.component';
import { AccountComponent } from './layout/account/account.component'; // Cambia esto por el componente correcto

export const routes: Routes = [
  // Rutas públicas
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'tarifas', component: TarifasComponent },
  { path: 'contacto', component: ContactoComponent },
  { path: 'info', component: InfoComponent }, // <<<--- Ruta pública para la info
  { path: 'aviso-legal', component: AvisoLegalComponent }, // <<<--- Ruta pública para el aviso legal
  { path: 'politica-privacidad', component: PoliticaPrivacidadComponent },
  { path: 'politica-cookies', component: PoliticaCookiesComponent }, // <<<--- Ruta pública para la política de cookies

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
        component: FolderExplorerComponent,
      },
      {
        path: 'account',             // <<<--- Ruta para la configuración -> /settings
        component: AccountComponent // Cambia esto por el componente correcto
      },
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