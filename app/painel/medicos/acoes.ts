'use server';

import { redirect } from 'next/navigation';
import { validarCadastroMedico } from '../../../src/cadastros/validar-cadastro-medico.mjs';
import { sessaoNoServidor, verificarIdentidade } from '../../auth/sessao';

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export async function salvarMedico(unidade: string, profissional: string | null, revisao: number | null, form: FormData) {
  const cliente = await sessaoNoServidor(true);
  if (!cliente) redirect('/entrar?estado=indisponivel');
  const sessao = await verificarIdentidade(cliente);
  if (!sessao) redirect('/entrar');
  if (sessao.aal !== 'aal2') redirect('/verificar-acesso');

  function voltar(estado: string): never {
    redirect('/painel?' + new URLSearchParams({ unidade, modulo: 'medicos', estado }).toString());
  }

  if (!uuid.test(unidade) || (profissional !== null && !uuid.test(profissional))) voltar('invalido');

  const validacao = validarCadastroMedico({
    nome: form.get('nome'),
    numeroConselho: form.get('crm'),
    ufConselho: form.get('uf'),
    especialidade: form.get('especialidade'),
    titulo: form.get('titulo'),
    ativo: form.get('ativo') === 'on',
  }, { permitirSemCrm: profissional !== null });

  if (!validacao.ok || !validacao.valor) return voltar('invalido');
  const dados = validacao.valor;
  const { error } = await cliente.rpc('piloto_salvar_medico', {
    unidade, profissional, revisao_esperada: revisao, nome_medico: dados.nome,
    numero_crm: dados.numeroConselho || null, uf_crm: dados.ufConselho || null,
    area: dados.especialidade, titulo_medico: dados.titulo, ativo_medico: dados.ativo,
    correlacao: crypto.randomUUID(),
  });
  if (error?.code === '42501') redirect('/painel');
  if (error?.code === '23505') voltar('duplicado');
  if (error?.code === '40001') voltar('desatualizado');
  if (error?.code === '22023' || error?.code === '23514') voltar('invalido');
  voltar(error ? 'indisponivel' : 'salvo');
}
