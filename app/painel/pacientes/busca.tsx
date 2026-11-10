'use client';

import { useActionState, useState } from 'react';
import { buscarPacientes, cadastrarPaciente, type EstadoCadastroPaciente } from './acoes';

const mensagens = {
  salvo: 'Paciente cadastrado.', invalido: 'Confira os dados do cadastro.',
  conflito: 'O envio anterior já foi usado. Preencha um novo cadastro.',
  indisponivel: 'Não foi possível confirmar o cadastro. Reenvie os mesmos dados para verificar.',
};

function CamposPaciente({ hoje }: { hoje: string }) {
  const [nome, setNome] = useState('');
  const [social, setSocial] = useState('');
  const [nascimento, setNascimento] = useState('');
  return <>
    <label>Nome completo<input name="nome" minLength={2} maxLength={160} value={nome} onChange={evento => setNome(evento.currentTarget.value)} required /></label>
    <label>Nome social (opcional)<input name="nome_social" maxLength={160} value={social} onChange={evento => setSocial(evento.currentTarget.value)} /></label>
    <label>Data de nascimento<input type="date" name="nascimento" min="1900-01-01" max={hoje}
      value={nascimento} onChange={evento => setNascimento(evento.currentTarget.value)} /></label>
  </>;
}

export function FormularioPaciente({ unidade, chave, hoje }: { unidade: string; chave: string; hoje: string }) {
  const inicial: EstadoCadastroPaciente = { chave };
  const [resposta, cadastrar, pendente] = useActionState(cadastrarPaciente.bind(null, unidade), inicial);
  return (
    <details className="painel-aviso">
      <summary>Novo paciente</summary>
      <form className="agenda-formulario" action={cadastrar}>
        <CamposPaciente key={resposta.chave} hoje={hoje} />
        <button type="submit" className="painel-controle painel-controle-confirmar" disabled={pendente}>Cadastrar paciente</button>
      </form>
      {resposta.estado && <p role={resposta.estado === 'salvo' ? 'status' : 'alert'}>{mensagens[resposta.estado]}</p>}
    </details>
  );
}

export function BuscaPaciente({ unidade }: { unidade: string }) {
  const [resposta, buscar, pendente] = useActionState(buscarPacientes.bind(null, unidade), null);
  const [termo, definirTermo] = useState('');
  return (
    <>
      <form action={buscar} className="painel-barra painel-barra-busca" role="search" aria-label="Buscar pacientes">
        <input type="search" name="termo" aria-label="Nome ou nome social" placeholder="Nome ou nome social"
          value={termo} onChange={evento => definirTermo(evento.currentTarget.value)} minLength={2} maxLength={80} required />
        <button type="submit" className="painel-controle painel-controle-destaque" disabled={pendente}>Pesquisar</button>
      </form>
      {pendente && <p role="status">Buscando pacientes…</p>}
      {resposta?.erro && <p className="painel-aviso" role="alert">{resposta.erro}</p>}
      {resposta && !resposta.erro && <>
        {resposta.pacientes.length === 0 ? <p>Nenhum paciente encontrado.</p> : (
          <div className="painel-tabela-rolagem" role="region" tabIndex={0} aria-label="Resultados da busca de pacientes">
            <table className="painel-tabela">
              <thead><tr><th scope="col">Nome</th><th scope="col">Nome social</th><th scope="col">Nascimento</th></tr></thead>
              <tbody>{resposta.pacientes.map(paciente => <tr key={paciente.id}>
                <th scope="row">{paciente.nome}</th><td>{paciente.nome_social ?? '—'}</td>
                <td>{paciente.nascimento ? paciente.nascimento.split('-').reverse().join('/') : '—'}</td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
        {(resposta.pagina > 0 || resposta.temProxima) && <form action={buscar} className="painel-paginas-medicos" aria-label="Páginas de pacientes">
          <input type="hidden" name="termo" value={resposta.termo} />
          {resposta.pagina > 0 && <button type="submit" name="pagina" value={resposta.pagina - 1} className="painel-controle" disabled={pendente}>Anterior</button>}
          {resposta.temProxima && <button type="submit" name="pagina" value={resposta.pagina + 1} className="painel-controle" disabled={pendente}>Próxima</button>}
        </form>}
      </>}
    </>
  );
}
