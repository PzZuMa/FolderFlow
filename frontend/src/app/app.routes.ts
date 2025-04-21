import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { DashboardComponent } from './features/dashboard/dashboard.component'; // Asegúrate que exista
import { authGuard } from './core/guards/auth.guard'; // Importa el guard

export const routes: Routes = [
  // Rutas públicas
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },

  // Rutas protegidas
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard] // Aplica el guard aquí
  },
  // Puedes tener más rutas protegidas aquí

  // Redirección por defecto
   { path: '', redirectTo: '/dashboard', pathMatch: 'full' }, // Intenta ir al dashboard por defecto

  // Ruta comodín (página no encontrada) - podría redirigir a login o a una página 404
   { path: '**', redirectTo: '/login' } // O redirige a una página 'NotFoundComponent'
];