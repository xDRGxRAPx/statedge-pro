# StatEdge Pro

Analytics em tempo real para jogos Double e Crash, com seção de estratégias por cor.

## Run & Operate

- `pnpm --filter @workspace/statedge run dev` — rodar o frontend (porta dinâmica)
- `pnpm --filter @workspace/api-server run dev` — rodar o API server (porta 8080)
- `pnpm run typecheck` — typecheck completo
- `pnpm run build` — build de todos os pacotes

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite 7 + Tailwind CSS 4 + Framer Motion
- API: Express 5
- DB: PostgreSQL + Drizzle ORM (pronto, não usado pelo frontend ainda)
- Build: Vite (SPA estático)

## Deploy no Vercel

1. Suba o projeto para o GitHub
2. Conecte o repositório no Vercel
3. O Vercel usará as configurações do `vercel.json` na raiz:
   - **Build command**: `pnpm install && pnpm --filter @workspace/statedge run build`
   - **Output directory**: `artifacts/statedge/dist/public`
4. Deploy automático a cada push na branch main

## Where things live

- `artifacts/statedge/src/App.tsx` — toda a lógica e UI do app
- `artifacts/statedge/src/index.css` — tema escuro
- `artifacts/statedge/vite.config.ts` — configuração do Vite (funciona no Replit e Vercel)
- `vercel.json` — configuração de deploy no Vercel
- `artifacts/api-server/` — backend Express (proxy para Blaze)
- `lib/api-spec/openapi.yaml` — contrato de API

## Seções do App

| Seção | Plano | Descrição |
|-------|-------|-----------|
| Overview | Free | Dashboard com métricas consolidadas |
| Double | Free | Análise de rodadas Double |
| Crash | Free | Análise de multiplicadores Crash |
| Estratégias | Free | Padrões de cores (vermelho/preto/branco) com probabilidades |
| IA Advisor | Pro | Insights automáticos |
| Simulador | Pro | Backtesting de estratégias |
| Alertas | Free | Notificações de eventos estatísticos |
| Configurações | Free | Plano e canais de notificação |

## Architecture decisions

- App é 100% client-side (SPA): sem backend necessário para o frontend funcionar
- Dados da Blaze via fetch direto no browser — fallback para simulação quando bloqueado por CORS
- `vercel.json` na raiz configura build a partir do subpacote `@workspace/statedge`
- `vite.config.ts` usa PORT/BASE_PATH opcionais (com fallback) para funcionar tanto no Replit quanto no Vercel

## Product

Analytics em tempo real de Double e Crash, com:
- Probabilidades por cor (Vermelho, Preto, Branco) nas últimas N rodadas
- Detecção automática de padrões: Zigzag, Bloco de repetição, Padrão AB, Duplo Alternado
- Sinais de entrada classificados por força (Forte/Médio/Fraco)
- Previsão estatística da próxima rodada com indicador de confiança
- Simulador de estratégias (Tendência, Contratendência, Flat, Martingale)
- Alertas automáticos por sequência longa ou score alto

## Gotchas

- Sempre rodas `pnpm install` após alterar qualquer `package.json`
- O app usa simulação automática quando a Blaze bloqueia CORS — comportamento esperado
- Para conectar o backend proxy: defina `window.__DATA_API_BASE__` antes de carregar o app
- O `vercel.json` precisa estar na raiz do repositório para o Vercel reconhecer

## User preferences

- App em português brasileiro
- Tema escuro (#020617 fundo principal)
- Foco em leitura estatística, não previsão garantida

## Pointers

- Ver skill `pnpm-workspace` para estrutura do monorepo
