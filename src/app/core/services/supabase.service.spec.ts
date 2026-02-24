import { TestBed } from '@angular/core/testing';
import { ENVIRONMENT } from '../tokens/environment.token';
import { SupabaseService } from './supabase.service';

const testEnvironment = {
  supabaseUrl: 'https://test.supabase.co',
  supabaseAnonKey: 'test-anon-key',
};

describe('SupabaseService', () => {
  let service: SupabaseService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: ENVIRONMENT, useValue: testEnvironment }],
    });
    service = TestBed.inject(SupabaseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should expose a Supabase client', () => {
    expect(service.client).toBeTruthy();
  });
});
