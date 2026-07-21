import { Routes } from '@angular/router';
import { Login } from './login/login.component';
import { AdminPanel } from './admin-panel/admin-panel';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
import { Routes } from '@angular/router';
import { Login } from './login/login.component';
import { AdminPanel } from './admin-panel/admin-panel';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },

  // Future component routes
  // { path: 'card', component: CardComponent },
  // { path: 'super-admin', component: SuperAdminComponent },

  { path: 'admin-panel', component: AdminPanel }
];
