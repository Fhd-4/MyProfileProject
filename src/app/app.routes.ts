import { Routes } from '@angular/router';
import { Login } from './login/login.component';
import { AdminPanel } from './admin-panel/admin-panel';
import { Dashboard } from './dashboard/dashboard.component';
import { UserCardComponent } from './user-card/user-card.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },

  // Future component routes
  // { path: 'card', component: CardComponent },
  // { path: 'super-admin', component: SuperAdminComponent },

  { path: 'admin-panel', component: AdminPanel },
  { path: 'dashboard', component: Dashboard },
  { path: 'user-card/:id', component: UserCardComponent }
];