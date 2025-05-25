import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { authGuard } from './core/guards/auth.guard';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { HomeComponent } from './layout/home/home.component';
import { DocumentExplorerComponent } from './features/documents/document-explorer/document-explorer.component';
import { FolderExplorerComponent } from './features/folders/folder-explorer/folder-explorer.component';
import { TarifasComponent } from './features/tarifas/tarifas.component';
import { ContactoComponent } from './features/contacto/contacto.component';
import { InfoComponent } from './features/info/info.component';
import { AvisoLegalComponent } from './features/aviso-legal/aviso-legal.component';
import { PoliticaPrivacidadComponent } from './features/politica-privacidad/politica-privacidad.component';
import { PoliticaCookiesComponent } from './features/politica-cookies/politica-cookies.component';
import { AccountComponent } from './layout/account/account.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'tarifas', component: TarifasComponent },
  { path: 'contacto', component: ContactoComponent },
  { path: 'info', component: InfoComponent },
  { path: 'aviso-legal', component: AvisoLegalComponent },
  { path: 'politica-privacidad', component: PoliticaPrivacidadComponent },
  { path: 'politica-cookies', component: PoliticaCookiesComponent },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'home',
        component: HomeComponent,
        title: 'Inicio | FolderFlow',
      },
      {
        path: 'documents',
        component: DocumentExplorerComponent,
        title: 'Mis documentos | FolderFlow',
      },
      {
        path: 'folders',
        component: FolderExplorerComponent,
        title: 'Mis carpetas | FolderFlow',
      },
      {
        path: 'account',
        component: AccountComponent,
        title: 'Cuenta | FolderFlow',
      },
      {
        path: 'documents/view/:id',
        loadComponent: () => import('./features/documents/document-viewer/document-viewer.component')
          .then(c => c.DocumentViewerComponent)
      },
      {
        path: '', redirectTo: 'home', pathMatch: 'full'
      }
    ]
  },
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: '/dashboard' },
];