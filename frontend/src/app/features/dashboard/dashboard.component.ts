import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { PublicHeaderComponent } from '../public-header/public-header.component';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    PublicHeaderComponent
],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  scrolled = false;

  constructor(
    private titleService: Title,
    private router: Router,
    private authService: AuthService
  ) {
    this.titleService.setTitle('FolderFlow - Gestión Documental para PyMES');
  }

  ngOnInit(): void {
  }

  onRegisterClick(): void {
    if (this.authService.isLoggedIn) {
      this.router.navigate(['/home']);
    } else {
      this.router.navigate(['/register']);
    }
  }
}