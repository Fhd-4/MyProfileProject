import { Routes } from '@angular/router';
import { Login } from './login/login.component';
import { Admin } from './admin/admin.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'admin', component: Admin }
];
