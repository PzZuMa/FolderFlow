import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { DashboardComponent } from './features/dashboard/dashboard.component'; // Página pública
import { HomeComponent } from './features/home/home.component';           // Nueva página protegida
import { authGuard } from './core/guards/auth.guard'; // El guard se usará para /home

export const routes: Routes = [
  // Rutas públicas
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'dashboard', component: DashboardComponent }, // Dashboard ahora es público

  // Ruta protegida (nueva)
  {
    path: 'home', // La ruta para usuarios autenticados
    component: HomeComponent,
    canActivate: [authGuard] // Protegida por el guard
  },

  // Redirección por defecto: va al dashboard público
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },

  // Ruta comodín: redirige al dashboard público si la ruta no existe
  { path: '**', redirectTo: '/dashboard' }
  // Alternativa: crear un componente NotFoundComponent y redirigir aquí
  // { path: '**', component: NotFoundComponent }
];