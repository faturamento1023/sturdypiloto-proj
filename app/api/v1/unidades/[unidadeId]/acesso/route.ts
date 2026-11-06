import { sessaoNoServidor, verificarIdentidade } from '../../../../../auth/sessao';
import { PERFIS, type Perfil } from '../../../../../../src/autorizacao/politica';

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const problemas = {
  400: { codigo: 'ENTRADA_INVALIDA', title: 'Entrada inválida' },
  401: { codigo: 'SESSAO_INVALIDA', title: 'Autenticação necessária' },
  403: { codigo: 'ACESSO_NEGADO', title: 'Acesso negado' },
  503: { codigo: 'AUTORIZACAO_INDISPONIVEL', title: 'Autorização temporariamente indisponível' },
} as const;

export async function GET(_request: Request, { params }: { params: Promise<{ unidadeId: string }> }) {
  const correlacaoId = crypto.randomUUID();
  const headers = { 'Cache-Control': 'private, no-store', 'X-Correlation-Id': correlacaoId };
  function problema(status: keyof typeof problemas) {
    return Response.json({ type: 'about:blank', ...problemas[status], status, correlacaoId }, {
      status, headers: { ...headers, 'Content-Type': 'application/problem+json' },
    });
  }

  try {
    const cliente = await sessaoNoServidor(true);
    if (!cliente) return problema(503);

    const sessao = await verificarIdentidade(cliente);
    if (!sessao) return problema(401);
    if (sessao.aal !== 'aal2') return problema(403);

    const { unidadeId } = await params;
    if (!uuid.test(unidadeId)) return problema(400);

    // O RPC usa o JWT desta sessão e consulta os vínculos atuais, sem receber um ID de usuário.
    const { data, error } = await cliente.rpc('piloto_meus_perfis', { unidade: unidadeId });
    if (error || !Array.isArray(data)) return problema(503);

    const perfis: Perfil[] = [];
    for (const linha of data) {
      const perfil = PERFIS.find(item => item === linha?.perfil);
      if (!perfil) return problema(503);
      perfis.push(perfil);
    }
    if (perfis.length === 0) return problema(403);

    return Response.json({ unidadeId: unidadeId.toLowerCase(), perfis }, { headers });
  } catch {
    return problema(503);
  }
}
