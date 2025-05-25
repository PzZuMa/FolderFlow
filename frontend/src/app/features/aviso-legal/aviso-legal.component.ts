import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { FooterComponent } from '../../features/footer/footer.component';
import { PublicHeaderComponent } from '../../features/public-header/public-header.component';

@Component({
  selector: 'app-aviso-legal',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FooterComponent,
    PublicHeaderComponent
  ],
  templateUrl: './aviso-legal.component.html',
  styleUrls: ['./aviso-legal.component.scss']
})
export class AvisoLegalComponent implements OnInit {
  currentYear: number = new Date().getFullYear();

  constructor(private titleService: Title) {
    this.titleService.setTitle('Aviso Legal | FolderFlow');
  }

  ngOnInit(): void {
  }
}