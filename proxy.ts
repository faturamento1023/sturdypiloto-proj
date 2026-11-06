import { NextResponse, type NextRequest } from 'next/server';
import { configAuth, nomeCookieSessao } from './app/auth/config';
import { clienteSessao } from './app/auth/supabase';

export async function proxy(request: NextRequest) {
  let resposta = NextResponse.next({ request });
  const config = configAuth();
  const temCookie = request.cookies.getAll().some(({ name }) =>
    name === nomeCookieSessao || name.startsWith(nomeCookieSessao + '.'),
  );

  if (config && temCookie) {
    const cliente = clienteSessao(config, {
      getAll: () => request.cookies.getAll(),
      setAll: (itens, headers) => {
        for (const { name, value } of itens) request.cookies.set(name, value);

        const anterior = resposta;
        resposta = NextResponse.next({ request });
        for (const cookie of anterior.cookies.getAll()) resposta.cookies.set(cookie);
        for (const { name, value, options } of itens) resposta.cookies.set(name, value, options);
        for (const [nome, valor] of Object.entries(headers)) resposta.headers.set(nome, valor);
      },
    });
    await cliente.auth.getClaims();
  }

  resposta.headers.set('Cache-Control', 'private, no-store');
  return resposta;
}

export const config = { matcher: ['/conta/:path*', '/verificar-acesso', '/painel', '/convite'] };
