# Shop — instruções do projeto

Idioma: português (Brasil). A pasta [docs/](docs/README.md) é a fonte da verdade do produto.

## Checagem de conformidade (obrigatória em TODO pedido)

Antes de executar qualquer pedido (código, doc, config, dependência), confira se ele fere ou altera algo em:

| # | Documento | Pergunta |
|---|-----------|----------|
| 1 | [docs/02-regras-de-negocio.md](docs/02-regras-de-negocio.md) | Contradiz ou cria alguma regra RN-xx? |
| 2 | [docs/03-stack.md](docs/03-stack.md) | Adiciona, troca ou remove tecnologia, serviço ou dependência fora da stack? |
| 3 | [docs/04-arquitetura.md](docs/04-arquitetura.md) | Muda responsabilidade de componente, fluxo de dados, rotas, modelo de dados ou backend? |
| 4 | [docs/06-uml.md](docs/06-uml.md) | Muda entidades, atributos, estados ou sequências? |
| 5 | [docs/09-seguranca-privacidade.md](docs/09-seguranca-privacidade.md) | Mexe em autenticação, sessão, permissões, dados pessoais, rate limit, headers, webhooks? |
| 6 | [docs/07-monetizacao.md](docs/07-monetizacao.md) | Afeta planos, preços ou anúncios? |
| 7 | [docs/08-plano-execucao.md](docs/08-plano-execucao.md) | Está fora da fase atual ou pula um critério de pronto? |
| 8 | [docs/05-estrutura-engenharia.md](docs/05-estrutura-engenharia.md) | Respeita a estrutura de pastas e os padrões? |
| 9 | [docs/11-design.md](docs/11-design.md) | Usa só os tokens da paleta, respeita Atomic Design, reuso e responsividade? |
| 10 | — | Adiciona custo recorrente de infraestrutura? (informar o valor ao usuário) |
| 11 | [docs/13-padroes-qualidade.md](docs/13-padroes-qualidade.md) | Segue clean code, padrões de projeto, commits semânticos e regras de teste? |
| 12 | [docs/14-pagamentos-internacionais.md](docs/14-pagamentos-internacionais.md) | Mexe em checkout, preço USDT, cotação, provedor de pagamento ou rede cripto? |
| 13 | [docs/16-observabilidade.md](docs/16-observabilidade.md) | Trata erro ou gera log? Usa o `logger`, `requestId`, código de erro e não loga dado pessoal? |

Agentes especializados: [docs/12-agentes.md](docs/12-agentes.md).

### Como agir

- **Sem conflito:** execute e comece a resposta com `Conformidade: ok`.
- **Com conflito:** NÃO execute a parte conflitante. Comece com `Conformidade: conflito`, cite o documento e o ID da regra e pergunte se o usuário quer mudar a regra ou ajustar o pedido.
- **Pedido aprovado que muda regra/stack/arquitetura/UML:** atualize os docs afetados no mesmo trabalho, mantendo IDs RN estáveis (não renumerar; regra removida fica marcada como *revogada*).
- Itens da seção "Nunca" de [09](docs/09-seguranca-privacidade.md) não são negociáveis sem confirmação explícita.

## Decisões no papel do profissional sênior

Toda decisão (técnica, de produto, segurança, infra, pagamentos, design) é tomada **assumindo o papel do profissional sênior da área** — "imagine que você é um engenheiro de segurança sênior", "engenheiro de software sênior", "SRE sênior"… — e o papel aparece na resposta: `Como <papel>: <decisão> — <porquê>`. Numa mesma tarefa pode haver mais de um papel. Os papéis dos agentes estão em [docs/12](docs/12-agentes.md).

## Next.js

Este projeto usa **Next.js 16** (`proxy.ts` no lugar de `middleware`, `cacheComponents` ligado). Leia [AGENTS.md](AGENTS.md) e o guia em `node_modules/next/dist/docs/` antes de escrever código de framework.

## Git

- Conventional Commits (ver [CONTRIBUTING.md](CONTRIBUTING.md)).
- **Toda tarefa tem uma issue** no [GitHub](https://github.com/abeeyh/shop/issues). Fluxo: issue → branch `<tipo>/<nº>-<assunto>` a partir de `dev` → PR para `dev` com `Refs #<nº>` (nunca `Closes`) → `hom` → `main` (prod). A issue ganha a label `dev`/`hom`/`prod` sozinha e só fecha em produção. Nunca commitar direto em `dev`, `hom` ou `main`.
- GitHub CLI no Windows: `"C:\Program Files\GitHub CLI\gh.exe"` (fora do PATH do bash).
- **Nunca** incluir o Claude ou outra IA como coautor: sem `Co-Authored-By` e sem linhas de atribuição em commits ou PRs.
- Só commitar ou dar push quando o usuário pedir.
