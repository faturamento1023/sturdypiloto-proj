import { dataAgenda } from '../../../src/agenda/tempo';
import { BuscaPaciente, FormularioPaciente } from './busca';

export function CadastroPacientes({ unidade, permiteCadastro }: { unidade: string; permiteCadastro: boolean }) {
  return (
    <section className="painel-modulos" aria-labelledby="pacientes-titulo">
      <h2 id="pacientes-titulo">Lista de pacientes</h2>
      {permiteCadastro && <FormularioPaciente key={unidade} unidade={unidade} chave={crypto.randomUUID()} hoje={dataAgenda(new Date())} />}
      <BuscaPaciente key={unidade} unidade={unidade} />
    </section>
  );
}
