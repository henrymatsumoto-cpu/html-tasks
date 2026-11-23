# Kit-base: robô do Slack e orquestradora independentes

> Este kit ajuda a montar um robô do Slack e uma orquestradora de tasks que trabalham sozinhos e só chamam você quando precisam de uma decisão sua.
> Ele vem de um ambiente real, que tem um robô chamado Vel'Koz e um quadro de tasks chamado Azir. Os nomes servem só de referência. Use os nomes que quiser.
> O código completo de referência fica em repositórios internos da organização no GitHub. O acesso é dado sob pedido.

---

## 1. Como usar este arquivo

Cole este arquivo no seu Claude Code e peça: **"Leia este kit e monte na minha VPS, uma peça por vez. Antes de cada decisão, me faça uma pergunta por vez."**

Regras para o Claude que vai montar:
- Trate este texto como especificação.
- Siga a ordem de montagem da seção 9.
- Comece pelo MVP. Só ligue o resto depois que o MVP estiver rodando e validado.
- Nenhum segredo passa pelo chat. Os tokens ficam num arquivo env com permissão 600, e a pessoa cola o valor direto nesse arquivo. Neste kit o arquivo é `~/.config/kit-agentes/segredos.env`, mas você pode escolher outro caminho, desde que seja o mesmo em todas as peças.
- Onde aparecer `<algo>`, pergunte o valor à pessoa antes de escrever.

---

## 2. Visão geral

```
                ┌──────────────────────────── ROBÔ DO SLACK ──────────────────────────────┐
 Slack (DM/@) ──► Socket Mode ─► fila SQLite ─► 1 sessão Claude por thread ─► resposta na thread
                │                                    └─ precisa de OK? ─► botão Aprovar/Reprovar
                └──────────────────────────────────────────────────────────────────────────┘

                ┌──────────────────────────── ORQUESTRADORA ──────────────────────────────┐
 Slack ─┐       │                                                                          │
 Tasks  ├─► Card no Backlog ─► Roteador dá dono (especialista) ─► fila com vagas ─►        │
 manual ┘       │   sessão Claude durável no herdr (1 painel por card/dono) ─►            │
                │   bloco final JSON ─► Validação (você confere) | Travado (decisão sua)  │
                └──────────────────────────────────────────────────────────────────────────┘

 ROTINAS:  cron ─► script (flock) ─► coleta determinística ─► claude -p só escreve texto
                    ─► DM/canal SÓ se tem algo ─► log ─► healthcheck

 APROVAÇÃO: qualquer ação sensível ─► botão Aprovar/Reprovar no Slack ─► ação roda sozinha
```

"Tasks" é o seu gerenciador de tarefas (Taskdex, Linear, etc.), lido por integração.

---

## 3. Princípios que tiram você do gargalo

| Princípio | O que muda na prática |
|---|---|
| **Sessão durável por conversa ou card** | Cada thread do Slack e cada card têm um session-id fixo. Responder ou retomar continua a mesma sessão (`--resume`), e você não precisa reexplicar nada. |
| **Botão Aprovar em vez de pergunta no chat** | O agente não fica parado esperando você ler o chat. Ele posta um botão, você clica e a ação roda. |
| **O card anda sozinho até Validação** | A IA sempre termina em Validação, nunca em Concluído. Você só confere o resultado. |
| **Travado só depois de esgotar as alternativas** | O agente precisa tentar pelo menos 3 caminhos antes de travar. O travamento vem com uma frase, as opções e uma recomendação. |
| **Modo sombra + eval antes de ligar** | Todo agente novo nasce só relatando. Ele sai da sombra com nota de pelo menos 90% num gabarito real e 10 execuções seguidas sem correção. |
| **Fila com vagas e trava de tempo** | Há um limite de sessões em paralelo, e cada rodada tem um tempo máximo. Uma sessão presa volta pro fim da fila e, na 2ª vez, vai pra Travado. |
| **O modelo escreve texto, o código decide** | Lista, regra, botão e estado ficam em código determinístico. O modelo só redige. |
| **Só fala quando tem algo** | Rotina sem novidade não manda nada. |

---

## 4. Peça 1: robô do Slack independente

### 4.1 Arquitetura

- É **um processo Python de longa duração** (`agente.py servir`). Ele usa a stdlib (`urllib` com retry) para a Web API e o `slack_sdk` só para o Socket Mode.
- Funciona com **Socket Mode**, então não precisa de URL pública.
- **A fila fica num SQLite** em modo WAL:

| tabela | para quê |
|---|---|
| `eventos` | Chave `canal:ts`, gravada com `INSERT OR IGNORE`. Status: pendente, rodando, feito, erro, interrompido, parado. |
| `sessoes` | Liga a thread ao session_id. |
| `aprovacoes` | Botões que nascem de uma conversa. |
| `pedidos` | Botões criados por rotinas, com a coluna `expira`. |
| `pedidos_chaves` | Idempotência: o mesmo pedido não é postado duas vezes. |

- **O filtro do evento é uma função pura.** Ela descarta mensagens de bot e subtipos e aceita só `app_mention` ou DM, vindos de quem está na allowlist (`SLACK_ALLOWLIST`, ids separados por vírgula) e com texto.
- **O evento é gravado na fila antes do ack.** O ack precisa sair em menos de 3 s. Num clique de botão, o ack vem primeiro e o trabalho roda numa thread separada.
- **Despachante.** Um laço de 1 s roda threads do Slack em paralelo até um limite, mas as mensagens de uma mesma thread rodam em série. A trava é um `UPDATE ... WHERE status='pendente'`. Se o arquivo `estado/STOP` existir, nada roda.
- **Uma sessão por thread.** O uuid é gravado **antes** de chamar o Claude e nunca é descartado:
  ```
  claude -p --model opus --output-format json --permission-mode <modo> \
    --append-system-prompt <regras> (--resume <id> | --session-id <id>)
  ```
  - Se existe `~/.claude/projects/<slug do cwd>/<id>.jsonl`, use `--resume`. Se não existe, use `--session-id`.
  - Tire os tokens do Slack do ambiente antes de chamar o Claude.
  - `<modo>`: pergunte à pessoa. O padrão seguro é `acceptEdits`. Rodar sem nenhum prompt de permissão (`bypassPermissions`) só deve acontecer se ela pedir explicitamente e se houver hooks que segurem ações destrutivas (veja o `guarda-escrita` na seção 5.4).
- **Resposta.** O robô posta "pensando..." e depois edita essa mensagem com a resposta. Resposta longa é quebrada em várias mensagens. Se o turno falhar, ele avisa na thread ("me chame de novo, a sessão continua") sem vazar token nem stack trace.
- **Reinício.** O que estava "rodando" vira `interrompido`, e a thread recebe um aviso. **O robô nunca reexecuta sozinho.**
- **Heartbeat** a cada 30 s em `estado/heartbeat.json`, com o estado do socket, as threads ativas, o último evento e o STOP.

### 4.2 Contrato do `[[APROVAR: ...]]` (dentro da conversa)

- O system prompt manda o Claude terminar a resposta com `[[APROVAR: <ação em uma frase>]]` sempre que precisar de OK.
- Uma regex tira o marcador do texto, e o robô posta os botões **Aprovar / Reprovar**.
- O clique volta para a **mesma sessão** como mensagem nova ("Aprovado" ou "Reprovado").
- Só a 1ª decisão vale, e só se vier de usuário da allowlist.

### 4.3 Contrato do `pedir-aprovacao` (botões para rotinas, sem sessão do Claude)

```
agente.py pedir-aprovacao --canal dm|<canal> --texto-arquivo <md> \
  --acao <nome> --payload-arquivo <json> --aprovadores <ids> \
  [--thread <ts>] [--validade-horas 48] [--seco]
```

- **Payload.** Um objeto gera 1 item. Uma lista gera 1 par de botões por item, com o texto do campo `rotulo`.
- **`ACOES`.** É um dicionário `nome -> função(payload) -> {ok, msg, manter}`. Exemplos: `registrar` (só grava a decisão) e `postar-como-eu` (posta com o seu token de usuário). Para criar uma ação nova, escreva a função, adicione a entrada no dicionário e escreva o teste.
- **Quem pode clicar.** Quem não é aprovador recebe uma mensagem efêmera, e nada acontece. Quando um aprovador clica, a ação roda fora do listener e só aquele item é editado ("Aprovado por @x às HH:MM").
- **Falha.** Se a ação falha ou devolve `manter`, o botão volta para pendente.
- **Validade.** Depois de `expira` (48h por padrão), o clique não executa mais.
- **Boot.** `reconciliar_pedidos` devolve para pendente o que ficou pela metade.
- **Códigos de saída:** `0` postado (imprime JSON) · `2` argumento inválido · `3` Slack falhou (a rotina cai para DM sem botão) · `4` chave travada.
- **Outra máquina.** Se a rotina roda numa máquina e o listener em outra, o pedido vai por SSH, com chave de idempotência e retry em caso de timeout.

### 4.4 Setup passo a passo

1. **Crie o app em api.slack.com/apps, do zero:**
   - Ligue o Socket Mode e gere um App-Level Token (`xapp-`) com escopo `connections:write`.
   - Em Event Subscriptions, assine os bot events `app_mention` e `message.im`.
   - **Ligue a Interactivity.** Sem ela, o clique nunca chega.
   - No App Home, ligue a aba Messages.
   - Bot scopes: `app_mentions:read`, `im:history`, `im:read`, `im:write`, `chat:write`, mais os de leitura dos tipos de canal que o bot vai usar (`channels:history`, `groups:read`, etc.).
   - Instale no workspace (isso gera o `xoxb-`) e convide o bot para os canais.
2. **Guarde os tokens** em `~/.config/kit-agentes/segredos.env` (`chmod 600`), com as variáveis `SLACK_BOT_TOKEN_<BOT>`, `SLACK_APP_TOKEN_<BOT>` e `SLACK_ALLOWLIST`. Nunca escreva token direto em config. Sem o `xapp`, o serviço registra o erro no log, dorme 10 min e sai.
3. **Instale o código:**
   - Código em `~/.local/share/rotinas/<bot>/`, com um venv que tenha `slack_sdk`.
   - Wrapper `~/.local/bin/rotina-<bot>.sh` (`chmod +x`):
   ```bash
   #!/usr/bin/env bash
   set -u
   export HOME=/home/<user> PATH=/usr/local/bin:/usr/bin:/bin:$HOME/.local/bin TZ=America/Sao_Paulo
   exec 9>/tmp/rotina-<bot>.lock; flock -n 9 || exit 0
   set -a; . ~/.config/kit-agentes/segredos.env; set +a
   LOG=~/.local/state/rotinas/<bot>-$(date +%F).log
   mkdir -p "$(dirname "$LOG")"
   cd ~/.local/share/rotinas/<bot>
   exec ./venv/bin/python agente.py servir 2>>"$LOG"
   ```
4. **Crie a unit systemd de usuário:**
   ```ini
   # ~/.config/systemd/user/<bot>.service
   [Service]
   ExecStart=%h/.local/bin/rotina-<bot>.sh
   Restart=always
   RestartSec=30
   MemoryMax=6G
   KillMode=control-group
   TimeoutStopSec=30
   [Install]
   WantedBy=default.target
   ```
   Depois rode `loginctl enable-linger $USER && systemctl --user daemon-reload && systemctl --user enable --now <bot>`.
5. **Garanta um listener só.** Duas conexões de Socket Mode dividem os eventos entre si. Para trocar de máquina, rode `systemctl --user disable --now <bot>` na antiga antes de ligar a nova.
6. **Valide nesta ordem:**
   1. Testes, com uma CLI do Claude falsa.
   2. `agente.py simular --seco`.
   3. `systemctl --user status <bot>`.
   4. `estado/heartbeat.json` atualizado.
   5. Um DM real.

---

## 5. Peça 2: orquestradora

### 5.1 Stack

- Node 24 rodando TS direto (type stripping). Por isso não use enum nem namespace, e termine os imports em `.ts`.
- **Zero dependências npm.** Ela usa `node:sqlite` (WAL), `node:http` com SSE em `127.0.0.1:<porta>` e `node:test`. O front é HTML/CSS/JS puro.
- As regras puras (fila, travado, conversas) ficam em `public/*.js` e são usadas do mesmo jeito pelo servidor e pela tela.
- O estado fica em `~/.local/state/orquestrador/` (`orquestrador.db`, `sessoes/`, `pedidos/`, log). `ORQ_ESTADO` e `ORQ_DB` isolam o ambiente de teste.
- As sessões rodam no **herdr**, um multiplexador de terminal para agentes, com 1 painel por card ou por dono. Se o herdr não estiver disponível, use o motor alternativo `ORQ_MOTOR=processo`, que roda `claude -p --output-format stream-json`.
- Há uma CLI de apoio (`orqctl`) que chama a API local do servidor. Ela é usada nas seções 6.4 e 6.5.

### 5.2 Modelo de dados

```sql
CREATE TABLE cards (
  id TEXT PRIMARY KEY, seq INTEGER,            -- seq vira T###
  titulo TEXT, descricao TEXT, coluna TEXT,    -- backlog|fazendo|validacao|travado|concluido|arquivado
  origem TEXT, origem_ref TEXT, origem_meta TEXT,  -- manual|tasks|slack|suporte|analise|melhoria; meta = JSON livre
  session_id TEXT, sessao_cwd TEXT,
  pergunta TEXT,                               -- JSON do travado (opções)
  resumo TEXT, links TEXT, progresso INTEGER, etapa TEXT,
  aguardando INTEGER, aguardando_ate TEXT, aguardando_desde TEXT,
  papel TEXT, parent_id TEXT,                  -- mae|filho
  depende_de TEXT, depende_de_cards TEXT, ordem INTEGER, rodar_ao_liberar INTEGER,
  dono TEXT, especialista TEXT, worktree TEXT,
  pronto_quando TEXT, pedido_literal TEXT
);
CREATE UNIQUE INDEX cards_origem ON cards(origem, origem_ref);  -- dedupe
```

Tabelas auxiliares:

| tabela | para quê |
|---|---|
| `eventos` | Linha do tempo. |
| `colunas_hist` | Histórico de colunas. |
| `kv` | Interruptores, sessão por dono e estado do Slack. |
| `slack_vistos`, `slack_enviados` | Dedupe do Slack. |
| `observacoes` | Notas para a IA ler na próxima rodada. |
| `ajustes` | Seus comentários. |
| `passagens` | Troca de dono entre especialistas. |
| `conversas`, `caixa` | Conversas do Slack e entrada. |

**Migração:** faça coluna a coluna, com um `ALTER TABLE` por vez. Nunca junte vários ALTERs num mesmo if.

### 5.3 Colunas e fluxo

O fluxo é `Backlog → Fazendo → Validação → Concluído`. **Travado** é um desvio.

- A IA **sempre** fecha o turno com um bloco ` ```orquestrador {json}``` `.
- Turno sem bloco válido recebe até 2 cobranças. Se continuar sem bloco, o card vai para **Travado**, nunca para Concluído.
- Status possíveis no bloco: `validacao`, `travado`, `aguardando`, `dividir`.

### 5.4 Executor (card = sessão durável)

- **Painel.** O painel se chama `t<seq>` e recebe um uuid novo. Card com dono usa o painel do dono e a sessão guardada no kv `dono:<nome>`, que é reaproveitada em série.
- **Nova ou retomada.** Se existe `~/.claude/projects/<slug>/<id>.jsonl`, é retomada.
- **Comando de partida:**
  ```
  herdr agent start <painel> --kind claude -- (--session-id|--resume) <id> --model opus \
    --settings <arq> --append-system-prompt-file <arq> --add-dir ...
  ```
- **Hooks por rodada**, definidos no arquivo de settings:
  - `PreToolUse` → `guarda-escrita`: segura só ações destrutivas e mudança de status em sistema externo. Um arquivo flag `.liberar` libera 1 rodada.
  - `Stop` → `fim-turno`: faz um POST para o servidor com a última mensagem e as tasks em segundo plano.
- **Acompanhamento.** Um polling de 2 s no transcript (ignorando sidechain) alimenta a linha do tempo e o `PROGRESSO: NN%`.
- **Tempo de rodada.** Passar de `ORQ_TIMEOUT_MIN` (120) dispara uma cobrança. Depois de mais de 3 cobranças, o card vai para Travado.
- **Vigia de painel ocioso** (10 min):
  - caixa com texto pendente → manda Enter;
  - caixa vazia e prompt não entregue → reenvia (no máximo 2 vezes);
  - texto que não veio do servidor → é uma pessoa digitando, não mexe;
  - 2 recuperações sem sinal + 30 min → Travado.
- **Limite de painéis.** Acima de `ORQ_MAX_PAINEIS` (8), fecha as abas paradas mais antigas. A sessão continua no disco e volta com `--resume`.
- **Boot.** Reenvia o último prompt da rodada interrompida. Com `ORQ_RETOMAR_AUTO=0`, o card trava em vez disso.

### 5.5 Fila e vagas

| faixa | o que entra | vagas |
|---|---|---|
| `slack` | conversa simples, sem "trabalho" | `ORQ_MAX_SLACK`=3 |
| `tasks` | cards normais | `ORQ_MAX_PARALELO`=3 |
| `melhoria` | auto-melhoria | `ORQ_MAX_HEIMER`=1, só com a fila de tasks vazia |

- **Prioridade:** pedido de código interno → prioritário → `ordem` → ordem de chegada. Nada fura uma dependência aberta.
- Cards do **mesmo dono** rodam em série.
- Cards do **mesmo repo** não rodam juntos. Na colisão, o orquestrador cria uma worktree `~/projetos/.worktrees/<repo>/T###` na branch `orq/T###`.
- **Trava da vaga do Slack** (`ORQ_SLACK_TIMEOUT_MIN`=30):
  - 1ª vez → manda Esc, e o card volta para o fim da fila com a instrução "registre aguardando e encerre";
  - 2ª vez seguida → Travado, com as opções Retomar / Não responder.
  - Esse limite existe porque as vagas ficavam presas por limite de uso (429/503) e por loops esperando CI.

### 5.6 Auto-resposta do Slack (respondendo como você)

- **Interruptor** no kv `slack.auto`. Ele nasce **desligado**. Ao ligar, o cursor vai para o "agora", então o robô nunca responde histórico.
- **Tick de 1 min.** Usa o `search` da API do Slack com um **token de usuário próprio** (respeitando o Retry-After). Fallback: `claude -p --model haiku`, só leitura.
- **Cursor** 15 min no passado, porque o Slack indexa com atraso. O dedupe é feito por `slack_vistos`.
  - Erro parcial não avança o cursor.
  - Backoff de 1/2/4/8 intervalos.
  - Recupera até 24h de atraso.
- **Validação da saída.** A saída do haiku não é confiável. Só passa DM real, menção literal a você, thread acompanhada ou permalink que bata com canal/ts.
- **Filtro.** Remove mensagens suas, de bots (lista + regex) e de quem está na lista `NUNCA_RESPONDER` (fixa no código + `ORQ_SLACK_NUNCA_RESPONDER`).
- **Chave da conversa:**
  - thread → `canal:thread_ts`;
  - DM/grupo → `canal:dia`;
  - menção → `canal:ts`.

  Essa chave vira o `origem_ref` do card.
- **Entrega.** Se não há card, cria um. Se há card, acumula as mensagens pendentes e entrega. Não entrega se o card está ocupado ou **Travado**: o travado espera você, e as pendentes vão junto com a sua resposta.
- **Anti-loop.** 5 retomadas em 1h pausam a conversa (provavelmente há um agente do outro lado).
- **Fora do quadro.** Conversa simples não aparece no quadro. Ela só entra se travar ou se o bloco trouxer `"trabalho":true`.
- **Aprendizado.** Texto de terceiros (Slack, suporte) nunca vira aprendizado.

### 5.7 Travado, observações e aguardando

**Bloco travado:**

```json
{"status":"travado","motivo":"decisao|aprovacao|acesso|erro",
 "aprovar":"<=140 chars, infinitivo","pergunta":"...","opcoes":["A","B"],"recomendacao":"A"}
```

- **Tela.** Mostra uma frase, o botão **Aprovar** e um campo de comentário. A resposta volta na mesma sessão como "Aprovado", "Aprovado COM AJUSTE: <comentário>" ou "Não aprovado: <motivo>".
- **Comentário.** É gravado em `ajustes` e pode virar aprendizado do `especialista` ou `geral`, sem duplicar.
- **Prompt `EXECUTA_OU_TRAVA`.** Lista o que se faz sem pedir e o que trava: RH, dinheiro, mensagem externa, segredo, ação destrutiva, status em sistema externo e pedido ambíguo.
- **Observações.** São injetadas na próxima rodada e marcadas como lidas.
- **Aguardando.** O bloco `{"status":"aguardando","checarEmMin":N}` deixa o card em Fazendo com ⏳. A vigia acorda o card e cobra uma vez depois de cerca de 1 dia útil. Se passar de `ORQ_AGUARDAR_MAX_H`=72, o card vai para Travado.

### 5.8 Dependências e subtasks

- **Dependências.** Um card com `depende_de_cards` só vai para Fazendo quando as dependências estiverem em Validação ou Concluído. Antes disso, a API responde 202 "agendada" (`rodar_ao_liberar`). Se uma dependência for arquivada, o card trava perguntando "tirar ou manter".
- **Subtasks.** A sessão fecha com:
  ```json
  {"status":"dividir","subtasks":[{"chave":"a","titulo":"...","descricao":"...","dependeDe":[],"especialista":"<id>"}]}
  ```
  - São de 2 a 8 subtasks, sem ciclo.
  - A mãe coordena sem sessão até a síntese.
  - A filha fecha direto em Concluído.
  - Uma subtask travada segura o ramo inteiro.
- **DAG puro.** `faltamCards`, `cicloCards` e `validarAdicao` são funções puras.
- **Valide tudo antes da 1ª escrita.** Uma requisição recusada nunca grava nada.

### 5.9 Prompts

- **Um prompt por tipo:** inicial, retomada, aguardando, validação, Slack, suporte, análise, melhoria, subtask e síntese.
- **Blocos comuns:**
  - `AUTONOMIA`: pelo menos 3 caminhos antes de travar;
  - `PROGRESSO`;
  - `LEVANTAMENTO`: ver o estado atual antes de agir (muita coisa já está em andamento);
  - `PRONTO QUANDO` + dono;
  - `AUSÊNCIA`: aviso temporário de férias, com data de expiração.
- **System prompt** = `conhecimento/regras.md` + `conhecimento/aprendizados.md` + o arquivo do especialista.

### 5.10 Variáveis principais

| variável | padrão / uso |
|---|---|
| `ORQ_PORTA`, `ORQ_CWD`, `ORQ_MAQUINA`, `ORQ_ESTADO`, `ORQ_DB` | onde roda e onde grava |
| `ORQ_MOTOR` | `herdr` ou `processo` |
| `ORQ_MAX_PARALELO` / `_SLACK` / `_HEIMER` / `_PAINEIS` | 3 / 3 / 1 / 8 |
| `ORQ_TIMEOUT_MIN` / `ORQ_SLACK_TIMEOUT_MIN` | 120 / 30 |
| `ORQ_SLACK_MIN`, `ORQ_SLACK_MAX_ATRASO_MIN`, `ORQ_SLACK_NUNCA_RESPONDER` | auto-resposta |
| `ORQ_AGUARDAR_MAX_H` | 72 |
| `ORQ_VIGIA_OCIOSO_MIN` | 10 |
| `ORQ_RETOMAR_AUTO`, `ORQ_PAI_PID` | boot e teste |
| `ORQ_<AGENTE>=0` | desliga um agente que tem tick (obrigatório em teste) |
| `ORQ_ESTACAO_<EST>=off` | kill-switch de estação (seção 6.3) |

### 5.11 systemd

```ini
# ~/.config/systemd/user/orquestrador.service
[Unit]
After=herdr-<sessao>.service
Wants=herdr-<sessao>.service
[Service]
Environment=ORQ_CWD=%h/<pasta-de-trabalho>
ExecStart=%h/projetos/orquestrador/scripts/orq.sh --servico
Restart=always
[Install]
WantedBy=default.target
```

- O `orq.sh` carrega `~/.env` e `~/.config/kit-agentes/segredos.env` (com `set -a`), exporta `TZ` e define `XDG_RUNTIME_DIR` quando ele falta.
- O servidor da sessão do herdr tem uma unit própria (`herdr-<sessao>.service`). Se usar `ORQ_MOTOR=processo`, tire as linhas `After`/`Wants`.
- Depois de mudar o código, reinicie: `systemctl --user restart orquestrador`.

---

## 6. Peça 3: linha de produção de agentes

### 6.1 Regras

- **O dono é o especialista.** O dono fica em `card.especialista`, e todos os especialistas usam o mesmo pool de vagas. Não crie outro orquestrador.
- **O id e o arquivo nunca mudam**, para não perder os aprendizados. Renomear muda só o nome e a descrição.
- **Análise não é task.** A contagem de carga usa um predicado puro `naLinha(card)`.
- **Execução nova nasce atrás de um interruptor desligado.** Recepção, Roteador e Coringa só gravam o dono.
- **Nome (convenção opcional):** um campeão do LoL que combine com a função, sem repetir. Formato `nome: <Campeão> · <função>`.

### 6.2 Catálogo de referência (adapte à sua área)

| tipo | agentes |
|---|---|
| Controle | Braum (Recepção) · Bard (Roteador) · Shaco (Coringa) · Zilean (Supervisor de carga, sem IA) · Pyke (Cobrador de terceiros) · Galio (Portão de saída) · Ivern (propõe agentes novos) |
| Estações de negócio | uma por processo (caixa de entrada, compras, campanhas, ciclo mensal, prospecção, cadastro, KPIs, financeiro...) |
| Código | Viktor (back), Jayce (front), Zeri (banco), Camille (integrações), Ornn (rotinas), Ekko (fila de CI) |
| QA | Rengar |
| Fora da linha | Heimerdinger (auto-melhoria), Yuumi (análise), Neeko (voz semanal) |

### 6.3 Template de especialista (`conhecimento/especialistas/<id>.md`)

```markdown
---
nome: <Campeão> · <Função>
curto: <Campeão>
icone: <ícone>
estacao: <C#|S#|N#>
papel: estacao            # estacao | controle | coringa
roteavel: sim
autonomia: A1 <...>; A2 <reversível>; A3 <só com Aprovar>
wip: 3
sla_h: 24
prioridade: P1
coringa_elegivel: sim
descricao: <Função>: <o que entrega e pra quem>.
quando: [<sinal 1>, <sinal 2>, <termo composto>]
skills: [<skill>]
mcps: [<mcp>]
repos: [<repo>]
---
# Missão
# Absorve            (tasks/rotinas que ele herda)
# Gatilho            (sinais | só por passagem | tick sem IA)
# Como trabalha      (levanta estado atual → roteiro → passa pra outra estação se não for dele)
# Autonomia por ação (tabela ação × A0..A3)
# Modo sombra        (kv <id>.sombra ligado até eval ≥ 90%)
# O que NÃO faz
# Regras próprias
# Armadilhas conhecidas
## Aprendizados      (só o orquestrador escreve, a partir do bloco final)
```

**Autonomia:**

| nível | o que pode |
|---|---|
| A0 | só leitura |
| A1 | rascunho, registro, DM para você |
| A2 | ação reversível no fluxo normal (PR com review, lançar indicador) |
| A3 | só com botão Aprovar: mensagem a terceiro, dinheiro, ação destrutiva |

**Kill-switch:** `ORQ_ESTACAO_<EST>=off` tira o agente da triagem, e o card cai no Coringa. A variável é lida a cada roteamento.

### 6.4 Mecanismos

- **Recepção.** Na criação do card, uma regra decide o dono. Se houver ambiguidade, o card fica sem dono.
- **Roteador.** Decide nesta ordem:
  1. Regra barata: um sinal no título vale 2, no corpo vale 1, e a origem tem peso próprio. A regra só decide com folga de pelo menos 2 pontos.
  2. A subtask herda o dono da mãe.
  3. Triagem com haiku.
  4. Coringa.

  O dono automático fica **desligado até o eval do roteador passar de 90%**.
- **Passagem** (`orqctl passar T### <esp> "motivo"`). É gravada na tabela `passagens`. Se o card estiver rodando, o turno termina e o card volta para a fila, na mesma sessão, com o dono novo. A passagem é recusada quando há mais de 3 passagens em 24h ou um ping-pong A→B→A em menos de 1h.
- **Coringa.** Assume provisoriamente o card que está sem dono há mais de 15 min, e a triagem roda de novo quando ele entra em Fazendo.
  - Só executa com o kv `coringa.executar` ligado (nasce desligado).
  - WIP 2, no máximo 2 ciclos por card, nunca A3.
  - Se o mesmo tema aparecer 3 vezes na semana, vira proposta de estação nova.
- **Supervisor (sem IA).** Mede cards sem dono, idade contra `sla_h`, aguardando, parados e WIP.
  - Só alerta na 3ª leitura vermelha seguida.
  - Manda 1 DM às 18h, só com alertas novos.
  - Nunca rebalanceia: só sugere.
- **QA (Rengar).** Depois de cada entrega de código com tela, testa com personas em PC 1366 e celular 390.
  - Os bugs são classificados como bloqueia, atrapalha ou cosmético.
  - Devolve para quem entregou com 1 "bloqueia" ou 2 "atrapalha".
  - Se o mesmo bug aparecer pela 3ª vez, o card vai para Travado.
  - Um hook barra escrita: o QA só encontra bugs, nunca altera nada.
- **Cobrador.** Tick de 10 min sem IA, só nos cards recebidos por passagem.
  - Régua em horas úteis, com no máximo 3 cobranças. Depois disso, escala para você.
  - Nasce em sombra. Fora da sombra, a cobrança vira Travado com Aprovar: o tick nunca envia nada sozinho.
- **Auto-melhoria (Heimerdinger).** Revisa por rodízio especialistas, skills e rotinas quando há falha, ajuste seu ou mais de 3 dias sem revisão.
  - Faz no máximo 3 melhorias por revisão.
  - Só roda com a fila de tasks vazia.

### 6.5 Evals

- **Prova:** `evals/<id>/casos.json`, com **erros reais** e a resposta certa (`conferido: false` até você conferir).
- **Rodada real:** o agente usa sonnet, e um juiz cego usa haiku.
- **Para sair da sombra ou subir de autonomia**, é preciso nota de pelo menos 90% com o gabarito **todo conferido por você**, mais 10 execuções seguidas sem correção. Abaixo disso, o servidor devolve 409.
- **CI:** valida só a estrutura das provas (`--seco`).

**Para ligar um agente novo:**
1. Crie o `.md`.
2. Escreva de 3 a 5 casos reais.
3. Deixe o interruptor desligado ou em sombra.
4. Rode o eval.
5. Confira o gabarito.
6. Tire da sombra (`orqctl <id> --sombra off`).

---

## 7. Peça 4: rotinas

### 7.1 Padrão

```bash
#!/usr/bin/env bash
# Quando: dias úteis 11h | Faz: ... | Saída: DM/canal só com item | Código: ... | Log: ... | Flags: ROTINA_DRY_RUN, ROTINA_FORCAR
set -u
export HOME=/home/<user> PATH=/usr/local/bin:/usr/bin:/bin:$HOME/.local/bin TZ=America/Sao_Paulo
exec 9>/tmp/rotina-<nome>.lock; flock -n 9 || exit 0
LOG=~/.local/state/rotinas/<nome>-$(date +%F).log
mkdir -p "$(dirname "$LOG")"
rc=0
{
  echo "===== $(date -Iseconds) início <nome> ====="
  # 1. marca por janela (<nome>.ultima-rodada = AAAA-MM-DD-11h); feriado/fim de semana → exit 0
  # 2. coleta determinística (python só leitura)
  # 3. sem item → exit 0 sem postar
  # 4. claude -p (timeout 10m, 2 tentativas, texto padrão se falhar) só ESCREVE o texto num JSON
  # 5. entrega: pedir-aprovacao → DM pelo bot → fallback
  # 6. grava estado/marca SÓ depois da entrega; em falha, rc=1
  echo "===== $(date -Iseconds) fim (exit $rc) ====="
} >>"$LOG" 2>&1
exit $rc
```

- **Crontab** com caminho absoluto para `~/.local/bin/rotina-<nome>.sh`. Nunca use um `rodar.sh` genérico.
- **Modo seco** (`ROTINA_DRY_RUN=1`): imprime a mensagem e o payload, sem postar e sem gravar estado. `ROTINA_FORCAR=1` ignora a marca e o dia útil.
- **Prompt do `claude -p`:** "rodada automática, não pergunte nada". Lista e botões nunca dependem do modelo.
- **Rodada parcial** (uma fonte falhou): posta o que tem e sai com **exit 1**.
- **Log:** linhas JSON com `"nivel":"erro"` marcam falha. Guarde os 30 logs mais recentes.

### 7.2 Healthcheck

Cada rotina declara um contrato com:
- a regex da linha de início;
- a regex da linha de fim (exit 0 = ok);
- as janelas (horário, tolerância, dias, duração máxima);
- o corpo do modo seco, que não conta;
- as falhas ancoradas: as frases de erro do Claude que saem com exit 0 (`Failed to authenticate`, `API Error`, `limit`, `^ERRO:`), mais `Traceback` e `"nivel":"erro"`.

O veredito vem da linha de fim e das falhas, **nunca** do "DM enviado", porque o aviso de falha também manda DM. **Para cada rotina nova, adicione uma entrada no contrato.**

---

## 8. Lições e armadilhas (todas reais)

**Robô do Slack**
- Persistir o evento antes do ack, com chave `canal:ts`, evita perder e duplicar eventos.
- Sem retry de rede, um SSL EOF derrubou um turno, que ficou sem resposta e sem aviso. Faça 3 retries em 429, 5xx, URLError e timeout.
- O clique demorado roda fora do listener, senão o ack estoura.
- Botão sem validade executa clique em mensagem velha. Use 48h.
- Faltar escopo de leitura dá `missing_scope`. Além disso, o bot só posta em canal do qual é membro.
- **Dois listeners dividem os eventos.** Na migração, desligue um antes de ligar o outro.

**Orquestradora**
- O argumento do herdr não aceita quebra de linha. Settings e system prompt vão por arquivo, e um prompt longo vira `.prompt.md` ("Leia o arquivo X").
- Um Enter se perdeu enquanto o Claude ainda carregava, e uma task ficou 30h parada. Confirme a entrega e nunca reenvie se a mensagem já está no histórico.
- Em pasta nova, o diálogo "trust this folder" nasce em "No, exit", e um Enter puro fecha o Claude. Desça para "Yes" antes.
- 429 crônico num app de conector compartilhado pela empresa: espaçar as chamadas não resolve. A saída foi **um token próprio**.
- Nunca use `import('./src/server.ts')` para testar. Isso subiu o servidor no banco real e gravou dono em 13 cards. Use `node --check`.
- O servidor de teste recebe `ORQ_PAI_PID` para não ficar órfão. Os testes fixam `ORQ_CWD` para não depender da máquina.
- Nunca faça `pgrep -f server.ts` + kill: o padrão pega o próprio shell. Use o PID gravado no estado ou o systemd.
- **O conserto só vale depois de reiniciar o servidor.**
- Sem `XDG_RUNTIME_DIR`, o `systemctl --user` falha com "No medium found".
- `--setting-sources ''` descarta o `apiKeyHelper`, e o `claude -p` passa a dizer "Not logged in". Repasse o helper.
- Escrever aprendizado direto no arquivo duplicava lições. O aprendizado entra só pelo campo do bloco final.
- Migração SQLite com vários ALTERs num mesmo if quebra. Faça um por vez.
- Uma função que grava dois carimbos que serão comparados deve ler o relógio uma vez só.

**Rotinas**
- O modelo só escreve texto. A lógica é determinística.
- Estado gravado antes da entrega faz o aviso se perder. Grave **depois**.
- Uma falha do Claude que sai com exit 0 só é detectada por uma regex ancorada no log.

---

## 9. Ordem de implantação e checklist

### MVP (1 dia)
- [ ] Arquivo de segredos com permissão 600 + wrapper com flock + log.
- [ ] App do Slack (Socket Mode, eventos, Interactivity, App Home).
- [ ] Robô: fila SQLite, 1 sessão por thread, placeholder → resposta, aviso em erro.
- [ ] Marcador `[[APROVAR]]` com botões que voltam para a mesma sessão.
- [ ] Unit systemd + linger. Validar com `simular --seco` e depois com um DM real.

### Semana 1: orquestradora básica
- [ ] SQLite `cards` + colunas + bloco final obrigatório (sem bloco → Travado).
- [ ] Executor com herdr (ou `processo`), sessão durável e hooks `guarda-escrita` e `fim-turno`.
- [ ] Fila com `ORQ_MAX_PARALELO` e trava de rodada.
- [ ] Tela com Aprovar + comentário no Travado.
- [ ] `pedir-aprovacao` para rotinas.

### Semana 2: autonomia
- [ ] Vigia de painel ocioso + retomada no boot.
- [ ] Aguardando com prazo máximo.
- [ ] Dependências e subtasks (DAG).
- [ ] Auto-resposta do Slack com token próprio (nasce desligada), `NUNCA_RESPONDER` e anti-loop.
- [ ] Trava da vaga do Slack.

### Semana 3+: linha de produção
- [ ] 2 ou 3 especialistas para os seus processos mais repetidos (template da seção 6.3).
- [ ] Evals com erros reais, conferidos por você.
- [ ] Roteador por regra. Triagem por IA só depois de 90%.
- [ ] Supervisor sem IA (DM às 18h).
- [ ] QA e Cobrador em sombra.

### Rotinas (em paralelo)
- [ ] Converter cada tarefa recorrente para o padrão da seção 7 (flock, modo seco, só fala quando tem algo).
- [ ] Uma entrada no contrato do healthcheck para cada rotina.

### Checklist final
- [ ] Nenhum token direto em config nem no chat.
- [ ] Só um listener do Slack ativo.
- [ ] Todo interruptor novo nasce desligado ou em sombra.
- [ ] Toda ação A3 passa por botão.
- [ ] O modo de permissão do Claude foi escolhido pela pessoa e, se não pede permissão, tem hook de guarda.
- [ ] Toda rotina tem flock, log com início e fim e entrada no healthcheck.
- [ ] O serviço foi reiniciado depois de cada mudança de código.