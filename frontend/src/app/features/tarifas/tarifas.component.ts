import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { FooterComponent } from "../footer/footer.component";
import { PublicHeaderComponent } from "../public-header/public-header.component";

@Component({
  selector: 'app-tarifas',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FooterComponent,
    PublicHeaderComponent
  ],
  templateUrl: './tarifas.component.html',
  styleUrls: ['./tarifas.component.scss']
})
export class TarifasComponent implements OnInit {
  planes = [
    {
      nombre: 'Básico',
      precio: 0,
      descripcion: 'Ideal para freelancers y pequeños proyectos',
      destacado: false,
      caracteristicas: [
        '5 GB de almacenamiento',
        'Hasta 3 usuarios',
        '100 documentos al mes',
        'Búsqueda básica',
        'Soporte por email'
      ]
    },
    {
      nombre: 'Profesional',
      precio: 29,
      descripcion: 'Para pequeñas empresas en crecimiento',
      destacado: true,
      caracteristicas: [
        '100 GB de almacenamiento',
        'Hasta 15 usuarios',
        'Documentos ilimitados',
        'OCR y búsqueda avanzada',
        'Integración con nube',
        'Firmas digitales',
        'Soporte prioritario'
      ]
    },
    {
      nombre: 'Empresarial',
      precio: 79,
      descripcion: 'Solución completa para grandes equipos',
      destacado: false,
      caracteristicas: [
        'Almacenamiento ilimitado',
        'Usuarios ilimitados',
        'API personalizada',
        'Automatización avanzada',
        'Auditoría y compliance',
        'Flujos de trabajo personalizados',
        'Soporte 24/7 dedicado',
        'Capacitación incluida'
      ]
    }
  ];

  caracteristicasGenerales = [
    {
      icono: '🔒',
      titulo: 'Seguridad garantizada',
      descripcion: 'Cifrado de extremo a extremo y cumplimiento GDPR'
    },
    {
      icono: '🌐',
      titulo: 'Acceso desde cualquier lugar',
      descripcion: 'Trabaja desde cualquier dispositivo con sincronización en tiempo real'
    },
    {
      icono: '🤝',
      titulo: 'Colaboración en equipo',
      descripcion: 'Comparte, comenta y trabaja en tiempo real con tu equipo'
    },
    {
      icono: '📊',
      titulo: 'Análisis detallados',
      descripcion: 'Informes y métricas sobre el uso de documentos'
    }
  ];

  faqs = [
    {
      pregunta: '¿Puedo cambiar de plan en cualquier momento?',
      respuesta: 'Sí, puedes actualizar o cambiar tu plan cuando lo necesites. Los cambios se aplicarán en el próximo ciclo de facturación.'
    },
    {
      pregunta: '¿Qué métodos de pago aceptan?',
      respuesta: 'Aceptamos todas las tarjetas principales (Visa, MasterCard, American Express) y transferencias bancarias para planes empresariales.'
    },
    {
      pregunta: '¿Hay compromiso de permanencia?',
      respuesta: 'No, todos nuestros planes son mensuales sin compromisos. Puedes cancelar en cualquier momento.'
    },
    {
      pregunta: '¿Qué incluye el soporte?',
      respuesta: 'Todos los planes incluyen soporte por email. Los planes Profesional y Empresarial incluyen soporte prioritario y por chat en vivo.'
    }
  ];

  constructor(private titleService: Title) {
    this.titleService.setTitle('Tarifas | FolderFlow');
  }

  ngOnInit(): void {
  }
}