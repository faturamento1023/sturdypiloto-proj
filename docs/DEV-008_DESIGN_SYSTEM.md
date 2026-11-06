# DEV-008 — Design system da Clínica DM

A primeira versão deriva do [protótipo da DEV-007](DEV-007_PROTOTIPO_FIGMA.md) e reúne os estilos e componentes em uma página do mesmo arquivo.

[Abrir a prancha editável no Figma](https://www.figma.com/design/2htM9xhmiwhpsLXeL9U4zF?node-id=10-155)

## Fundações

| Coleção ou estilo | Conteúdo |
|---|---|
| DM · Primitivas | 19 cores de referência da interface |
| DM · Cores | 30 nomes por função, ligados à paleta por aliases |
| DM · Medidas | 15 variáveis de espaçamento, raios, controles, ícones e bordas |
| Estilos de texto DM | 9 estilos Inter, incluindo títulos desktop/celular, corpo, rótulos e valores |

A paleta mantém o verde-petróleo da agenda. O contorno dos campos usa uma cor mais escura para destacar a área editável. Botões e itens de menu têm altura mínima de 44 px no sistema de componentes. O arquivo [tokens.css](../design/tokens.css) fornece as variáveis CSS com os mesmos nomes usados no Figma.

## Componentes reutilizáveis

| Família | Estados e usos |
|---|---|
| Botão | Principal, suave e contorno, cada um em padrão, foco e desativado. Rótulo editável e ícone opcional intercambiável |
| Campo de texto | Padrão, foco, erro e desativado, com rótulo, valor e ajuda editáveis |
| Etiqueta de situação | Sucesso, atenção, erro, progresso e neutro, sempre com texto |
| Item de navegação | Padrão e ativo, com ordem e rótulo editáveis |
| Cartão de indicador | Rótulo, valor e contexto editáveis |
| Mensagem de interface | Vazio, carregando, erro, sucesso e atenção. Título e descrição editáveis |
| Ícones | Adicionar, busca, agenda, prontuário, sucesso, alerta, vazio e carregando |

A prancha apresenta instâncias dos componentes. Os componentes principais ficam abaixo dela na página **DEV-008 · Design system**. A aplicação web poderá importar os tokens ao implementar seus componentes. As 52 telas do protótipo permanecem como referência da DEV-007.

## Conferência

- 64 variáveis em três coleções, 9 estilos tipográficos, 6 famílias e 8 ícones vetoriais.
- As variantes usam variáveis e estilos do arquivo. A prancha foi conferida quanto a encaixe, legibilidade e uso de instâncias.
- A próxima tarefa do cronograma é a DEV-009, modelagem de banco, permissões e auditoria.
