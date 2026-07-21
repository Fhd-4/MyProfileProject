import { Routes } from '@angular/router';
import { Login } from './login/login.component';
import { Dashboard } from './dashboard/dashboard.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'dashboard', component: Dashboard }
];
