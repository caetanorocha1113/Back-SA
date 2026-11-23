# Back SA — Gestão Financeira

API do sistema de gestão financeira (grupo 8).
Node + Express 5 + Prisma 7 + PostgreSQL, com autenticação JWT.

## Como rodar

```bash
npm install
cp .env.example .env      # coloque a URL do banco e as chaves
npm run build             # gera o Prisma Client e aplica as migrations
npm run seed              # cria o admin e a Nicole com 2 anos de transações
npm run dev               # http://localhost:3000
```

Produção: `npm run build` e depois `npm start`.

## Usuários do seed

| E-mail | Senha | Perfil |
|---|---|---|
| nicole@email.com | 123467 | usuario |
| admin@email.com | admin123 | admin |

## Ligar o front no back

No front, troque em `.env.development`:

```
VITE_API_URL=http://localhost:3000
VITE_USE_MOCK=false
```

## Estrutura

```
src/
├── server.js        inicia o servidor
├── app.js           middlewares globais, rotas e tratamento de erros
├── lib/             conexão com o banco (Prisma)
├── routes/          URLs de cada recurso
├── controllers/     regras de cada rota
├── middleware/      autenticação JWT, perfis (RBAC) e erros
└── utils/           validações, formatação e AppError
prisma/
├── schema.prisma    tabelas Usuario e Transacao
├── migrations/      criação das tabelas e índices
└── seed.js          dados de exemplo
```

## Rotas

Rotas protegidas precisam do cabeçalho `Authorization: Bearer <accessToken>`.
Erros sempre voltam como `{ "erro": "mensagem" }`.

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| POST | /login | público | Login, retorna accessToken (15 min) e refreshToken (30 dias) |
| POST | /refresh | público | Gera novos tokens a partir do refreshToken |
| POST | /logout | logado | Invalida o refreshToken |
| GET | /perfil | logado | Dados do usuário logado |
| POST | /usuarios | público | Cadastro (senha salva com bcrypt) |
| GET | /usuarios?busca= | admin | Lista e busca usuários |
| GET | /usuarios/:id | dono ou admin | Busca um usuário |
| PUT | /usuarios/:id | dono ou admin | Atualiza (só admin altera o perfil) |
| DELETE | /usuarios/:id | admin | Exclui |
| GET | /transacoes | logado | Lista com filtros, busca e paginação |
| GET | /transacoes/:id | logado | Busca uma transação |
| POST | /transacoes | logado | Cria |
| PUT | /transacoes/:id | logado | Atualiza |
| DELETE | /transacoes/:id | logado | Exclui |
| GET | /dashboard?periodo=3m\|6m\|12m | logado | Totais, gráfico mensal e despesas por categoria |
| GET | /relatorios?dataInicio=&dataFim= | logado | Relatório do período (`&formato=csv` baixa planilha) |

Cada usuário só vê e altera as próprias transações.

### Filtros de GET /transacoes

| Parâmetro | Exemplo |
|---|---|
| busca | `busca=mercado` (descrição ou categoria) |
| tipo | `receita` ou `despesa` |
| categoria | `Alimentação` |
| status | `concluida` ou `pendente` |
| dataInicio / dataFim | `2026-01-01` |
| ordenarPor | `data`, `valor`, `descricao`, `categoria` |
| ordem | `asc` ou `desc` |
| pagina / limite | `pagina=2&limite=10` (limite máximo 100) |

Resposta: `{ dados, total, pagina, limite, totalPaginas }`.

### Corpo de POST e PUT /transacoes

```json
{
  "descricao": "Supermercado",
  "valor": 153.45,
  "tipo": "despesa",
  "categoria": "Alimentação",
  "data": "2026-11-22",
  "status": "concluida"
}
```

Categorias de receita: Salário, Freelance, Investimentos, Outros.
Categorias de despesa: Moradia, Alimentação, Transporte, Contas, Educação, Saúde, Lazer.

## Segurança e desempenho

- Senhas com hash bcrypt; senha e refreshToken nunca saem nas respostas.
- JWT com expiração e refresh token renovado a cada uso.
- Perfis `usuario` e `admin` verificados pelo middleware `permitirPerfis`.
- Índices em `Transacao` por usuário + data, usuário + tipo + data e usuário + categoria.
- Agregações do dashboard e dos relatórios feitas no banco (`groupBy` e SQL).
