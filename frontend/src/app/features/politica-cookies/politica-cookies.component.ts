import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { FooterComponent } from '../footer/footer.component';
import { PublicHeaderComponent } from '../public-header/public-header.component';

@Component({
  selector: 'app-politica-cookies',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FooterComponent,
    PublicHeaderComponent
  ],
  templateUrl: './politica-cookies.component.html',
  styleUrls: ['./politica-cookies.component.scss']
})
export class PoliticaCookiesComponent implements OnInit {
  currentYear: number = new Date().getFullYear();
  
  constructor(private titleService: Title) {
    this.titleService.setTitle('Política de Cookies | FolderFlow');
  }

  ngOnInit(): void {
  }
}