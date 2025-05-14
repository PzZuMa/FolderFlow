import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { FooterComponent } from "../footer/footer.component";
import { PublicHeaderComponent } from "../public-header/public-header.component";

@Component({
  selector: 'app-info',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FooterComponent,
    PublicHeaderComponent
],
  templateUrl: './info.component.html',
  styleUrls: ['./info.component.scss']
})
export class InfoComponent implements OnInit {
  teamMembers = [
    {
      name: 'Pablo Zumaquero',
      position: 'Fundador y CEO',
      description: 'Desarrollador fullstack con una visión clara: hacer accesible la gestión documental profesional a todas las PYMEs. Tras años trabajando con grandes empresas, identificó la necesidad de soluciones específicas para negocios en crecimiento.',
      image: 'assets/team/founder.jpg'
    },
    {
      name: 'Marina López',
      position: 'CTO',
      description: 'Ingeniera de software con experiencia en implementaciones cloud. Dirige el desarrollo técnico y la arquitectura de FolderFlow, asegurando soluciones escalables y seguras.',
      image: 'assets/team/cto.jpg'
    },
    {
      name: 'Carlos Fernández',
      position: 'Diseño UX/UI',
      description: 'Especialista en experiencia de usuario, enfocado en crear interfaces intuitivas y accesibles que permitan a cualquier empresa gestionar su documentación sin curvas de aprendizaje pronunciadas.',
      image: 'assets/team/designer.jpg'
    },
    {
      name: 'Lucía Martínez',
      position: 'Desarrollo Frontend',
      description: 'Experta en Angular y tecnologías web modernas. Apasionada por crear experiencias de usuario fluidas y componentes reutilizables que mantienen la coherencia visual.',
      image: 'assets/team/frontend.jpg'
    }
  ];

  technologies = [
    { name: 'Angular', description: 'Framework frontend para interfaces dinámicas y responsivas', image: 'assets/tech/angular.png' },
    { name: 'Node.js', description: 'Entorno de ejecución para un backend eficiente', image: 'assets/tech/nodejs.png' },
    { name: 'MongoDB', description: 'Base de datos NoSQL para metadatos flexibles', image: 'assets/tech/mongodb.png' },
    { name: 'AWS S3', description: 'Almacenamiento seguro y escalable en la nube', image: 'assets/tech/aws.png' }
  ];

  constructor(private titleService: Title) {
    this.titleService.setTitle('Quiénes Somos | FolderFlow');
  }

  ngOnInit(): void {
  }
}