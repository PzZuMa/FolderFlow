import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { ErrorHandlerService } from './errorhandler.service';

// Interfaces para tipado de respuestas y datos de usuario
interface AuthResponse {
  token: string;
  user: UserInfo;
}

interface UserInfo {
  id: string;
  name?: string;
  email: string;
  profileImage?: string;
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

/**
 * Servicio de autenticación: login, registro, gestión de sesión y perfil de usuario.
 * Maneja el almacenamiento seguro del token y la información del usuario.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private errorHandler = inject(ErrorHandlerService);
  private apiUrl = environment.apiUrl;

  // Estado reactivo de login (BehaviorSubject para emitir cambios)
  private loggedInStatus = new BehaviorSubject<boolean>(this.hasToken());
  isLoggedIn$ = this.loggedInStatus.asObservable();

  // Estado reactivo del usuario actual
  private currentUserSubject = new BehaviorSubject<UserInfo | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  // Claves para localStorage
  private readonly TOKEN_KEY = 'authToken';
  private readonly USER_KEY = 'currentUser';

  constructor() {
    this.loadUserFromStorage();
  }

  /**
   * Carga el usuario actual desde localStorage al iniciar el servicio.
   */
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

  /**
   * Guarda el usuario actual en localStorage.
   */
  private saveUserToStorage(user: UserInfo): void {
    try {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    } catch (e) {
      console.error('Error guardando usuario en localStorage:', e);
    }
  }

  /**
   * Devuelve si el usuario está logueado (token presente).
   */
  public get isLoggedIn(): boolean {
    return this.hasToken();
  }

  /**
   * Registra un nuevo usuario.
   */
  register(userData: RegisterData): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.apiUrl}/auth/register`, userData)
      .pipe(
        tap(response => console.log('Registro exitoso:', response)),
        catchError(error => this.handleAuthError(error))
      );
  }

  /**
   * Realiza login y guarda el token y usuario en localStorage.
   */
  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, credentials)
      .pipe(
        tap(response => {
          this.saveToken(response.token);

          if (response.user) {
            const user: UserInfo = {
              id: response.user.id,
              name: response.user.name || response.user.email?.split('@')[0] || 'Usuario',
              email: response.user.email,
              profileImage: response.user.profileImage || undefined
            };
            this.currentUserSubject.next(user);
            this.saveUserToStorage(user);
            console.log('Usuario guardado:', user);
          }

          this.loggedInStatus.next(true);
          console.log('Login exitoso, token y usuario guardados');
        }),
        catchError(error => this.handleAuthError(error))
      );
  }

  /**
   * Guarda el token JWT en localStorage y actualiza el estado de login.
   */
  saveToken(token: string): void {
    try {
      localStorage.setItem(this.TOKEN_KEY, token);
      this.loggedInStatus.next(true);
    } catch (e) {
      console.error('Error guardando token en localStorage:', e);
    }
  }

  /**
   * Obtiene el token JWT almacenado.
   */
  getToken(): string | null {
    try {
      return localStorage.getItem(this.TOKEN_KEY);
    } catch (e) {
      console.error('Error obteniendo token de localStorage:', e);
      return null;
    }
  }

  /**
   * Elimina el token y la información del usuario de localStorage y actualiza el estado.
   */
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

  /**
   * Comprueba si hay token almacenado.
   */
  private hasToken(): boolean {
    return !!this.getToken();
  }

  /**
   * Cierra la sesión, elimina datos y redirige al login.
   */
  logout(): void {
    this.removeToken();
    this.router.navigate(['/login']);
  }

  /**
   * Maneja errores generales y los transforma en mensajes amigables.
   */
  private handleError(error: any): Observable<never> {
    const userMessage = this.errorHandler.getErrorMessage(error);
    return throwError(() => new Error(userMessage));
  }

  /**
   * Maneja errores de autenticación y los transforma en mensajes amigables.
   */
  private handleAuthError(error: any): Observable<never> {
    const userMessage = this.errorHandler.getAuthErrorMessage(error);
    return throwError(() => new Error(userMessage));
  }

  /**
   * Actualiza el perfil del usuario (nombre y email).
   */
  updateProfile(userData: { name: string; email: string }): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/auth/profile`, userData)
      .pipe(
        tap(response => {
          const currentUser = this.currentUserSubject.value;
          if (currentUser) {
            const updatedUser = {
              ...currentUser,
              name: userData.name,
              email: userData.email
            };
            this.currentUserSubject.next(updatedUser);
            this.saveUserToStorage(updatedUser);
          }
        }),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * Actualiza la imagen de perfil del usuario.
   */
  updateProfileImage(imageData: { profileImage: string }): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/auth/profile-image`, imageData)
      .pipe(
        tap(response => {
          const currentUser = this.currentUserSubject.value;
          if (currentUser && response.profileImage) {
            const updatedUser = {
              ...currentUser,
              profileImage: response.profileImage
            };
            this.currentUserSubject.next(updatedUser);
            this.saveUserToStorage(updatedUser);
          }
        }),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * Cambia la contraseña del usuario.
   */
  changePassword(passwordData: { currentPassword: string; newPassword: string }): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/auth/password`, passwordData)
      .pipe(
        catchError(error => this.handleError(error))
      );
  }
}