import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CreateClient } from '../models/create-client';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-panel.html',
  styleUrl: './admin-panel.scss',
})
export class AdminPanel {

  client: CreateClient = {
    clientName: '',
    email: '',
    password: '',
    duration: 1,
    unit: 'Day'
  };

  createClient() {
    console.log(this.client);
  }

}