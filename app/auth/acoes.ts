'use server';

import { redirect } from 'next/navigation';
import { configAuth } from './config';
import { sessaoNoServidor } from './sessao';
import { clienteRecuperacao } from './supabase';

function texto(form: FormData, nome: string) {
  const valor = form.get(nome);
  return typeof valor === 'string' ? valor : '';
}

function emailDoFormulario(form: FormData) {
  const email = texto(form, 'email').trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export async function entrar(form: FormData) {
  const email = emailDoFormulario(form);
  const senha = texto(form, 'senha');
  if (!email || !senha || senha.length > 1024) redirect('/entrar?estado=invalido');

  const cliente = await sessaoNoServidor(true);
  if (!cliente) redirect('/entrar?estado=indisponivel');

  const { error, data } = await cliente.auth.signInWithPassword({ email, password: senha });
  if (error || !data.session) redirect('/entrar?estado=invalido');
  redirect('/conta');
}

export async function pedirRecuperacao(form: FormData) {
  const email = emailDoFormulario(form);
  if (!email) redirect('/recuperar-acesso?estado=invalido');

  const config = configAuth();
  if (!config) redirect('/recuperar-acesso?estado=indisponivel');

  // A resposta da interface é igual para endereços cadastrados e desconhecidos.
  await clienteRecuperacao(config).auth.resetPasswordForEmail(email, {
    redirectTo: config.origem + '/redefinir-senha',
  });
  redirect('/redefinir-senha');
}

export async function redefinirSenha(form: FormData) {
  const email = emailDoFormulario(form);
  const token = texto(form, 'codigo').trim();
  const senha = texto(form, 'senha');

  if (!email || !/^\d{6,10}$/.test(token)) redirect('/redefinir-senha?estado=codigo');
  if ([...senha].length < 12 || Buffer.byteLength(senha, 'utf8') > 72 || senha !== texto(form, 'confirmacao')) {
    redirect('/redefinir-senha?estado=senha');
  }

  const config = configAuth();
  if (!config) redirect('/redefinir-senha?estado=indisponivel');

  // A sessão emitida para a recuperação vive só nesta requisição e nunca vai para cookies.
  const cliente = clienteRecuperacao(config);
  const verificacao = await cliente.auth.verifyOtp({ email, token, type: 'recovery' });
  if (verificacao.error || !verificacao.data.session) redirect('/redefinir-senha?estado=codigo');

  const fatores = await cliente.auth.mfa.listFactors();
  if (fatores.error) {
    await cliente.auth.signOut({ scope: 'local' });
    redirect('/redefinir-senha?estado=recusada');
  }

  if (fatores.data.all.some(fator => fator.status === 'verified')) {
    const codigoMfa = texto(form, 'codigoMfa').trim();
    let confirmado = false;
    if (/^\d{6}$/.test(codigoMfa)) {
      for (const fator of fatores.data.totp) {
        const desafio = await cliente.auth.mfa.challengeAndVerify({ factorId: fator.id, code: codigoMfa });
        if (!desafio.error) {
          confirmado = true;
          break;
        }
      }
    }
    if (!confirmado) {
      await cliente.auth.signOut({ scope: 'local' });
      redirect('/redefinir-senha?estado=autenticador');
    }
  }

  const alteracao = await cliente.auth.updateUser({ password: senha });
  const revogacao = await cliente.auth.signOut({ scope: alteracao.error ? 'local' : 'global' });
  if (alteracao.error) redirect('/redefinir-senha?estado=recusada');

  redirect(revogacao.error ? '/entrar?estado=revogacao' : '/entrar?estado=redefinida');
}

export async function sair() {
  const cliente = await sessaoNoServidor(true);
  const resultado = await cliente?.auth.signOut({ scope: 'local' });
  if (resultado?.error) redirect('/conta?estado=saida');
  redirect('/entrar');
}
