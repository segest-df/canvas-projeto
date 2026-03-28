/**
 * =============================================================
 * GOOGLE APPS SCRIPT — Plano de Ação do CIG | VERSÃO PRODUÇÃO
 * =============================================================
 *
 * COMO USAR:
 * 1. Abra a planilha Google Sheets que vai receber os dados
 * 2. Clique em Extensões > Apps Script
 * 3. Apague o código que aparecer e cole TODO este arquivo
 * 4. Altere o valor de ADMIN_EMAIL para seu e-mail institucional
 * 5. Clique em Implantar > Nova implantação > Web App
 *    - Executar como: "Eu mesmo"
 *    - Quem pode acessar: "Qualquer pessoa"
 * 6. Copie a URL gerada e cole no index.html (instrução no guia)
 *
 * =============================================================
 */

// ✉️ E-mail do administrador que receberá notificação a cada envio
var ADMIN_EMAIL = 'adacto.oliveira@buriti.df.gov.br';

// 📋 Nome da aba da planilha onde os dados serão gravados
var NOME_ABA = 'Planos de Ação';

// Busca o logo do GDF automaticamente do site
function getLogoBlob() {
  try {
    var response = UrlFetchApp.fetch('https://casdfteste.github.io/canvas-projeto/');
    var html = response.getContentText();
    var regex = /src="data:image\/png;base64,([A-Za-z0-9+\/=]+)"/;
    var match = html.match(regex);
    if (match && match[1]) {
      return Utilities.newBlob(Utilities.base64Decode(match[1]), 'image/png', 'logo-gdf.png');
    }
  } catch(e) {
    Logger.log('Erro ao buscar logo: ' + e.toString());
  }
  return null;
}

// Monta o cabeçalho timbrado em HTML
function montarTimbrado() {
  return '<div style="background:#1a5276;border-radius:8px 8px 0 0;padding:14px 20px;">' +
    '<table cellpadding="0" cellspacing="0" border="0"><tr>' +
    '<td style="vertical-align:middle;padding-right:14px;">' +
    '<img src="cid:gdfLogo" alt="GDF" style="height:45px;" />' +
    '</td>' +
    '<td style="vertical-align:middle;">' +
    '<div style="color:#ffffff;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;font-family:Arial,sans-serif;">SECRETARIA DE GOVERNO &bull; CONTROLADORIA-GERAL DO DF</div>' +
    '<div style="color:#ffffff;font-size:16px;font-weight:bold;font-family:Arial,sans-serif;margin-top:3px;">Plano de A&ccedil;&atilde;o do CIG</div>' +
    '</td>' +
    '</tr></table>' +
    '</div>' +
    '<div style="height:4px;background:linear-gradient(to right,#27ae60,#f1c40f,#e74c3c,#2980b9);"></div>';
}


// =============================================================
// doPost — Recebe o formulário, grava na planilha e envia e-mails
// =============================================================
function doPost(e) {
  try {
    var dados = JSON.parse(e.postData.contents);

    // --- 1. GRAVAR NA PLANILHA ---
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheetByName(NOME_ABA);

    // Criar aba se não existir e adicionar cabeçalho
    if (!sheet) {
      sheet = spreadsheet.insertSheet(NOME_ABA);
      sheet.appendRow([
        'Data/Hora',
        'Nº do Plano',
        'Versão',
        'RA',
        'Prática de Governança',
        'Nome do Responsável',
        'Cargo/Função',
        'E-mail do Responsável',
        'Nome do Projeto',
        'Objetivo',
        'Descrição',
        'Produto Principal',
        'Características',
        'Justificativa',
        'Indicador',
        'Patrocínio/Gestão',
        'Equipe Executora',
        'Público-alvo',
        'Premissas',
        'Barreiras',
        'Riscos',
        'Nº de Entregas',
        'Entregas (JSON)',
        'Processo SEI',
        'Status'
      ]);

      // Formatar cabeçalho
      var headerRange = sheet.getRange(1, 1, 1, 25);
      headerRange.setBackground('#1a6b3a');
      headerRange.setFontColor('#ffffff');
      headerRange.setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    // Montar linha de dados
    var entregas = dados.entregas || [];
    var dataHora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    // Determinar número do plano e versão
    var numeroPlan = (dados.numero_plano || '').toString().trim();
    var versao = 1;

    if (numeroPlan) {
      // É uma revisão — incrementar versão
      versao = getVersao(sheet, numeroPlan);
    } else {
      // Novo plano — gerar número sequencial
      numeroPlan = gerarNumeroPlan(sheet);
    }

    var ehRevisao = versao > 1;

    sheet.appendRow([
      dataHora,
      numeroPlan,
      versao,
      dados.ra || '',
      dados.pratica || '',
      dados.responsavel_nome || '',
      dados.cargo || '',
      dados.responsavel_email || '',
      dados.projeto || '',
      dados.objetivo || '',
      dados.descricao || '',
      dados.produto || '',
      dados.caracteristicas || '',
      dados.justificativa || '',
      dados.indicador || '',
      dados.patrocinio || '',
      dados.equipe || '',
      dados.publico || '',
      dados.premissas || '',
      dados.barreiras || '',
      dados.riscos || '',
      entregas.length,
      JSON.stringify(entregas),
      dados.processo_sei || '',
      ehRevisao ? 'Revisão recebida' : 'Recebido'
    ]);

    // Ajustar largura das colunas
    try { sheet.autoResizeColumns(1, 25); } catch(e) {}


    // --- 2. GERAR PDF DO PLANO E ENVIAR AO ADMINISTRADOR ---
    try {
      var pdfBlob = gerarPDFPlano(dados, entregas, dataHora, numeroPlan, versao);

      var labelEnvio = ehRevisao
        ? '🔄 REVISÃO v' + versao + ' | ' + numeroPlan
        : '🆕 NOVO PLANO | ' + numeroPlan;

      var assuntoAdmin = labelEnvio + ' | ' + (dados.ra || 'RA não informada') + ' | ' + (dados.projeto || 'sem nome');

      function campo(label, valor) {
        if (!valor) return '';
        return '<tr><td style="background:#f0f4f8;font-weight:bold;padding:8px 12px;width:180px;border:1px solid #ddd;font-size:13px;">' + label + '</td>' +
               '<td style="padding:8px 12px;border:1px solid #ddd;font-size:13px;">' + valor + '</td></tr>';
      }

      var entregasHtml = '';
      if (entregas.length > 0) {
        entregas.forEach(function(ent, i) {
          entregasHtml += '<tr><td style="padding:6px 12px;border:1px solid #ddd;font-size:13px;">' + (i+1) + '</td>' +
            '<td style="padding:6px 12px;border:1px solid #ddd;font-size:13px;">' + (ent.entrega || '') + '</td>' +
            '<td style="padding:6px 12px;border:1px solid #ddd;font-size:13px;">' + (ent.responsavel || '') + '</td>' +
            '<td style="padding:6px 12px;border:1px solid #ddd;font-size:13px;">' + (ent.prazo || '') + '</td>' +
            '<td style="padding:6px 12px;border:1px solid #ddd;font-size:13px;">' + (ent.investimento || '') + '</td></tr>';
        });
      } else {
        entregasHtml = '<tr><td colspan="5" style="padding:8px 12px;border:1px solid #ddd;color:#999;font-style:italic;">Nenhuma entrega cadastrada</td></tr>';
      }

      var corBanner = ehRevisao ? '#b45309' : '#1a3a5c';
      var textoBanner = ehRevisao
        ? 'REVISÃO v' + versao + ' DO PLANO DE AÇÃO RECEBIDA'
        : 'NOVO PLANO DE AÇÃO DO CIG RECEBIDO';

      var htmlAdmin =
        '<div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;color:#333;">' +
        '<div style="background:' + corBanner + ';padding:14px;text-align:center;">' +
        '<h2 style="color:#fff;margin:0;font-size:18px;">' + textoBanner + '</h2>' +
        '</div>' +
        '<div style="background:#f8f9fa;border-left:4px solid ' + corBanner + ';padding:12px 16px;margin:16px 16px 0;">' +
        '<p style="margin:0;font-size:15px;font-weight:bold;color:' + corBanner + ';">Nº do Plano: ' + numeroPlan + ' &nbsp;|&nbsp; Versão: ' + versao + '</p>' +
        '</div>' +
        '<div style="padding:20px;">' +
        '<table style="width:100%;border-collapse:collapse;margin-bottom:20px;">' +
        campo('Região Administrativa', dados.ra) +
        campo('Prática de Governança', dados.pratica) +
        campo('Processo SEI', dados.processo_sei) +
        campo('Data/Hora', dataHora) +
        '</table>' +
        '<h3 style="color:#1a3a5c;border-bottom:2px solid #1a3a5c;padding-bottom:4px;">Responsável</h3>' +
        '<table style="width:100%;border-collapse:collapse;margin-bottom:20px;">' +
        campo('Nome', dados.responsavel_nome) +
        campo('Cargo/Função', dados.cargo) +
        campo('E-mail', dados.responsavel_email) +
        '</table>' +
        '<h3 style="color:#1a3a5c;border-bottom:2px solid #1a3a5c;padding-bottom:4px;">Projeto</h3>' +
        '<table style="width:100%;border-collapse:collapse;margin-bottom:20px;">' +
        campo('Nome do Projeto', dados.projeto) +
        campo('Objetivo', dados.objetivo) +
        campo('Descrição', dados.descricao) +
        campo('Produto Principal', dados.produto) +
        campo('Características', dados.caracteristicas) +
        campo('Justificativa', dados.justificativa) +
        campo('Indicador', dados.indicador) +
        '</table>' +
        '<h3 style="color:#1a3a5c;border-bottom:2px solid #1a3a5c;padding-bottom:4px;">Partes Interessadas</h3>' +
        '<table style="width:100%;border-collapse:collapse;margin-bottom:20px;">' +
        campo('Patrocínio/Gestão', dados.patrocinio) +
        campo('Equipe Executora', dados.equipe) +
        campo('Público-alvo', dados.publico) +
        '</table>' +
        '<h3 style="color:#1a3a5c;border-bottom:2px solid #1a3a5c;padding-bottom:4px;">Entregas (' + entregas.length + ')</h3>' +
        '<table style="width:100%;border-collapse:collapse;margin-bottom:20px;">' +
        '<tr style="background:#1a3a5c;color:#fff;">' +
        '<th style="padding:8px;border:1px solid #ddd;font-size:12px;">#</th>' +
        '<th style="padding:8px;border:1px solid #ddd;font-size:12px;">Entrega</th>' +
        '<th style="padding:8px;border:1px solid #ddd;font-size:12px;">Responsável</th>' +
        '<th style="padding:8px;border:1px solid #ddd;font-size:12px;">Prazo</th>' +
        '<th style="padding:8px;border:1px solid #ddd;font-size:12px;">Investimento</th>' +
        '</tr>' + entregasHtml + '</table>' +
        '<h3 style="color:#1a3a5c;border-bottom:2px solid #1a3a5c;padding-bottom:4px;">Premissas, Barreiras e Riscos</h3>' +
        '<table style="width:100%;border-collapse:collapse;margin-bottom:20px;">' +
        campo('Premissas', dados.premissas) +
        campo('Barreiras', dados.barreiras) +
        campo('Riscos', dados.riscos) +
        '</table>' +
        (pdfBlob ? '<div style="background:#d4edda;border:1px solid #c3e6cb;padding:12px 16px;border-radius:6px;margin-bottom:16px;color:#155724;">📎 O PDF do plano está anexado a este e-mail.</div>' : '') +
        '</div>' +
        '<div style="background:#f0f4f8;padding:10px 16px;text-align:center;font-size:11px;color:#666;">' +
        'Sistema CIG — Plano de Ação das Administrações Regionais | SEGEST/SEGOV' +
        '</div></div>';

      var logoAdmin = getLogoBlob();
      var htmlAdminComTimbrado = montarTimbrado() + htmlAdmin;
      var emailOpts = {
        to: ADMIN_EMAIL,
        subject: assuntoAdmin,
        htmlBody: htmlAdminComTimbrado,
        name: 'Plano de Ação / CIG SEGOV'
      };
      if (logoAdmin) emailOpts.inlineImages = {gdfLogo: logoAdmin};
      if (pdfBlob) emailOpts.attachments = [pdfBlob];
      MailApp.sendEmail(emailOpts);

    } catch (emailAdminErr) {
      Logger.log('Erro ao enviar e-mail para admin: ' + emailAdminErr.toString());
    }


    // --- 3. E-MAIL DE CONFIRMAÇÃO PARA O SERVIDOR DA RA ---
    try {
      var emailResponsavel = dados.responsavel_email || '';

      if (emailResponsavel && emailResponsavel.includes('@')) {
        var primeiroNome = dados.responsavel_nome ? dados.responsavel_nome.split(' ')[0] : 'servidor(a)';
        var assuntoConfirmacao = ehRevisao
          ? '✅ Revisão v' + versao + ' recebida | ' + numeroPlan + ' | ' + (dados.ra || 'CIG')
          : '✅ Plano de Ação registrado | ' + numeroPlan + ' | ' + (dados.ra || 'CIG');

        var textoEnvio = ehRevisao
          ? 'A revisão v' + versao + ' do seu Plano de Ação foi recebida com sucesso pela SEGEST/SEGOV.'
          : 'Seu Plano de Ação foi registrado com sucesso pela SEGEST/SEGOV.';

        var htmlConfirmacao =
          '<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;color:#333;">' +
          '<div style="padding:24px;">' +
          '<p style="font-size:15px;">Olá, <strong>' + primeiroNome + '</strong>!</p>' +
          '<p>' + textoEnvio + '</p>' +
          '<div style="background:#e8f4fd;border:2px solid #1a3a5c;border-radius:8px;padding:16px 20px;margin:20px 0;text-align:center;">' +
          '<p style="margin:0 0 4px;font-size:13px;color:#555;">Número do seu Plano de Ação</p>' +
          '<p style="margin:0;font-size:26px;font-weight:bold;color:#1a3a5c;letter-spacing:2px;">' + numeroPlan + '</p>' +
          (ehRevisao ? '<p style="margin:6px 0 0;font-size:13px;color:#b45309;font-weight:bold;">Revisão v' + versao + '</p>' : '') +
          '<p style="margin:10px 0 0;font-size:12px;color:#666;">⚠️ Guarde este número. Ele será necessário para enviar revisões do plano.</p>' +
          '</div>' +
          '<table style="width:100%;border-collapse:collapse;margin-bottom:16px;">' +
          '<tr><td style="background:#f0f4f8;font-weight:bold;padding:8px 12px;border:1px solid #ddd;font-size:13px;width:160px;">Data/Hora</td>' +
          '<td style="padding:8px 12px;border:1px solid #ddd;font-size:13px;">' + dataHora + '</td></tr>' +
          '<tr><td style="background:#f0f4f8;font-weight:bold;padding:8px 12px;border:1px solid #ddd;font-size:13px;">Região Administrativa</td>' +
          '<td style="padding:8px 12px;border:1px solid #ddd;font-size:13px;">' + (dados.ra || '') + '</td></tr>' +
          '<tr><td style="background:#f0f4f8;font-weight:bold;padding:8px 12px;border:1px solid #ddd;font-size:13px;">Projeto</td>' +
          '<td style="padding:8px 12px;border:1px solid #ddd;font-size:13px;">' + (dados.projeto || '') + '</td></tr>' +
          '<tr><td style="background:#f0f4f8;font-weight:bold;padding:8px 12px;border:1px solid #ddd;font-size:13px;">Entregas</td>' +
          '<td style="padding:8px 12px;border:1px solid #ddd;font-size:13px;">' + entregas.length + '</td></tr>' +
          '<tr><td style="background:#f0f4f8;font-weight:bold;padding:8px 12px;border:1px solid #ddd;font-size:13px;">Processo SEI</td>' +
          '<td style="padding:8px 12px;border:1px solid #ddd;font-size:13px;">' + (dados.processo_sei || '') + '</td></tr>' +
          '</table>' +
          '<p style="font-size:13px;color:#555;">A Secretaria Executiva de Gestão Estratégica (SEGEST) irá analisar seu plano e retornará com orientações técnicas para aprimorá-lo.</p>' +
          '<p style="font-size:13px;color:#555;">Em caso de dúvidas, responda a este e-mail ou entre em contato diretamente com a equipe da SEGEST.</p>' +
          '</div>' +
          '<div style="background:#f0f4f8;padding:10px 16px;text-align:center;font-size:11px;color:#666;">' +
          'Sistema CIG — Plano de Ação das Administrações Regionais | SEGEST/SEGOV' +
          '</div></div>';

        var logoRA = getLogoBlob();
        var htmlConfComTimbrado = montarTimbrado() + htmlConfirmacao;
        var emailConfOpts = {
          to: emailResponsavel,
          subject: assuntoConfirmacao,
          htmlBody: htmlConfComTimbrado,
          name: 'Plano de Ação / CIG SEGOV'
        };
        if (logoRA) emailConfOpts.inlineImages = {gdfLogo: logoRA};
        MailApp.sendEmail(emailConfOpts);
      }

    } catch (emailRespErr) {
      Logger.log('Erro ao enviar confirmação ao responsável: ' + emailRespErr.toString());
    }


    // --- 4. RETORNAR SUCESSO COM O NÚMERO DO PLANO ---
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'ok',
        mensagem: 'Plano recebido e gravado com sucesso.',
        numero_plano: numeroPlan,
        versao: versao
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log('Erro geral no doPost: ' + err.toString());
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', mensagem: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}


// =============================================================
// doGet — Retorna todos os planos gravados (para painel admin)
// =============================================================
function doGet(e) {
  try {
    var token = e.parameter.token || '';

    // Proteção simples por token — altere para uma senha sua
    var TOKEN_ADMIN = 'cigdf2026';
    if (token !== TOKEN_ADMIN) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'erro', mensagem: 'Acesso não autorizado.' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheetByName(NOME_ABA);

    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'ok', total: 0, registros: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var dataRange = sheet.getDataRange();
    var values = dataRange.getValues();
    var headers = values[0];
    var registros = [];

    for (var i = 1; i < values.length; i++) {
      var obj = {};
      headers.forEach(function(h, j) {
        obj[h] = values[i][j];
      });
      registros.push(obj);
    }

    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'ok',
        total: registros.length,
        registros: registros
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', mensagem: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}


// =============================================================
// gerarNumeroPlan — Gera número sequencial CIG-YYYY-NNN
// =============================================================
function gerarNumeroPlan(sheet) {
  var ano = new Date().getFullYear();
  var prefixo = 'CIG-' + ano + '-';
  var maxNum = 0;

  try {
    if (sheet && sheet.getLastRow() > 1) {
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var colIdx = headers.indexOf('Nº do Plano');
      if (colIdx >= 0) {
        var data = sheet.getDataRange().getValues();
        for (var r = 1; r < data.length; r++) {
          var num = (data[r][colIdx] || '').toString();
          if (num.indexOf(prefixo) === 0) {
            var n = parseInt(num.replace(prefixo, ''), 10);
            if (!isNaN(n) && n > maxNum) maxNum = n;
          }
        }
      }
    }
  } catch(e) {
    Logger.log('Aviso ao gerar número: ' + e.toString());
  }

  var seq = maxNum + 1;
  var seqStr = seq < 10 ? '00' + seq : (seq < 100 ? '0' + seq : '' + seq);
  return prefixo + seqStr;
}


// =============================================================
// getVersao — Retorna a próxima versão para um plano existente
// =============================================================
function getVersao(sheet, numeroPlan) {
  try {
    if (!sheet || sheet.getLastRow() <= 1) return 2;
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var colIdx = headers.indexOf('Nº do Plano');
    if (colIdx < 0) return 2;
    var data = sheet.getDataRange().getValues();
    var count = 0;
    for (var r = 1; r < data.length; r++) {
      if ((data[r][colIdx] || '').toString() === numeroPlan) count++;
    }
    return count + 1;
  } catch(e) {
    return 2;
  }
}


// =============================================================
// gerarPDFPlano — Gera PDF do plano via Google Docs e retorna blob
// =============================================================
function gerarPDFPlano(dados, entregas, dataHora, numeroPlan, versao) {
  try {
    var nomeArquivo = 'PlanoAcao_CIG_' + numeroPlan.replace(/[^a-zA-Z0-9]/g, '_');
    if (versao > 1) nomeArquivo += '_v' + versao;

    var doc = DocumentApp.create(nomeArquivo);
    var body = doc.getBody();

    body.setMarginTop(36).setMarginBottom(36).setMarginLeft(54).setMarginRight(54);

    var titulo = body.appendParagraph('GOVERNO DO DISTRITO FEDERAL');
    titulo.setHeading(DocumentApp.ParagraphHeading.HEADING2);
    titulo.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    titulo.editAsText().setForegroundColor('#1a3a5c');

    body.appendParagraph('Secretaria de Estado de Governo')
      .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    body.appendParagraph('Secretaria Executiva de Gestão Estratégica — SEGEST')
      .setAlignment(DocumentApp.HorizontalAlignment.CENTER);

    body.appendHorizontalRule();

    var tituloPrincipal = body.appendParagraph('PLANO DE AÇÃO DO CIG');
    tituloPrincipal.setHeading(DocumentApp.ParagraphHeading.HEADING1);
    tituloPrincipal.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    tituloPrincipal.editAsText().setForegroundColor('#1a3a5c');

    var linhaNum = numeroPlan + (versao > 1 ? '  |  Revisão v' + versao : '  |  Versão 1');
    body.appendParagraph(linhaNum).setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    body.appendParagraph('Data de envio: ' + dataHora).setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    body.appendHorizontalRule();

    function addCampo(label, valor) {
      if (!valor || valor.toString().trim() === '') return;
      var p = body.appendParagraph('');
      var text = p.editAsText();
      text.appendText(label + ': ').setBold(true);
      text.appendText(valor.toString()).setBold(false);
    }

    var secId = body.appendParagraph('1. IDENTIFICAÇÃO');
    secId.setHeading(DocumentApp.ParagraphHeading.HEADING2);
    secId.editAsText().setForegroundColor('#1a3a5c');
    addCampo('Região Administrativa', dados.ra);
    addCampo('Prática de Governança', dados.pratica);
    addCampo('Responsável', dados.responsavel_nome);
    addCampo('Cargo/Função', dados.cargo);
    addCampo('E-mail', dados.responsavel_email);
    addCampo('Processo SEI', dados.processo_sei);
    body.appendHorizontalRule();

    var secProj = body.appendParagraph('2. PROJETO');
    secProj.setHeading(DocumentApp.ParagraphHeading.HEADING2);
    secProj.editAsText().setForegroundColor('#1a3a5c');
    addCampo('Nome do Projeto', dados.projeto);
    addCampo('Objetivo', dados.objetivo);
    addCampo('Descrição', dados.descricao);
    addCampo('Produto Principal', dados.produto);
    addCampo('Características', dados.caracteristicas);
    body.appendHorizontalRule();

    var secAnalise = body.appendParagraph('3. ANÁLISE ESTRATÉGICA');
    secAnalise.setHeading(DocumentApp.ParagraphHeading.HEADING2);
    secAnalise.editAsText().setForegroundColor('#1a3a5c');
    addCampo('Justificativa', dados.justificativa);
    addCampo('Indicador', dados.indicador);
    body.appendHorizontalRule();

    var secPartes = body.appendParagraph('4. PARTES INTERESSADAS');
    secPartes.setHeading(DocumentApp.ParagraphHeading.HEADING2);
    secPartes.editAsText().setForegroundColor('#1a3a5c');
    addCampo('Patrocínio/Gestão', dados.patrocinio);
    addCampo('Equipe Executora', dados.equipe);
    addCampo('Público-alvo', dados.publico);
    body.appendHorizontalRule();

    var secEntregas = body.appendParagraph('5. ENTREGAS (' + entregas.length + ')');
    secEntregas.setHeading(DocumentApp.ParagraphHeading.HEADING2);
    secEntregas.editAsText().setForegroundColor('#1a3a5c');
    if (entregas.length > 0) {
      entregas.forEach(function(ent, i) {
        var linha = (ent.entrega || '(sem descrição)');
        if (ent.responsavel) linha += ' | Responsável: ' + ent.responsavel;
        if (ent.prazo) linha += ' | Prazo: ' + ent.prazo;
        if (ent.investimento) linha += ' | Investimento: ' + ent.investimento;
        body.appendListItem(linha).setGlyphType(DocumentApp.GlyphType.NUMBER);
      });
    } else {
      body.appendParagraph('Nenhuma entrega cadastrada.');
    }
    body.appendHorizontalRule();

    var secRiscos = body.appendParagraph('6. PREMISSAS, BARREIRAS E RISCOS');
    secRiscos.setHeading(DocumentApp.ParagraphHeading.HEADING2);
    secRiscos.editAsText().setForegroundColor('#1a3a5c');
    addCampo('Premissas', dados.premissas);
    addCampo('Barreiras', dados.barreiras);
    addCampo('Riscos', dados.riscos);

    body.appendHorizontalRule();
    body.appendParagraph('Documento gerado automaticamente pelo sistema CIG — SEGEST/SEGOV')
      .setAlignment(DocumentApp.HorizontalAlignment.CENTER);

    doc.saveAndClose();

    var file = DriveApp.getFileById(doc.getId());
    var pdf = file.getAs('application/pdf');
    pdf.setName(nomeArquivo + '.pdf');
    file.setTrashed(true);

    return pdf;

  } catch (pdfErr) {
    Logger.log('Erro ao gerar PDF: ' + pdfErr.toString());
    return null;
  }
}


// =============================================================
// testarEnvio — Rode esta função manualmente para testar
// (Execuções > Executar função > testarEnvio)
// =============================================================
function testarEnvio() {
  var dadosTeste = {
    postData: {
      contents: JSON.stringify({
        responsavel_nome: 'Servidor Teste',
        cargo: 'Chefe da Unidade de Governança',
        responsavel_email: ADMIN_EMAIL,
        ra: 'RA-IX Ceilândia',
        pratica: 'Planejamento Estratégico',
        projeto: 'Projeto Teste CIG',
        objetivo: 'Testar o funcionamento do sistema.',
        descricao: 'Descrição do projeto de teste.',
        produto: 'Confirmação de funcionamento.',
        caracteristicas: 'Automático, rápido.',
        justificativa: 'Necessário para validar o sistema.',
        indicador: 'Taxa de envio: 100%',
        patrocinio: 'Administrador(a) Regional',
        equipe: 'Equipe CIG',
        publico: 'Servidores da RA',
        premissas: 'Sistema disponível.',
        barreiras: 'Nenhuma no momento.',
        riscos: 'Indisponibilidade de rede.',
        processo_sei: '04018-00003005/2025-86',
        numero_plano: '',
        entregas: [
          { entrega: 'Entrega 1 - Teste', responsavel: 'Servidor A', prazo: '30/04/2026', investimento: 'Sem custo' }
        ]
      })
    }
  };

  var resultado = doPost(dadosTeste);
  var resposta = JSON.parse(resultado.getContent());
  Logger.log('Novo plano criado: ' + resposta.numero_plano + ' | Versão: ' + resposta.versao);
}


// =============================================================
// testarRevisao — Teste de revisão de plano existente
// =============================================================
function testarRevisao() {
  var NUMERO_DO_PLANO = 'CIG-2026-001';

  var dadosTeste = {
    postData: {
      contents: JSON.stringify({
        responsavel_nome: 'Servidor Teste',
        cargo: 'Chefe da Unidade de Governança',
        responsavel_email: ADMIN_EMAIL,
        ra: 'RA-IX Ceilândia',
        pratica: 'Planejamento Estratégico',
        projeto: 'Projeto Teste CIG (Revisado)',
        objetivo: 'Testar o funcionamento do sistema com ajustes.',
        descricao: 'Descrição revisada conforme devolutiva.',
        produto: 'Confirmação de funcionamento v2.',
        caracteristicas: 'Automático, rápido, revisado.',
        justificativa: 'Necessário para validar o sistema após ajustes.',
        indicador: 'Taxa de envio: 100%',
        patrocinio: 'Administrador(a) Regional',
        equipe: 'Equipe CIG',
        publico: 'Servidores da RA',
        premissas: 'Sistema disponível.',
        barreiras: 'Ajustes incorporados.',
        riscos: 'Indisponibilidade de rede.',
        processo_sei: '04018-00003005/2025-86',
        numero_plano: NUMERO_DO_PLANO,
        entregas: [
          { entrega: 'Entrega 1 - Revisada', responsavel: 'Servidor A', prazo: '30/04/2026', investimento: 'Sem custo' }
        ]
      })
    }
  };

  var resultado = doPost(dadosTeste);
  var resposta = JSON.parse(resultado.getContent());
  Logger.log('Revisão enviada: ' + resposta.numero_plano + ' | Versão: ' + resposta.versao);
}
