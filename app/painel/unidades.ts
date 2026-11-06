import { PERFIS, type Perfil } from '../../src/autorizacao/politica';
import type { sessaoNoServidor } from '../auth/sessao';

type Cliente = NonNullable<Awaited<ReturnType<typeof sessaoNoServidor>>>;
export type UnidadePainel = { id: string; nome: string; perfis: Perfil[] };

export async function consultarUnidades(cliente: Cliente): Promise<UnidadePainel[] | null> {
  const { data, error } = await cliente.rpc('piloto_minhas_unidades');
  if (error || !Array.isArray(data)) return null;

  const unidades: UnidadePainel[] = [];
  for (const linha of data) {
    if (typeof linha?.id !== 'string' || typeof linha.nome !== 'string' || !Array.isArray(linha.perfis)) return null;

    const perfis = linha.perfis.flatMap((perfil: unknown) => PERFIS.filter(valor => valor === perfil));
    if (perfis.length === 0 || perfis.length !== linha.perfis.length) return null;

    unidades.push({ id: linha.id, nome: linha.nome, perfis });
  }
  return unidades;
}
