import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment.development';

// Interfaces para tipado
interface AuthResponse {
  token: string;
  user: UserInfo;
}

interface UserInfo {
  id: string;
  name?: string;
  email: string;
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
  providedIn: 'root'
})
export class AuthService {
  // Eliminar esta línea que causa el problema
  // [x: string]: any;
  
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = environment.apiUrl;

  // BehaviorSubject para el estado de autenticación
  private loggedInStatus = new BehaviorSubject<boolean>(this.hasToken());
  isLoggedIn$ = this.loggedInStatus.asObservable();
  
  // Añadir BehaviorSubject para el usuario actual
  private currentUserSubject = new BehaviorSubject<UserInfo | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  private readonly TOKEN_KEY = 'authToken';
  private readonly USER_KEY = 'currentUser';

  constructor() {
    // Intenta recuperar el usuario del localStorage al inicializar
    this.loadUserFromStorage();
  }

  // Método para cargar el usuario desde localStorage si existe
  private loadUserFromStorage(): void {
    try {
      const userJson = localStorage.getItem(this.USER_KEY);
      if (userJson) {
        const user = JSON.parse(userJson);
        this.currentUserSubject.next(user);
      }
    } catch (e) {
      console.error('Error cargando usuario desde localStorage:', e);
    }
  }

  // Método para guardar el usuario en localStorage
  private saveUserToStorage(user: UserInfo): void {
    try {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    } catch (e) {
      console.error('Error guardando usuario en localStorage:', e);
    }
  }

  // Obtener estado actual de autenticación
  public get isLoggedIn(): boolean {
    return this.hasToken();
  }

  register(userData: RegisterData): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.apiUrl}/auth/register`, userData)
      .pipe(
        tap(response => console.log('Registro exitoso:', response)),
        catchError(this.handleError.bind(this))
      );
  }

  login(credentials: LoginCredentials): Observable<AuthResponse> {
  return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, credentials)
    .pipe(
      tap(response => {
        this.saveToken(response.token);
        
        // Asegurar que guardamos la información del usuario y actualizamos el subject
        if (response.user) {
          // Aseguramos que tenemos todos los campos necesarios
          const user: UserInfo = {
            id: response.user.id,
            name: response.user.name || response.user.email?.split('@')[0] || 'Usuario',
            email: response.user.email
          };
          
          // Actualizar el BehaviorSubject
          this.currentUserSubject.next(user);
          // Guardar en localStorage
          this.saveUserToStorage(user);
          console.log('Usuario guardado:', user);
        }
        
        this.loggedInStatus.next(true);
        console.log('Login exitoso, token y usuario guardados');
      }),
      catchError(this.handleError.bind(this))
    );
}

  saveToken(token: string): void {
    try {
      localStorage.setItem(this.TOKEN_KEY, token);
      this.loggedInStatus.next(true);
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
      localStorage.removeItem(this.USER_KEY);
      this.loggedInStatus.next(false);
      this.currentUserSubject.next(null);
    } catch (e) {
      console.error('Error eliminando token de localStorage:', e);
    }
  }

  private hasToken(): boolean {
    return !!this.getToken();
  }

  logout(): void {
    this.removeToken();
    this.router.navigate(['/login']);
  }

  private handleError(error: any): Observable<never> {
    console.error('Error en la petición HTTP:', error);
    let errorMessage = 'Ocurrió un error desconocido.';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      errorMessage = `Error ${error.status}: ${error.error?.msg || error.statusText}`;
    }
    return throwError(() => new Error(errorMessage));
  }
}