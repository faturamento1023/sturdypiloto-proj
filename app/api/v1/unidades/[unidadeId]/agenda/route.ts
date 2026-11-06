import { sessaoNoServidor, verificarIdentidade } from '../../../../../auth/sessao';
import { lerGradeAgenda, uuidAgenda } from '../../../../../painel/agenda/leitura';
import { janelaValida } from '../../../../../../src/agenda/tempo';

const problemas = {
  400: ['ENTRADA_INVALIDA', 'Unidade, profissional ou janela inválidos'],
  401: ['SESSAO_INVALIDA', 'Autenticação necessária'],
  403: ['ACESSO_NEGADO', 'Acesso negado'],
  422: ['GRADE_EXCEDIDA', 'Reduza o intervalo ou filtre por profissional'],
  503: ['AGENDA_INDISPONIVEL', 'Agenda temporariamente indisponível'],
} as const;

export async function GET(request: Request, { params }: { params: Promise<{ unidadeId: string }> }) {
  const correlacaoId = crypto.randomUUID();
  const headers = { 'Cache-Control': 'private, no-store', 'X-Correlation-Id': correlacaoId };
  function problema(status: keyof typeof problemas) {
    const [codigo, title] = problemas[status];
    return Response.json({ type: 'about:blank', codigo, title, status, correlacaoId }, {
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
    const consulta = new URL(request.url).searchParams;
    const inicio = consulta.get('inicio') ?? '';
    const fim = consulta.get('fim') ?? '';
    const profissional = consulta.get('profissionalId');
    if (!uuidAgenda.test(unidadeId) || (profissional !== null && !uuidAgenda.test(profissional))
        || !janelaValida(inicio, fim) || [...consulta].some(([chave]) =>
          !['inicio', 'fim', 'profissionalId'].includes(chave) || consulta.getAll(chave).length !== 1)) {
      return problema(400);
    }

    const leitura = await lerGradeAgenda(cliente, unidadeId, profissional, inicio, fim, correlacaoId);
    return leitura.status === 200 ? Response.json(leitura.grade, { headers }) : problema(leitura.status);
  } catch {
    return problema(503);
  }
}
