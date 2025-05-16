import { Component, Input, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

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
  @Input() isCollapsed: boolean = false;
  
  // Esto añade la clase 'collapsed' al host cuando isCollapsed es true
  @HostBinding('class.collapsed') get collapsed() {
    return this.isCollapsed;
  }
  
  menuItems = [
    { label: 'Inicio', icon: 'home', route: '/home' },
    { label: 'Mis Documentos', icon: 'folder_open', route: '/documents' },
    { label: 'Mis Carpetas', icon: 'folder', route: '/folders' },
    { label: 'Cuenta', icon: 'account_circle', route: '/account' },
  ];
}