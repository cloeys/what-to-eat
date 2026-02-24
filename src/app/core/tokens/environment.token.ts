import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface AppEnvironment {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export const ENVIRONMENT = new InjectionToken<AppEnvironment>('environment', {
  providedIn: 'root',
  factory: () => environment,
});
