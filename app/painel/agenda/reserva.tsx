'use client';

import { useActionState, useState } from 'react';
import { BuscaPaciente } from '../pacientes/busca';
import { reservarHorario } from './reserva-acoes';

export type OpcaoReserva = { id: string; nome: string };
const hora = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });

export function FormularioReserva({ unidade, profissional, inicio, fim, chave, podeBuscar, convenios, procedimentos }: {
  unidade: string; profissional: string; inicio: string; fim: string; chave: string; podeBuscar: boolean;
  convenios: OpcaoReserva[]; procedimentos: OpcaoReserva[];
}) {
  const [resultado, reservar, pendente] = useActionState(reservarHorario.bind(null, unidade, profissional, inicio, fim), { chave });
  const [paciente, selecionarPaciente] = useState<{ id: string; nome: string } | null>(null);
  const [de, selecionarInicio] = useState(inicio);
  const disponiveis = Math.floor((Date.parse(fim) - Date.parse(inicio)) / 60_000);
  const maximo = Math.floor((Date.parse(fim) - Date.parse(de)) / 60_000);
  const horarios = Array.from({ length: Math.ceil(disponiveis / 15) }, (_, i) => new Date(Date.parse(inicio) + i * 900_000).toISOString());
  const [convenio, selecionarConvenio] = useState('');
  const [procedimento, selecionarProcedimento] = useState('');
  const [duracao, selecionarDuracao] = useState(String(Math.min(30, maximo)));
  const [codigo, selecionarCodigo] = useState('');
  if (resultado.sucesso) return <p className="painel-aviso" role="status">Reserva criada. Volte à grade para consultar o agendamento.</p>;
  return (
    <>
      {podeBuscar && <BuscaPaciente unidade={unidade} onSelecionar={(id, nome) => selecionarPaciente({ id, nome })} />}
      <form className="agenda-formulario" action={reservar} aria-label="Dados da reserva">
        {podeBuscar ? <>
          <input type="hidden" name="paciente" value={paciente?.id ?? ''} />
          <p role="status">{paciente ? 'Paciente selecionado: ' + paciente.nome : 'Selecione um paciente na busca acima.'}</p>
        </> : <label>Código do paciente<input name="paciente" value={codigo} onChange={e => selecionarCodigo(e.currentTarget.value)} maxLength={36} required /></label>}
        <div className="agenda-campo"><label htmlFor="reserva-convenio">Convênio</label><select id="reserva-convenio" name="convenio"
          value={convenio} onChange={e => selecionarConvenio(e.currentTarget.value)} required>
          <option value="" disabled>Selecione</option>{convenios.map(c => <option value={c.id} key={c.id}>{c.nome}</option>)}
        </select></div>
        <div className="agenda-campo"><label htmlFor="reserva-procedimento">Procedimento</label><select id="reserva-procedimento" name="procedimento"
          value={procedimento} onChange={e => selecionarProcedimento(e.currentTarget.value)} required>
          <option value="" disabled>Selecione</option>{procedimentos.map(p => <option value={p.id} key={p.id}>{p.nome}</option>)}
        </select></div>
        <div className="agenda-campo"><label htmlFor="reserva-inicio">Início</label><select id="reserva-inicio" name="inicio" value={de} onChange={e => {
          const valor = e.currentTarget.value;
          selecionarInicio(valor);
          selecionarDuracao(String(Math.min(Number(duracao) || 30, (Date.parse(fim) - Date.parse(valor)) / 60_000)));
        }} required>{horarios.map(h => <option value={h} key={h}>{hora.format(new Date(h))}</option>)}</select></div>
        <label>Duração em minutos<input type="number" name="duracao" min={1} max={maximo} value={duracao}
          onChange={e => selecionarDuracao(e.currentTarget.value)} required /></label>
        <button className="painel-controle painel-controle-confirmar" disabled={pendente || (podeBuscar && !paciente)}>Confirmar reserva</button>
      </form>
      {resultado.erro && <p className="painel-aviso" role="alert">{resultado.erro}</p>}
    </>
  );
}
