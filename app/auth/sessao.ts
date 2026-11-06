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

export async function verificarIdentidade(cliente: NonNullable<Awaited<ReturnType<typeof sessaoNoServidor>>>) {
  const { data, error } = await cliente.auth.getUser();
  const usuario = data.user;
  if (error || !usuario || usuario.is_anonymous) return null;

  const { data: identidade } = await cliente.auth.getClaims();
  const temAutenticador = usuario.factors?.some(fator => fator.status === 'verified' && fator.factor_type === 'totp');
  const aal = temAutenticador && identidade?.claims.sub === usuario.id && identidade.claims.aal === 'aal2'
    ? 'aal2' : 'aal1';
  return { usuario, aal };
}
