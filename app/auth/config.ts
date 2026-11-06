export const nomeCookieSessao = 'dm-piloto-sessao';

function enderecoSeguro(valor: string | undefined) {
  if (!valor) return null;

  try {
    const url = new URL(valor);
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    const seguro = url.protocol === 'https:' || (loopback && url.protocol === 'http:');
    return seguro && !url.username && !url.password && url.href === url.origin + '/' ? url : null;
  } catch {
    return null;
  }
}

export function configAuth() {
  const supabase = enderecoSeguro(process.env.SUPABASE_URL);
  const origem = enderecoSeguro(process.env.PILOTO_ORIGEM);
  const chave = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!supabase || !origem || !chave?.startsWith('sb_publishable_')) return null;

  return { supabase: supabase.origin, origem: origem.origin, chave, secure: origem.protocol === 'https:' };
}
