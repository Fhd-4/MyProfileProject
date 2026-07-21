import { Routes } from '@angular/router';
import { Login } from './login/login.component';
import { AdminPanel } from './admin-panel/admin-panel';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },

  { path: 'admin-panel', component: AdminPanel }
];