# Canvas de Projeto — SEGOV/SEGEST

Ferramenta interativa e guiada para elaboração do Canvas de Projeto das Administrações Regionais do Distrito Federal.

## 🎯 O que é

Assistente passo a passo que conduz os servidores dos Comitês Internos de Governança (CIGs) no preenchimento do Canvas de Projeto, com exemplos inspiradores e dicas em cada etapa.

## 🚀 Como publicar no GitHub Pages

1. Acesse as **Settings** deste repositório
2. No menu lateral, clique em **Pages**
3. Em **Source**, selecione **Deploy from a branch**
4. Em **Branch**, selecione `main` e pasta `/ (root)`
5. Clique em **Save**
6. Aguarde alguns minutos — o site estará disponível em:

```
https://casdfteste.github.io/canvas-projeto/
```

## 📬 Como enviar para as RAs

Inclua o link no ofício enviado pelo SEI:

> Para preenchimento do Canvas de Projeto, acesse:
> **https://casdfteste.github.io/canvas-projeto/**

## 💡 Funcionalidades

- ✅ Passo a passo guiado (uma pergunta por vez)
- ✅ Exemplos inspiradores de diferentes tipos de projeto
- ✅ Barra de progresso visual
- ✅ Salvar progresso em arquivo JSON (para continuar depois)
- ✅ Importar arquivo salvo anteriormente
- ✅ Imprimir / Exportar PDF para anexar no SEI
- ✅ Funciona em qualquer navegador (Chrome, Edge, Firefox)
- ✅ Responsivo (funciona em celular e tablet)

## 🤖 Agente Diário — Resumo de IA (The Rundown AI)

Script Google Apps Script que automatiza a leitura da newsletter **The Rundown AI**, traduz e resume o conteúdo em português brasileiro usando a API do Claude (Anthropic), e salva os resumos formatados no Google Docs.

### Como funciona

1. **Busca automática** — Todo dia, busca o e-mail mais recente de `news@daily.therundown.ai` no Gmail
2. **Tradução e resumo** — Envia o conteúdo para a API Claude (modelo Haiku) com um prompt estruturado
3. **Salva no Google Docs** — Cria documentos semanais organizados na pasta "Rundown AI - Resumos" do Drive, com formatação nativa (títulos, bullets, negrito)

### Seções do resumo

Cada resumo é organizado nas seguintes seções:

- **DESTAQUES DO DIA** — Principais notícias
- **FERRAMENTAS & PRODUTOS NOVOS** — Lançamentos com links e recomendação
- **NÚMEROS & DADOS RELEVANTES** — Estatísticas e métricas
- **CONTEXTO & ANÁLISE** — Análise editorial
- **RECOMENDAÇÃO DO DIA** — Destaque para experimentar

### Configuração

1. Abra o Google Apps Script (script.google.com)
2. Copie o conteúdo de `google-apps-script-resumo-ia.js`
3. Configure sua chave de API no campo `CONFIG.ANTHROPIC_API_KEY`
4. Execute `configurarGatilho()` uma vez para ativar a execução diária
5. Conceda as permissões solicitadas (Gmail, Drive, Docs, UrlFetch)

### Backfill (processar e-mails antigos)

Para processar newsletters anteriores em lotes:

```
iniciarBackfill()       // Inicia o processamento
continuarBackfill()     // Processa o próximo lote (10 e-mails)
verProgressoBackfill()  // Mostra o progresso atual
resetarBackfill()       // Reinicia o processo do zero
```

### Requisitos

- Conta Google com Gmail (assinante da newsletter The Rundown AI)
- Chave de API da Anthropic (console.anthropic.com)

> **Importante:** Nunca compartilhe sua chave de API. Armazene-a nas propriedades do script para maior segurança.

## 📄 Licença

Adaptado da Rede Conexão Inovação Pública — CC BY-NC-SA 4.0
