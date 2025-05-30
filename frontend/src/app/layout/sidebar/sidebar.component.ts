import { Component, Input, HostBinding } from '@angular/core';

import { RouterModule } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

// Declaración del componente Sidebar
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    RouterModule,
    MatListModule,
    MatIconModule,
    MatTooltipModule
],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  // Indica si la barra lateral está colapsada (recibe valor desde el padre)
  @Input() isCollapsed: boolean = false;

  // Añade la clase 'collapsed' al host si isCollapsed es true
  @HostBinding('class.collapsed') get collapsed() {
    return this.isCollapsed;
  }

  // Elementos del menú lateral con su icono y ruta
  menuItems = [
    { label: 'Inicio', icon: 'home', route: '/home' },
    { label: 'Mis documentos', icon: 'description', route: '/documents' },
    { label: 'Mis carpetas', icon: 'folder', route: '/folders' },
    { label: 'Cuenta', icon: 'account_circle', route: '/account' },
  ];
}