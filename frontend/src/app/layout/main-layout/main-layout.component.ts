import { Component } from '@angular/core';
import { RouterModule } from '@angular/router'; // Para router-outlet
import { CommonModule } from '@angular/common'; // Para ngClass
import { HeaderComponent } from '../header/header.component'; // Importa Header
import { SidebarComponent } from '../sidebar/sidebar.component'; // Importa Sidebar

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule, // Necesario para ngClass
    RouterModule,
    HeaderComponent, // Incluye Header
    SidebarComponent // Incluye Sidebar
  ],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss']
})
export class MainLayoutComponent {
  isSidebarCollapsed = false; // Estado inicial del sidebar

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }
}