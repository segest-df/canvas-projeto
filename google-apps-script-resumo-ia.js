// ============================================================
// AGENTE DIARIO - THE RUNDOWN AI
// Google Apps Script + Claude API (Anthropic)
// Resumo em PT-BR com formatacao nativa no Google Docs
// ============================================================

const CONFIG = {
  ANTHROPIC_API_KEY: "YOUR_API_KEY_HERE",       // sk-ant-... (obtenha em console.anthropic.com)
  REMETENTE: "news@daily.therundown.ai",
  PASTA_DRIVE: "Rundown AI - Resumos",
  HORARIO_EXECUCAO: 8,
  LOTE_BACKFILL: 10,
};

// ============================================================
// FUNCAO PRINCIPAL - chamada pelo gatilho diario
// ============================================================
function processarRundownDiario() {
  const hoje = new Date();
  const emailConteudo = buscarEmailRundown(hoje);

  if (!emailConteudo) {
    Logger.log("Nenhum e-mail do Rundown encontrado hoje.");
    return;
  }

  const resumo = gerarResumoComClaude(emailConteudo, hoje);
  salvarNoGoogleDocs(resumo, hoje);
  Logger.log("Resumo gerado e salvo com sucesso!");
}

// ============================================================
// BACKFILL - processa todos os e-mails historicos em lotes
// ============================================================
function iniciarBackfill() {
  const props = PropertiesService.getScriptProperties();
  props.setProperty("backfill_offset", "0");
  props.setProperty("backfill_ativo", "true");
  props.deleteProperty("backfill_datas");

  Logger.log("Backfill iniciado! Execute 'continuarBackfill' ate concluir.");
  continuarBackfill();
}

function continuarBackfill() {
  const props = PropertiesService.getScriptProperties();

  if (props.getProperty("backfill_ativo") !== "true") {
    Logger.log("Nenhum backfill ativo. Execute 'iniciarBackfill' primeiro.");
    return;
  }

  let offset = parseInt(props.getProperty("backfill_offset") || "0");
  const threads = GmailApp.search(
    "from:" + CONFIG.REMETENTE, offset, CONFIG.LOTE_BACKFILL
  );

  if (threads.length === 0) {
    props.setProperty("backfill_ativo", "false");
    Logger.log("Backfill concluido! Todos os e-mails foram processados.");
    return;
  }

  Logger.log("Lote: e-mails " + (offset + 1) + " a " + (offset + threads.length) + "...");

  let processados = 0;
  let pulados = 0;

  for (const thread of threads) {
    const mensagem = thread.getMessages()[0];
    const data = mensagem.getDate();
    const conteudo = mensagem.getPlainBody();

    if (jaFoiProcessado(data)) {
      Logger.log("Pulando " + formatarData(data) + " - ja processado.");
      pulados++;
      continue;
    }

    try {
      const resumo = gerarResumoComClaude(conteudo, data);
      salvarNoGoogleDocs(resumo, data);
      marcarComoProcessado(data);
      Logger.log(formatarData(data) + " processado.");
      processados++;
      Utilities.sleep(2000);
    } catch (e) {
      Logger.log("Erro em " + formatarData(data) + ": " + e.message);
    }
  }

  offset += threads.length;
  props.setProperty("backfill_offset", offset.toString());

  Logger.log("Lote concluido: " + processados + " processados, " + pulados + " pulados.");

  if (threads.length < CONFIG.LOTE_BACKFILL) {
    props.setProperty("backfill_ativo", "false");
    Logger.log("Backfill concluido!");
  } else {
    Logger.log("Execute 'continuarBackfill' para o proximo lote.");
  }
}

function verProgressoBackfill() {
  const props = PropertiesService.getScriptProperties();
  const offset = props.getProperty("backfill_offset") || "0";
  const ativo = props.getProperty("backfill_ativo") || "false";
  const processados = props.getProperty("backfill_datas") || "";
  const total = processados ? processados.split(",").filter(Boolean).length : 0;

  Logger.log("Ativo: " + ativo + " | Offset: " + offset + " | Processados: " + total);
}

function resetarBackfill() {
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty("backfill_offset");
  props.deleteProperty("backfill_ativo");
  props.deleteProperty("backfill_datas");
  Logger.log("Backfill resetado.");
}

// ============================================================
// CONTROLE DE DUPLICATAS
// ============================================================
function jaFoiProcessado(data) {
  const props = PropertiesService.getScriptProperties();
  const processados = props.getProperty("backfill_datas") || "";
  return processados.split(",").includes(formatarData(data));
}

function marcarComoProcessado(data) {
  const props = PropertiesService.getScriptProperties();
  const processados = props.getProperty("backfill_datas") || "";
  const lista = processados ? processados.split(",") : [];
  lista.push(formatarData(data));
  props.setProperty("backfill_datas", lista.join(","));
}

function formatarData(data) {
  return Utilities.formatDate(data, Session.getScriptTimeZone(), "yyyy-MM-dd");
}

// ============================================================
// 1. BUSCAR E-MAIL DO DIA
// ============================================================
function buscarEmailRundown(data) {
  const dataFormatada = Utilities.formatDate(
    data, Session.getScriptTimeZone(), "yyyy/MM/dd"
  );
  const threads = GmailApp.search(
    "from:" + CONFIG.REMETENTE + " after:" + dataFormatada, 0, 1
  );

  if (threads.length === 0) {
    const ontem = new Date(data);
    ontem.setDate(ontem.getDate() - 1);
    const ontemFormatado = Utilities.formatDate(
      ontem, Session.getScriptTimeZone(), "yyyy/MM/dd"
    );
    const threadsOntem = GmailApp.search(
      "from:" + CONFIG.REMETENTE + " after:" + ontemFormatado, 0, 1
    );
    if (threadsOntem.length === 0) return null;
    return threadsOntem[0].getMessages()[0].getPlainBody();
  }

  return threads[0].getMessages()[0].getPlainBody();
}

// ============================================================
// 2. CLAUDE API - traduzir e resumir
// ============================================================
function gerarResumoComClaude(conteudo, data) {
  const dataLegivel = Utilities.formatDate(
    data, Session.getScriptTimeZone(), "dd/MM/yyyy"
  );

  const prompt =
    "Voce e um assistente especializado em IA e tecnologia. " +
    "Abaixo esta o conteudo de uma newsletter diaria em ingles chamada " +
    '"The Rundown AI".\n\n' +
    "Sua tarefa:\n" +
    "1. Traduzir e resumir em portugues brasileiro\n" +
    "2. Organizar EXATAMENTE nessas secoes, usando esses titulos:\n\n" +
    "DESTAQUES DO DIA\n" +
    "- bullet 1\n" +
    "- bullet 2\n\n" +
    "FERRAMENTAS & PRODUTOS NOVOS\n" +
    "- **Nome da ferramenta**: o que faz. Link: url. Vale testar? sim/nao\n\n" +
    "NUMEROS & DADOS RELEVANTES\n" +
    "- dado 1\n\n" +
    "CONTEXTO & ANALISE\n" +
    "Paragrafo de analise aqui.\n\n" +
    "RECOMENDACAO DO DIA\n" +
    "Descreva a ferramenta ou novidade mais interessante para experimentar.\n\n" +
    "Use **negrito** para destacar nomes de produtos e dados importantes.\n" +
    "Data da edicao: " + dataLegivel + "\n\n" +
    "--- CONTEUDO ---\n" + conteudo + "\n--- FIM ---";

  const payload = {
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  };

  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "x-api-key": CONFIG.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  const response = UrlFetchApp.fetch(
    "https://api.anthropic.com/v1/messages", options
  );
  const json = JSON.parse(response.getContentText());

  if (json.error) throw new Error(json.error.message);
  return json.content[0].text;
}

// ============================================================
// 3. SALVAR NO GOOGLE DOCS - com formatacao nativa
// ============================================================
function salvarNoGoogleDocs(resumo, data) {
  const pasta = obterOuCriarPasta(CONFIG.PASTA_DRIVE);
  const doc = obterOuCriarDoc(obterNomeDocSemanal(data), pasta);
  const body = doc.getBody();

  const dataLegivel = Utilities.formatDate(
    data, Session.getScriptTimeZone(), "dd 'de' MMMM 'de' yyyy"
  );

  body.appendHorizontalRule();

  const titulo = body.appendParagraph(dataLegivel.toUpperCase());
  titulo.setHeading(DocumentApp.ParagraphHeading.HEADING2);
  titulo.editAsText().setForegroundColor("#1a73e8").setBold(true);

  renderizarMarkdown(body, resumo);
  doc.saveAndClose();
}

function renderizarMarkdown(body, texto) {
  const linhas = texto.split("\n");

  for (var i = 0; i < linhas.length; i++) {
    var linha = linhas[i];

    if (linha.trim() === "") {
      body.appendParagraph("");
      continue;
    }

    // Secoes com emoji
    if (/^[🔥🛠📊🌐💡]/.test(linha)) {
      var p = body.appendParagraph(linha.trim());
      p.setHeading(DocumentApp.ParagraphHeading.HEADING3);
      p.editAsText().setBold(true).setForegroundColor("#1a73e8");
      continue;
    }

    // Titulos ###
    if (linha.startsWith("### ")) {
      var p = body.appendParagraph(linha.replace("### ", "").trim());
      p.setHeading(DocumentApp.ParagraphHeading.HEADING3);
      p.editAsText().setForegroundColor("#1a73e8");
      continue;
    }

    // Titulos ##
    if (linha.startsWith("## ")) {
      var p = body.appendParagraph(linha.replace("## ", "").trim());
      p.setHeading(DocumentApp.ParagraphHeading.HEADING2);
      p.editAsText().setForegroundColor("#1a73e8");
      continue;
    }

    // Bullets - ou *
    if (/^[\-\*] /.test(linha)) {
      var conteudo = linha.replace(/^[\-\*] /, "").trim();
      var p = body.appendParagraph("\u2022 " + conteudo);
      p.setHeading(DocumentApp.ParagraphHeading.NORMAL);
      p.setIndentStart(18);
      aplicarNegrito(p);
      continue;
    }

    // Bullets numerados
    if (/^\d+\. /.test(linha)) {
      var p = body.appendParagraph(linha.trim());
      p.setIndentStart(18);
      aplicarNegrito(p);
      continue;
    }

    // Paragrafo normal
    var p = body.appendParagraph(linha.trim());
    p.setHeading(DocumentApp.ParagraphHeading.NORMAL);
    aplicarNegrito(p);
  }
}

function aplicarNegrito(paragrafo) {
  var texto = paragrafo.getText();
  if (texto.indexOf("**") === -1) return;

  var novoTexto = texto.replace(/\*\*(.+?)\*\*/g, "$1");
  paragrafo.editAsText().setText(novoTexto);

  var partes = texto.split(/(\*\*.+?\*\*)/);
  var pos = 0;

  for (var i = 0; i < partes.length; i++) {
    var parte = partes[i];
    if (parte.startsWith("**") && parte.endsWith("**")) {
      var inner = parte.slice(2, -2);
      if (inner.length > 0) {
        paragrafo.editAsText().setBold(pos, pos + inner.length - 1, true);
      }
      pos += inner.length;
    } else {
      pos += parte.length;
    }
  }
}

// ============================================================
// UTILITARIOS
// ============================================================
function obterOuCriarPasta(nome) {
  const pastas = DriveApp.getFoldersByName(nome);
  return pastas.hasNext() ? pastas.next() : DriveApp.createFolder(nome);
}

function obterNomeDocSemanal(data) {
  const diaSemana = data.getDay();
  const diff = diaSemana === 0 ? -6 : 1 - diaSemana;
  const segunda = new Date(data);
  segunda.setDate(data.getDate() + diff);
  const sexta = new Date(segunda);
  sexta.setDate(segunda.getDate() + 4);

  const fmt = function (d) {
    return Utilities.formatDate(d, Session.getScriptTimeZone(), "dd/MM");
  };
  return "Rundown AI - Semana " + fmt(segunda) + " a " + fmt(sexta);
}

function obterOuCriarDoc(nomeDoc, pasta) {
  const arquivos = pasta.getFilesByName(nomeDoc);
  if (arquivos.hasNext()) return DocumentApp.openById(arquivos.next().getId());

  const doc = DocumentApp.create(nomeDoc);
  DriveApp.getFileById(doc.getId()).moveTo(pasta);

  const body = doc.getBody();
  const h = body.appendParagraph("THE RUNDOWN AI - Resumos Semanais em PT-BR");
  h.setHeading(DocumentApp.ParagraphHeading.HEADING1);
  h.editAsText().setForegroundColor("#1a73e8").setBold(true);

  body.appendParagraph(
    "Gerado automaticamente via Google Apps Script + Claude API"
  ).editAsText().setItalic(true);

  return doc;
}

// ============================================================
// GATILHO AUTOMATICO - execute UMA VEZ
// ============================================================
function configurarGatilho() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    ScriptApp.deleteTrigger(t);
  });

  ScriptApp.newTrigger("processarRundownDiario")
    .timeBased()
    .everyDays(1)
    .atHour(CONFIG.HORARIO_EXECUCAO)
    .create();

  Logger.log(
    "Gatilho configurado: todo dia as " + CONFIG.HORARIO_EXECUCAO + "h"
  );
}

// TESTE MANUAL
function testarAgora() {
  processarRundownDiario();
}
