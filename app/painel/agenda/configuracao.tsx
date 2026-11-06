import Link from 'next/link';
import { dataAgenda } from '../../../src/agenda/tempo';
import type { sessaoNoServidor } from '../../auth/sessao';
import { salvarConfiguracaoAgenda } from './acoes';

const dias = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];
const mensagens = {
  salvo: 'Cadastro salvo.',
  encerrado: 'Disponibilidade encerrada a partir da data informada.',
  duplicado: 'Já existe um local com esse nome nesta unidade.',
  conflito: 'O horário se sobrepõe à disponibilidade deste profissional ou local.',
  invalido: 'Confira o profissional, o local, os horários e a data de vigência.',
  indisponivel: 'O cadastro está temporariamente indisponível.',
};

type Local = { id: string; nome: string };
type Profissional = Local & { ativo: boolean };
type Regra = {
  id: string; profissional_id: string; local_id: string; dia_semana: number;
  inicio_minuto: number; fim_minuto: number; desde: string; ate: string | null;
};
const hora = (minutos: number) => [Math.floor(minutos / 60), minutos % 60].map(n => String(n).padStart(2, '0')).join(':');
const dataBR = (data: string) => data.split('-').reverse().join('/');

export async function ConfiguracaoAgenda({ cliente, unidade, estado }: {
  cliente: NonNullable<Awaited<ReturnType<typeof sessaoNoServidor>>>; unidade: string; estado: string;
}) {
  const { data, error } = await cliente.rpc('piloto_config_agenda', { unidade });
  if (error || !data) return <p className="painel-aviso" role="alert">Configuração de agenda indisponível.</p>;

  const { locais, profissionais, regras } = data as { locais: Local[]; profissionais: Profissional[]; regras: Regra[] };
  const ativos = profissionais.filter(p => p.ativo);
  const nomesLocais = new Map(locais.map(l => [l.id, l.nome]));
  const nomesProfissionais = new Map(profissionais.map(p => [p.id, p.nome]));
  const hoje = dataAgenda(new Date());
  const aviso = Object.hasOwn(mensagens, estado) ? mensagens[estado as keyof typeof mensagens] : null;
  return (
    <section className="painel-modulos" aria-labelledby="agenda-config-titulo">
      <header className="agenda-cabecalho">
        <h2 id="agenda-config-titulo">Disponibilidade regular</h2>
        <Link href={'/painel?' + new URLSearchParams({ unidade, modulo: 'agenda' })} prefetch={false}>Voltar à grade</Link>
      </header>
      <p>Cadastre a sala e defina um horário semanal a partir da data de vigência. Para mudar um horário, encerre a regra e cadastre a substituta.</p>
      {aviso && <p className="painel-aviso" role={estado === 'salvo' || estado === 'encerrado' ? 'status' : 'alert'}>{aviso}</p>}
      <section className="agenda-profissional" aria-labelledby="agenda-locais-titulo">
        <h3 id="agenda-locais-titulo">Locais de atendimento</h3>
        {locais.length > 0 && <p>{locais.map(l => l.nome).join(' · ')}</p>}
        <form action={salvarConfiguracaoAgenda.bind(null, unidade, 'local')} className="agenda-formulario">
          <label>Nome do local<input name="nome" maxLength={80} required /></label>
          <button className="botao" type="submit">Cadastrar local</button>
        </form>
      </section>

      <section className="agenda-profissional" aria-labelledby="agenda-regra-titulo">
        <h3 id="agenda-regra-titulo">Nova disponibilidade</h3>
        {ativos.length === 0 || locais.length === 0 ? (
          <p>É necessário um profissional ativo e um local cadastrado para definir horários.</p>
        ) : (
          <form action={salvarConfiguracaoAgenda.bind(null, unidade, 'disponibilidade')} className="agenda-formulario">
            <div className="agenda-campo">
              <label htmlFor="regra-profissional">Profissional</label>
              <select name="profissional" id="regra-profissional" required defaultValue="">
                <option value="" disabled>Selecione</option>
                {ativos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div className="agenda-campo">
              <label htmlFor="regra-local">Local</label>
              <select name="local" id="regra-local" required defaultValue="">
                <option value="" disabled>Selecione</option>
                {locais.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
              </select>
            </div>
            <div className="agenda-campo">
              <label htmlFor="regra-dia">Dia da semana</label>
              <select name="dia" id="regra-dia" required>
                {dias.map((dia, i) => <option value={i + 1} key={dia}>{dia}</option>)}
              </select>
            </div>
            <label>Horário inicial<input name="inicio" type="time" required /></label>
            <label>Horário final<input name="fim" type="time" required /></label>
            <label>Vigente a partir de<input name="desde" type="date" min={hoje} defaultValue={hoje} required /></label>
            <button className="botao" type="submit">Salvar disponibilidade</button>
          </form>
        )}
      </section>

      <section className="agenda-profissional" aria-labelledby="agenda-regras-titulo">
        <h3 id="agenda-regras-titulo">Disponibilidades cadastradas</h3>
        {regras.length === 0 && <p>Nenhuma disponibilidade cadastrada.</p>}
        {regras.map(r => (
          <article className="agenda-regra" key={r.id}>
            <h4>{nomesProfissionais.get(r.profissional_id)} · {nomesLocais.get(r.local_id)}</h4>
            <p>{dias[r.dia_semana - 1]}, {hora(r.inicio_minuto)} a {hora(r.fim_minuto)}</p>
            <p>Início em {dataBR(r.desde)}. {r.ate ? 'Encerramento a partir de ' + dataBR(r.ate) + '.' : 'Sem encerramento programado.'}</p>
            {(!r.ate || r.ate > hoje) && (
              <form action={salvarConfiguracaoAgenda.bind(null, unidade, 'encerrar')} className="agenda-formulario">
                <input type="hidden" name="regra" value={r.id} />
                <label>Encerrar a partir de<input name="ate" type="date" min={r.desde > hoje ? r.desde : hoje}
                  max={r.ate ?? undefined} required /></label>
                <button className="botao" type="submit">Encerrar regra</button>
              </form>
            )}
          </article>
        ))}
      </section>
    </section>
  );
}
