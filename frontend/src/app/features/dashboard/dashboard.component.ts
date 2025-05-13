import { Component, OnInit, HostListener } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  scrolled = false;

  constructor(private titleService: Title) {
    this.titleService.setTitle('FolderFlow - Gestión Documental para PyMES');
  }

  ngOnInit(): void {
    // Aquí podrías cargar datos del servicio si es necesario
  }

  // Opcional: Detectar scroll para cambiar estilo del header
  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.scrolled = window.scrollY > 20;
  }
}