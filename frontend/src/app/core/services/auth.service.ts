import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { ErrorHandlerService } from './errorhandler.service';

// Interfaces para tipado
interface AuthResponse {
  token: string;
  user: UserInfo;
}

interface UserInfo {
  id: string;
  name?: string;
  email: string;
  profileImage?: string; // Añadido campo para imagen de perfil
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
  private http = inject(HttpClient);
  private router = inject(Router);
  private errorHandler = inject(ErrorHandlerService);
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
        catchError(error => this.handleAuthError(error))
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
            email: response.user.email,
            profileImage: response.user.profileImage || undefined
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
      catchError(error => this.handleAuthError(error))
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
    const userMessage = this.errorHandler.getErrorMessage(error);
    return throwError(() => new Error(userMessage));
  }

  private handleAuthError(error: any): Observable<never> {
    const userMessage = this.errorHandler.getAuthErrorMessage(error);
    return throwError(() => new Error(userMessage));
  }

  updateProfile(userData: { name: string; email: string }): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/auth/profile`, userData)
      .pipe(
        tap(response => {
          // Actualizar el usuario en el BehaviorSubject
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

  // Método para actualizar solo la imagen de perfil
  updateProfileImage(imageData: { profileImage: string }): Observable<any> {
  return this.http.put<any>(`${this.apiUrl}/auth/profile-image`, imageData)
    .pipe(
      tap(response => {
        // Actualizar el usuario en el BehaviorSubject
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

  changePassword(passwordData: { currentPassword: string; newPassword: string }): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/auth/password`, passwordData)
      .pipe(
        catchError(error => this.handleError(error))
      );
  }
}