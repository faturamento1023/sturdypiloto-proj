'use server';

import { redirect } from 'next/navigation';
import { sessaoNoServidor } from './sessao';

export type InscricaoMfa = {
  id: string;
  segredo: string;
  qr: string;
} | { erro: string } | null;

export async function cadastrarFator(): Promise<InscricaoMfa> {
  const cliente = await sessaoNoServidor(true);
  if (!cliente) redirect('/entrar?estado=indisponivel');

  const { data: { user } } = await cliente.auth.getUser();
  if (!user || user.is_anonymous) redirect('/entrar');

  const fatores = user.factors ?? [];
  if (fatores.some(fator => fator.status === 'verified')) redirect('/verificar-acesso');

  for (const fator of fatores.filter(fator => fator.factor_type === 'totp')) {
    const { error } = await cliente.auth.mfa.unenroll({ factorId: fator.id });
    if (error) return { erro: 'Não foi possível reiniciar a configuração do autenticador.' };
  }

  const { data, error } = await cliente.auth.mfa.enroll({ factorType: 'totp', issuer: 'Clínica DM' });
  if (error || !data) return { erro: 'Não foi possível configurar o autenticador. Tente novamente.' };

  const prefixo = 'data:image/svg+xml;utf-8,';
  const qr = data.totp.qr_code;
  return {
    id: data.id,
    segredo: data.totp.secret,
    qr: qr.startsWith(prefixo) ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(qr.slice(prefixo.length)) : '',
  };
}

export async function verificarFator(_: string | null, form: FormData): Promise<string | null> {
  const id = form.get('fator');
  const codigo = form.get('codigo');
  if (typeof id !== 'string' || typeof codigo !== 'string' || !/^\d{6}$/.test(codigo)) {
    return 'Informe o código de seis dígitos do autenticador.';
  }

  const cliente = await sessaoNoServidor(true);
  if (!cliente) redirect('/entrar?estado=indisponivel');

  const { data: { user } } = await cliente.auth.getUser();
  if (!user || user.is_anonymous) redirect('/entrar');

  const fatores = user.factors ?? [];
  const fator = fatores.find(item => item.id === id && item.factor_type === 'totp');
  if (!fator || (fator.status !== 'verified' && fatores.some(item => item.status === 'verified'))) {
    return 'Selecione um autenticador válido.';
  }

  const { error } = await cliente.auth.mfa.challengeAndVerify({ factorId: fator.id, code: codigo });
  if (error) return 'O código do autenticador está incorreto ou expirou.';

  redirect('/conta');
}
