/**
 * ==========================================================
 * GOOGLE APPS SCRIPT — Notificação por e-mail a cada envio
 * ==========================================================
 *
 * INSTRUÇÕES:
 * 1. Abra seu Google Apps Script vinculado à planilha
 *    (extensões > Apps Script)
 * 2. Localize a função doPost(e) existente
 * 3. Adicione o trecho de envio de e-mail DENTRO da função
 *    doPost, APÓS gravar os dados na planilha
 * 4. Salve e faça um novo deploy (Implantar > Nova implantação)
 * 5. Atualize a URL no index.html se o deploy gerar nova URL
 *
 * ==========================================================
 */

// ---- OPÇÃO 1: Adicionar DENTRO da sua função doPost existente ----
// Cole este trecho APÓS a linha que grava na planilha (sheet.appendRow ou similar)

/*
  // === NOTIFICAÇÃO POR E-MAIL ===
  try {
    var notificarEmail = dados.notificarEmail || 'adacto.oliveira@buriti.df.gov.br';
    var ra = dados.ra || '(não informada)';
    var projeto = dados.projeto || '(sem nome)';
    var pratica = dados.pratica || '(não informada)';
    var responsavel = dados.responsavel_nome || '(não informado)';
    var emailResp = dados.responsavel_email || '';
    var dataEnvio = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    var totalEntregas = 0;
    var entregasResumo = '';
    if (dados.entregas && dados.entregas.length) {
      totalEntregas = dados.entregas.length;
      dados.entregas.forEach(function(ent, i) {
        entregasResumo += '  ' + (i + 1) + '. ' + (ent.entrega || '(vazio)');
        if (ent.responsavel) entregasResumo += ' — Resp: ' + ent.responsavel;
        if (ent.prazo) entregasResumo += ' (' + ent.prazo + ')';
        entregasResumo += '\n';
      });
    }

    var assunto = '📋 Novo Plano de Ação recebido — ' + ra + ' — ' + projeto;

    var corpo = '═══════════════════════════════════════\n' +
      '  NOVO PLANO DE AÇÃO DO CIG RECEBIDO\n' +
      '═══════════════════════════════════════\n\n' +
      '📅 Data/Hora: ' + dataEnvio + '\n' +
      '📍 Região Administrativa: ' + ra + '\n' +
      '🏛️ Prática de Governança: ' + pratica + '\n' +
      '🎯 Projeto: ' + projeto + '\n\n' +
      '👤 Responsável: ' + responsavel + '\n' +
      '📧 E-mail: ' + emailResp + '\n\n' +
      '── Objetivo ──\n' +
      (dados.objetivo || '(não preenchido)') + '\n\n' +
      '── Produto Principal ──\n' +
      (dados.produto || '(não preenchido)') + '\n\n' +
      '── Indicador de Resultado ──\n' +
      (dados.indicador || '(não preenchido)') + '\n\n' +
      '── Entregas (' + totalEntregas + ') ──\n' +
      (entregasResumo || '  (nenhuma entrega cadastrada)\n') + '\n' +
      '── Premissas ──\n' +
      (dados.premissas || '(não preenchido)') + '\n\n' +
      '── Barreiras ──\n' +
      (dados.barreiras || '(não preenchido)') + '\n\n' +
      '── Riscos ──\n' +
      (dados.riscos || '(não preenchido)') + '\n\n' +
      '═══════════════════════════════════════\n' +
      'Acesse a planilha para ver o registro completo.\n' +
      'Este e-mail foi enviado automaticamente pelo\n' +
      'sistema Plano de Ação do CIG — SEGOV/SEGEST.\n' +
      '═══════════════════════════════════════\n';

    MailApp.sendEmail({
      to: notificarEmail,
      subject: assunto,
      body: corpo
    });

  } catch (emailErr) {
    // Log do erro mas não impede o salvamento
    Logger.log('Erro ao enviar notificação: ' + emailErr.toString());
  }
  // === FIM DA NOTIFICAÇÃO ===
*/


// ---- OPÇÃO 2: Se preferir, aqui está a função doPost COMPLETA de exemplo ----
// Use como referência para adaptar à sua função existente

/*
function doPost(e) {
  try {
    var dados = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // Grava na planilha (adapte conforme sua estrutura atual)
    sheet.appendRow([
      new Date(),
      dados.responsavel_nome || '',
      dados.responsavel_email || '',
      dados.ra || '',
      dados.pratica || '',
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
      JSON.stringify(dados.entregas || [])
    ]);

    // === NOTIFICAÇÃO POR E-MAIL ===
    try {
      var notificarEmail = dados.notificarEmail || 'adacto.oliveira@buriti.df.gov.br';
      var ra = dados.ra || '(não informada)';
      var projeto = dados.projeto || '(sem nome)';
      var pratica = dados.pratica || '(não informada)';
      var responsavel = dados.responsavel_nome || '(não informado)';
      var emailResp = dados.responsavel_email || '';
      var dataEnvio = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

      var totalEntregas = 0;
      var entregasResumo = '';
      if (dados.entregas && dados.entregas.length) {
        totalEntregas = dados.entregas.length;
        dados.entregas.forEach(function(ent, i) {
          entregasResumo += '  ' + (i + 1) + '. ' + (ent.entrega || '(vazio)');
          if (ent.responsavel) entregasResumo += ' — Resp: ' + ent.responsavel;
          if (ent.prazo) entregasResumo += ' (' + ent.prazo + ')';
          entregasResumo += '\n';
        });
      }

      var assunto = '📋 Novo Plano de Ação recebido — ' + ra + ' — ' + projeto;

      var corpo = '═══════════════════════════════════════\n' +
        '  NOVO PLANO DE AÇÃO DO CIG RECEBIDO\n' +
        '═══════════════════════════════════════\n\n' +
        '📅 Data/Hora: ' + dataEnvio + '\n' +
        '📍 Região Administrativa: ' + ra + '\n' +
        '🏛️ Prática de Governança: ' + pratica + '\n' +
        '🎯 Projeto: ' + projeto + '\n\n' +
        '👤 Responsável: ' + responsavel + '\n' +
        '📧 E-mail: ' + emailResp + '\n\n' +
        '── Objetivo ──\n' +
        (dados.objetivo || '(não preenchido)') + '\n\n' +
        '── Produto Principal ──\n' +
        (dados.produto || '(não preenchido)') + '\n\n' +
        '── Indicador de Resultado ──\n' +
        (dados.indicador || '(não preenchido)') + '\n\n' +
        '── Entregas (' + totalEntregas + ') ──\n' +
        (entregasResumo || '  (nenhuma entrega cadastrada)\n') + '\n' +
        '── Premissas ──\n' +
        (dados.premissas || '(não preenchido)') + '\n\n' +
        '── Barreiras ──\n' +
        (dados.barreiras || '(não preenchido)') + '\n\n' +
        '── Riscos ──\n' +
        (dados.riscos || '(não preenchido)') + '\n\n' +
        '═══════════════════════════════════════\n' +
        'Acesse a planilha para ver o registro completo.\n' +
        'Este e-mail foi enviado automaticamente pelo\n' +
        'sistema Plano de Ação do CIG — SEGOV/SEGEST.\n' +
        '═══════════════════════════════════════\n';

      MailApp.sendEmail({
        to: notificarEmail,
        subject: assunto,
        body: corpo
      });

    } catch (emailErr) {
      Logger.log('Erro ao enviar notificação: ' + emailErr.toString());
    }
    // === FIM DA NOTIFICAÇÃO ===

    return ContentService.createTextOutput(
      JSON.stringify({ status: 'ok' })
    ).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: 'error', message: err.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
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
    return ContentService.createTextOutput(
      JSON.stringify({ status: 'ok', total: registros.length, registros: registros })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: 'error', message: err.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
*/
