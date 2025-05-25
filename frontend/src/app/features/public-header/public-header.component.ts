import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-public-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
  ],
  templateUrl: './public-header.component.html',
  styleUrls: ['./public-header.component.scss']
})
export class PublicHeaderComponent implements OnInit {
  currentPath: string = '';

  constructor(private router: Router, public authService: AuthService) {}

  ngOnInit(): void {
    this.currentPath = this.router.url;
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.currentPath = this.router.url;
    });
  }

  isActive(path: string): boolean {
    return this.currentPath === path;
  }

  onLoginClick(): void {
    if (this.authService.isLoggedIn) {
      this.router.navigate(['/home']);
    } else {
      this.router.navigate(['/login']);
    }
  }

  onRegisterClick(): void {
    if (this.authService.isLoggedIn) {
      this.router.navigate(['/home']);
    } else {
      this.router.navigate(['/register']);
    }
  }
}