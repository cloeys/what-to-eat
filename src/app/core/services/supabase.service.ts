import { inject, Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ENVIRONMENT } from '../tokens/environment.token';
import { Database } from '../types/database.types';

/**
 * Initializes and exposes the Supabase client as a singleton.
 * All other services that need to query the database or use Supabase Auth,
 * Realtime, or Storage should inject this service and use `this.supabase.client`.
 */
@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private readonly env = inject(ENVIRONMENT);

  /**
   * The typed Supabase client instance. Use this to perform all
   * database queries, auth operations, realtime subscriptions, and storage calls.
   */
  readonly client: SupabaseClient<Database> = createClient<Database>(
    this.env.supabaseUrl,
    this.env.supabaseAnonKey,
  );
}
