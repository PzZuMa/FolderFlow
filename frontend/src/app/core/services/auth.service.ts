import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { ErrorHandlerService } from './errorhandler.service';

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

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private errorHandler = inject(ErrorHandlerService);
  private apiUrl = environment.apiUrl;

  private loggedInStatus = new BehaviorSubject<boolean>(this.hasToken());
  isLoggedIn$ = this.loggedInStatus.asObservable();

  private currentUserSubject = new BehaviorSubject<UserInfo | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  private readonly TOKEN_KEY = 'authToken';
  private readonly USER_KEY = 'currentUser';

  constructor() {
    this.loadUserFromStorage();
  }

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

  private saveUserToStorage(user: UserInfo): void {
    try {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    } catch (e) {
      console.error('Error guardando usuario en localStorage:', e);
    }
  }

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

  changePassword(passwordData: { currentPassword: string; newPassword: string }): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/auth/password`, passwordData)
      .pipe(
        catchError(error => this.handleError(error))
      );
  }
}