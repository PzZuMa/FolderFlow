import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { FooterComponent } from "../footer/footer.component";
import { PublicHeaderComponent } from "../public-header/public-header.component";

@Component({
  selector: 'app-contacto',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FooterComponent,
    PublicHeaderComponent
],
  templateUrl: './contacto.component.html',
  styleUrls: ['./contacto.component.scss']
})
export class ContactoComponent implements OnInit {
  contactForm!: FormGroup;
  isLoading = false;
  submitted = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  private fb = inject(FormBuilder);
  
  constructor(private titleService: Title) {
    this.titleService.setTitle('Contacto | FolderFlow');
  }

  ngOnInit(): void {
    this.contactForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      subject: ['', [Validators.required]],
      message: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  // Getters para la validación en el template
  get name() { return this.contactForm.get('name'); }
  get email() { return this.contactForm.get('email'); }
  get subject() { return this.contactForm.get('subject'); }
  get message() { return this.contactForm.get('message'); }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = null;
    this.successMessage = null;

    if (this.contactForm.invalid) {
      return;
    }

    this.isLoading = true;
    
    // Simulamos el envío del formulario (en producción, aquí se conectaría con un servicio real)
    setTimeout(() => {
      this.isLoading = false;
      this.successMessage = 'Tu mensaje ha sido enviado correctamente. Nos pondremos en contacto contigo lo antes posible.';
      this.contactForm.reset();
      this.submitted = false;
    }, 1500);
  }
}