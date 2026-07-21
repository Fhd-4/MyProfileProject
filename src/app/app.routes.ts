import { Routes } from '@angular/router';
import { Login } from './login/login.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  // Future component routes to be attached by your teammate:
  // { path: 'card', component: CardComponent },
  // { path: 'super-admin', component: SuperAdminComponent }
];
