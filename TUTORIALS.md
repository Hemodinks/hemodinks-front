# Arquitetura dos tutoriais

## Fluxo

`TutorialConfig` é a fonte única para Driver.js, gerador de voz, auditoria, Playwright, legendas e composição. Todos os 12 tutoriais possuem texto e caminho MP3 derivados ou declarados na própria definição. O navegador baixa somente o áudio da etapa atual e faz preload da próxima; nunca chama o Azure.

```text
TutorialConfig -> Driver.js -> TutorialAudioPlayer -> MP3 estático
       |                                   |
       +-> Azure Speech (script local)     +-> eventos/atributos Playwright
                                               |
Playwright -> WebM sem áudio + timeline --------+
MP3 + timeline + legendas -> FFmpeg -> WebM/Opus e MP4/H.264/AAC
```

O `recordVideo` do Playwright não contém a narração da Web Speech API nem o áudio do elemento HTML. O FFmpeg adiciona deterministicamente os MP3 conforme a timeline, aplica loudness uniforme e grava legendas sincronizadas. Não existe captura de desktop ou do áudio do sistema operacional.

## Configuração do Azure Speech

Copie somente os placeholders da `.env.example` para variáveis do processo:

```powershell
$env:AZURE_SPEECH_KEY='chave-do-recurso-local'
$env:AZURE_SPEECH_REGION='brazilsouth'
$env:AZURE_SPEECH_VOICE='pt-BR-FranciscaNeural' # opcional
```

Nunca use prefixo `VITE_`: a chave é exclusiva dos scripts Node e não entra no bundle. A configuração central usa `pt-BR`, velocidade `+0%`, pitch `+0%`, volume Azure `default` e MP3 mono de 24 kHz/96 kbps. A região deve ser a do recurso Speech existente; o vídeo recebe normalização de loudness no FFmpeg.

## Autoria e geração

Para um novo tutorial:

1. Adicione seletores estáveis `data-tour` na tela.
2. Crie uma única definição no registro, com IDs semânticos e estáveis.
3. Separe `objective` de `narration.text` e defina `narration.audio`.
4. Descreva cliques, preenchimentos ou seleções em `interaction`.
5. Execute `npm run tutorial:audit`.
6. Execute primeiro `npm run tutorial:audio:dry-run -- reports`.
7. Gere apenas o tutorial desejado com `npm run tutorial:audio -- reports`.
8. Valide e grave com `npm run tutorial:record -- reports`.

`npm run tutorial:audio` considera todos os tutoriais, mas sintetiza somente arquivos ausentes ou cujo hash mudou. `--force` força o escopo informado; `--allow-large-generation` libera conscientemente uma execução acima de `TUTORIAL_TTS_MAX_CHARACTERS_PER_RUN`. A concorrência padrão é 2. O manifesto não contém segredos.

Se apenas `narration.text` de `filters` mudar, o dry-run deve marcar as outras seis etapas como `SKIP` e somente `filters` como `GENERATE`. O hash inclui tutorial, etapa, texto, SSML, voz, locale, velocidade, pitch, volume e formato.

## Pronúncia e SSML

Adicione termos reutilizáveis em `tutorialPronunciations.ts` e referencie-os por `pronunciationKeys`. Isso mantém o texto natural e aplica `<sub alias>` somente na síntese. Para testar rapidamente:

```powershell
npm run tutorial:voice-preview -- "HemoDinks, CBHPM, TISS e situação" --pronunciation=HemoDinks,CBHPM,TISS
```

O preview vai para `artifacts/tutorials/audio-preview`, diretório ignorado pelo Git. `narration.ssml` aceita um corpo SSML específico quando o dicionário não for suficiente.

## Runtime e acessibilidade

O player expõe `idle`, `loading`, `playing`, `paused`, `finished`, `error` e `disabled` em `data-tutorial-audio-state`. Também emite `tutorial:start`, `tutorial:step-change`, eventos de áudio, `tutorial:complete` e `tutorial:exit`. Pausar preserva a posição; continuar retoma; repetir volta a `currentTime = 0`; desativar áudio não bloqueia Driver.js. Falha de MP3 registra aviso e usa temporariamente Web Speech.

Teclado, Escape, foco do Driver.js, mobile e `prefers-reduced-motion` permanecem independentes do áudio. As chaves existentes de conclusão e “Não mostrar novamente” foram preservadas; a preferência de narração usa uma chave adicional.

## Gravação e solução de problemas

```powershell
npm run tutorial:audit
npm run tutorial:audio -- reports
npm run tutorial:record -- reports
```

A gravação local usa apenas fixtures fictícias e sanitizadas. O Playwright aguarda o estado `finished`, executa a interação declarada e adiciona a pausa visual central. O compositor gera SRT/ASS, WebM 1920×1080 e MP4 H.264 1920×1080. Os vídeos Piper anteriores estão preservados no subdiretório `legacy-piper` de cada tutorial publicado.

- `401`: confira a chave; `403`: confira autorização; `429`: aguarde quota/rate limit; `5xx`: tente novamente mais tarde.
- `400`: valide SSML, voz e dicionário.
- `ORPHAN`: o audit encontrou MP3 sem etapa; ele apenas informa, nunca apaga.
- `arquivo ausente`: gere áudio antes de gravar. O runtime segue com fallback, mas a gravação determinística exige MP3.

## Controle de custo e manutenção

Áudio não é gerado em build ou deploy. O desenvolvedor altera roteiro, executa dry-run, gera, escuta e versiona MP3 mais manifesto. A primeira chamada gera; a segunda, sem mudanças, precisa resultar em `SKIP` e zero chamada Azure.

Os 12 tutoriais foram migrados. Novos roteiros devem usar o mesmo normalizador ou declarar `narration` e `interaction` diretamente, gerar primeiro o escopo individual e manter qualquer vídeo anterior em `legacy-piper`. Não se deve regravar todos implicitamente; `tutorial:record:all` existe apenas como comando explícito.
