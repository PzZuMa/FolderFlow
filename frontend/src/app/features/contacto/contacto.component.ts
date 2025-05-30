import { Component, OnInit, inject } from '@angular/core';

import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { FooterComponent } from "../footer/footer.component";
import { PublicHeaderComponent } from "../public-header/public-header.component";
import { ErrorHandlerService } from '../../../app/core/services/errorhandler.service';

/**
 * Componente de contacto para que los usuarios puedan enviar mensajes al equipo de soporte.
 * Incluye validación de formulario y feedback visual de envío.
 */
@Component({
  selector: 'app-contacto',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FooterComponent,
    PublicHeaderComponent
],
  templateUrl: './contacto.component.html',
  styleUrls: ['./contacto.component.scss']
})
export class ContactoComponent implements OnInit {
  // Formulario reactivo de contacto
  contactForm!: FormGroup;
  // Estado de carga para mostrar spinner o deshabilitar el botón
  isLoading = false;
  // Indica si el formulario fue enviado
  submitted = false;
  // Mensaje de éxito tras el envío
  successMessage: string | null = null;
  // Mensaje de error si ocurre algún fallo
  errorMessage: string | null = null;

  // Inyección de dependencias para formularios y manejo de errores
  private fb = inject(FormBuilder);
  private errorHandler = inject(ErrorHandlerService);

  constructor(private titleService: Title) {
    // Establece el título de la página
    this.titleService.setTitle('Contacto | FolderFlow');
  }

  ngOnInit(): void {
    // Inicializa el formulario con validaciones
    this.contactForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      subject: ['', [Validators.required]],
      message: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  // Getters para facilitar el acceso a los controles del formulario en la plantilla
  get name() { return this.contactForm.get('name'); }
  get email() { return this.contactForm.get('email'); }
  get subject() { return this.contactForm.get('subject'); }
  get message() { return this.contactForm.get('message'); }

  /**
   * Envía el formulario de contacto.
   * Simula el envío y muestra un mensaje de éxito tras 2 segundos.
   */
  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = null;
    this.successMessage = null;

    if (this.contactForm.invalid) {
      return;
    }

    this.isLoading = true;

    // Simulación de envío (reemplazar por integración real con backend si aplica)
    setTimeout(() => {
      this.isLoading = false;
      this.successMessage = 'Tu mensaje ha sido enviado correctamente. Nos pondremos en contacto contigo pronto.';
      this.contactForm.reset();
    }, 2000);
  }
}