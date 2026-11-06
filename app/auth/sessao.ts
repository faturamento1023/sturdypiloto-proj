import { cookies } from 'next/headers';
import { configAuth } from './config';
import { clienteSessao } from './supabase';

export async function sessaoNoServidor(gravarCookies = false) {
  const config = configAuth();
  if (!config) return null;

  const jar = await cookies();
  return clienteSessao(config, {
    getAll: () => jar.getAll(),
    setAll: itens => {
      if (gravarCookies) {
        for (const { name, value, options } of itens) jar.set(name, value, options);
      }
    },
  });
}
