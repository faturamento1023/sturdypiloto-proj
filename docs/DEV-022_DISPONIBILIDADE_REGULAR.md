# DEV-022 — Disponibilidade regular

Em **Agenda → Configurar disponibilidade**, a gestão e a administração podem cadastrar uma sala e definir janelas semanais por profissional, sala, dia da semana e horário. A regra vale a partir da data indicada. Para substituir um horário, encerre a regra anterior e cadastre a nova. O dia escolhido para encerramento já fica fora da vigência.

- Cada local representa uma sala de uso exclusivo. O banco bloqueia sobreposição para o mesmo profissional ou para a mesma sala na mesma unidade. Períodos adjacentes são permitidos. Cada janela começa e termina no mesmo dia civil.
- Alterações usam o dia corrente ou uma data futura em São Paulo. Encerrar preserva a regra e os compromissos cadastrados. A auditoria registra cadastro e encerramento com o identificador de correlação.
- A grade expande as regras no fuso de São Paulo, informa a sala e desconta compromissos que ocupam a agenda do profissional. Onde uma janela datada coincide com uma semanal, o horário aparece uma vez com a sala da regra semanal. O nome do local é opcional no retorno HTTP dos horários livres.
- As funções de escrita exigem MFA e vínculo ativo de gestão ou administração. A recepção pode consultar os horários na grade da unidade. O perfil exclusivamente médico mantém acesso apenas à própria agenda.
- Aplicar `database/dev022_disponibilidade.sql` após DEV-021 no ambiente de teste. A cobertura usa dados fictícios no PostgreSQL e navegador. A implantação e a homologação no Supabase hospedado seguem pendentes.

Próxima tarefa: **DEV-023 — Exceções e feriados**. Cotas, reservas pela interface e a alocação de sala no compromisso são etapas seguintes.
