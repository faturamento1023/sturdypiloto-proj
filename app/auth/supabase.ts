import { createServerClient, type CookieMethodsServer } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { configAuth, nomeCookieSessao } from './config';

type Config = NonNullable<ReturnType<typeof configAuth>>;

export function clienteSessao(config: Config, cookies: CookieMethodsServer) {
  return createServerClient(config.supabase, config.chave, {
    cookies: { ...cookies, encode: 'tokens-only' },
    cookieOptions: {
      name: nomeCookieSessao,
      path: '/',
      sameSite: 'lax',
      secure: config.secure,
      httpOnly: true,
    },
  });
}

export function clienteRecuperacao(config: Config) {
  return createClient(config.supabase, config.chave, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
