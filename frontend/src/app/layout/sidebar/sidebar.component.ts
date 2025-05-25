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

  @HostBinding('class.collapsed') get collapsed() {
    return this.isCollapsed;
  }

  menuItems = [
    { label: 'Inicio', icon: 'home', route: '/home' },
    { label: 'Mis documentos', icon: 'description', route: '/documents' },
    { label: 'Mis carpetas', icon: 'folder', route: '/folders' },
    { label: 'Cuenta', icon: 'account_circle', route: '/account' },
  ];
}