import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router'; // Para routerLink y routerLinkActive
import { MatSidenavModule } from '@angular/material/sidenav'; // Usaremos conceptos, no necesariamente el componente
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip'; // Útil para iconos colapsados

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatListModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  @Input() isCollapsed: boolean = false; // Recibe el estado del padre (MainLayout)

  // Define tus items de menú
  menuItems = [
    { label: 'Inicio', icon: 'home', route: '/app/home' },
    { label: 'Mis Documentos', icon: 'folder_open', route: '/app/documents' },
    { label: 'Mis Carpetas', icon: 'folder', route: '/app/folders' },
    // { label: 'Compartidos', icon: 'people', route: '/app/shared' }, // Ejemplo
    // { label: 'Papelera', icon: 'delete', route: '/app/trash' }, // Ejemplo
    // { label: 'Ajustes', icon: 'settings', route: '/app/settings' }, // Ejemplo
  ];
}