'use client';

import { useActionState, useState } from 'react';
import { emitirConvite, type EstadoConvite } from './acoes';

export type OpcaoMedico = { id: string; nome: string; crm: string; uf: string };

export function FormularioConvite({ unidade, medicos }: { unidade: string; medicos: OpcaoMedico[] }) {
  const [perfil, setPerfil] = useState('');
  const [estado, acao, pendente] = useActionState<EstadoConvite, FormData>(emitirConvite.bind(null, unidade), {});

  return (
    <form className="acesso-form painel-form-medico" action={acao}>
      <label>E-mail do convidado
        <input type="email" name="email" maxLength={254} required />
      </label>
      <label>Perfil do convite
        <select name="perfil" value={perfil} onChange={event => setPerfil(event.target.value)} required>
          <option value="">Selecione</option>
          <option value="recepcao">Recepção</option>
          <option value="medico">Médico</option>
          <option value="financeiro">Financeiro</option>
          <option value="gestao">Gestão</option>
        </select>
      </label>
      {perfil === 'medico' && (
        <label>Profissional ativo
          <select name="profissional" defaultValue="" required>
            <option value="">Selecione</option>
            {medicos.map(medico => (
              <option key={medico.id} value={medico.id}>{medico.nome} · CRM {medico.uf} {medico.crm}</option>
            ))}
          </select>
        </label>
      )}
      <button className="botao" type="submit" disabled={pendente}>Gerar convite</button>
      {estado.mensagem && <p className="acesso-aviso" role="status">{estado.mensagem}</p>}
      {estado.codigo && (
        <label>Código gerado
          <input readOnly value={estado.codigo} onFocus={event => event.currentTarget.select()} />
        </label>
      )}
    </form>
  );
}
