import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment.development';

// Interfaces para tipado (opcional pero recomendado)
interface AuthResponse {
  token: string;
  // Puedes añadir más datos si tu backend los devuelve
}

interface RegisterResponse {
    msg: string;
    userId: string;
    name: string;
    email: string;
}

interface LoginCredentials {
    email: string;
    password: string;
}

interface RegisterData extends LoginCredentials {
    name: string;
}

@Injectable({
  providedIn: 'root' // Disponible en toda la aplicación
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = environment.apiUrl; // Usa la URL del environment

  // Señal para estado de autenticación reactivo (alternativa a BehaviorSubject)
  // private _isLoggedIn = signal<boolean>(this.hasToken());
  // isLoggedIn = this._isLoggedIn.asReadonly(); // Expone la señal como de solo lectura

  // O usando BehaviorSubject si prefieres Observables tradicionales
  private loggedInStatus = new BehaviorSubject<boolean>(this.hasToken());
  isLoggedIn$ = this.loggedInStatus.asObservable(); // Observable para suscribirse

  // Método para obtener el estado actual (útil para guards síncronos)
  public get isLoggedIn(): boolean {
      return this.hasToken();
  }

  private readonly TOKEN_KEY = 'authToken';

  // --- Métodos de API ---

  register(userData: RegisterData): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.apiUrl}/auth/register`, userData)
      .pipe(
        tap(response => console.log('Registro exitoso:', response)), // Opcional: log
        catchError(this.handleError)
      );
  }

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, credentials)
      .pipe(
        tap(response => {
          this.saveToken(response.token);
          // this._isLoggedIn.set(true); // Actualiza la señal
          this.loggedInStatus.next(true); // Actualiza el BehaviorSubject
          console.log('Login exitoso, token guardado');
        }),
        catchError(this.handleError)
      );
  }

  // --- Métodos de Token ---

  saveToken(token: string): void {
    try {
        localStorage.setItem(this.TOKEN_KEY, token);
        // this._isLoggedIn.set(true); // Actualiza la señal si no se hizo en login/tap
         this.loggedInStatus.next(true); // Actualiza el BehaviorSubject
    } catch (e) {
        console.error('Error guardando token en localStorage:', e);
    }

  }

  getToken(): string | null {
     try {
        return localStorage.getItem(this.TOKEN_KEY);
     } catch (e) {
        console.error('Error obteniendo token de localStorage:', e);
        return null;
     }
  }

  removeToken(): void {
     try {
        localStorage.removeItem(this.TOKEN_KEY);
        // this._isLoggedIn.set(false); // Actualiza la señal
        this.loggedInStatus.next(false); // Actualiza el BehaviorSubject
     } catch (e) {
        console.error('Error eliminando token de localStorage:', e);
     }
  }

  // Verifica si existe un token (no valida si es expirado aquí)
  private hasToken(): boolean {
    return !!this.getToken();
  }

  // --- Logout ---

  logout(): void {
    this.removeToken();
    this.router.navigate(['/login']); // Redirige al login
  }

  // --- Manejo de Errores ---
  private handleError(error: any): Observable<never> {
    console.error('Error en la petición HTTP:', error);
    let errorMessage = 'Ocurrió un error desconocido.';
    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente o de red
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // El backend devolvió un código de error
      // El cuerpo del error puede contener pistas (error.error.msg)
      errorMessage = `Error ${error.status}: ${error.error?.msg || error.statusText}`;
    }
    // Devolver un observable con un error user-facing
    return throwError(() => new Error(errorMessage));
  }
}