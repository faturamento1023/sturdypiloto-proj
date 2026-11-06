# DEV-014 — Shell do sistema

Após validar a sessão e o MFA, abra **Minha conta → Abrir painel**. O painel também responde pela rota `/painel`. A estrutura usa os [tokens do design system da Clínica DM](DEV-008_DESIGN_SYSTEM.md).

| Elemento | Comportamento |
|---|---|
| Menu | Barra lateral em desktop e menu recolhível em celular, com os módulos permitidos na unidade |
| Cabeçalho | Unidade atual, troca para outra unidade vinculada, busca de módulos e acesso à conta |
| Caminho de navegação | Indica a visão geral, o módulo ou a busca e permite voltar ao painel da unidade |
| Busca | Filtra nomes e termos dos módulos permitidos, sem distinguir acentos, com estado vazio |
| Destinos dos módulos | Identificam a área e indicam quando as funções ainda estão em preparação |

## Autorização

O servidor consulta as unidades e os perfis ativos da própria conta a cada carregamento. A primeira unidade em ordem de nome é o padrão quando nenhuma unidade foi selecionada. A seleção é registrada na URL para manter a navegação reproduzível. URLs de unidades ou módulos fora do escopo retornam 404. A configuração de autenticação, o estado sem vínculo e a indisponibilidade do provedor têm tratamento separado.

No Supabase isolado, aplique [o SQL DEV-014](../database/dev014_shell.sql) após os [SQLs DEV-009 e DEV-013](DEV-013_MATRIZ_AUTORIZACAO.md). O RPC `public.piloto_minhas_unidades()` executa com os privilégios da sessão e usa o RLS de unidades e o auxiliar de vínculos da DEV-013. A resposta contém apenas identificador, nome e perfis de cada unidade acessível. Os schemas internos permanecem fora da Data API. As respostas do painel usam `Cache-Control: private, no-store`.

## Verificação

O PostgreSQL descartável cobre unidades inativas, vínculos inativos, perfis acumulados por unidade, sessão sem MFA e tentativa anônima. O Playwright exercita desktop e celular, incluindo ausência de sessão, MFA pendente, troca de unidade, mudança de menu, busca, caminho de navegação e URL direta de módulo proibido. O provedor de identidade é simulado e as consultas de unidades executam no PostgreSQL descartável.

A busca desta entrega localiza módulos. As buscas operacionais, como localizar pacientes, fazem parte dos módulos correspondentes. A validação em Supabase hospedado segue pendente.
