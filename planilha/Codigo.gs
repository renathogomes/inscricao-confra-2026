/** @OnlyCurrentDoc */
// A linha acima faz o Google pedir acesso só a ESTA planilha, e não a todas as suas.

/**
 * INSCRIÇÕES DA CONFRATERNIZAÇÃO
 * Recebe as inscrições feitas na página e grava nesta planilha.
 * Quando a pessoa corrige uma inscrição já enviada, a inscrição antiga sai e a nova entra.
 *
 * COMO ATIVAR (uma vez só, leva uns 5 minutos):
 *  1. Na planilha, abra o menu Extensões › Apps Script.
 *  2. Clique em "Projeto sem título" (em cima, à esquerda) e dê o nome Inscrições.
 *  3. Apague o que estiver no editor, cole este código inteiro e salve (Ctrl+S).
 *  4. Clique em Implantar › Nova implantação. Na engrenagem ao lado de "Selecione o tipo",
 *     escolha "App da Web".
 *  5. Em "Executar como", deixe "Eu". Em "Quem pode acessar", escolha "Qualquer pessoa".
 *  6. Clique em Implantar e depois em Autorizar acesso, com a sua conta Google.
 *     Se aparecer "O Google não verificou este app", clique em Avançado e depois em
 *     "Acessar Inscrições (não seguro)". Se aparecerem caixas de seleção, marque todas.
 *     O app é seu: só grava nesta planilha.
 *  7. Copie a URL do App da Web (começa com https://script.google.com e termina em /exec)
 *     e coloque em "planilha" no arquivo site/config.js.
 *
 * SE ESTE CÓDIGO MUDAR DEPOIS: Implantar › Gerenciar implantações › lápis (editar) ›
 * Versão: "Nova versão" › Implantar. Assim o endereço continua o mesmo.
 */

const ABA_INSCRICOES = 'Inscrições';
const ABA_PARTICIPANTES = 'Participantes';
const COLUNAS_INSCRICOES = [
  'Data', 'Código', 'Responsável', 'WhatsApp', 'Pessoas', 'Adultos', 'Menores',
  'Total (R$)', 'Alimentos', 'Pagamento',
];
const COLUNAS_PARTICIPANTES = [
  'Data', 'Código', 'Nome', 'Idade', 'Faixa', 'Igreja', 'Valor (R$)', 'Alimento', 'Responsável',
];
const MAX_PESSOAS = 30;

function doPost(e) {
  const trava = LockService.getScriptLock();
  try {
    trava.waitLock(20000);
    const dados = lerInscricao(e);
    const planilha = SpreadsheetApp.getActiveSpreadsheet();
    const inscricoes = pegarAba(planilha, ABA_INSCRICOES, COLUNAS_INSCRICOES);
    const participantes = pegarAba(planilha, ABA_PARTICIPANTES, COLUNAS_PARTICIPANTES);

    // A mesma inscrição enviada de novo (a internet caiu no meio) não é gravada duas vezes
    const jaGravada = inscricoes
      .getRange('B:B')
      .createTextFinder(dados.codigo)
      .matchEntireCell(true)
      .findNext();
    if (jaGravada) return responder({ ok: true, codigo: dados.codigo, repetida: true });

    // Correção: as versões anteriores desta inscrição saem antes de gravar a nova
    const anteriores = removerInscricoes(planilha, dados.substitui);

    const agora = new Date();
    inscricoes.appendRow([
      agora,
      comoTexto(dados.codigo),
      comoTexto(dados.responsavel),
      comoTexto(dados.whatsapp),
      dados.pessoas.length,
      dados.adultos,
      dados.menores,
      dados.total,
      comoTexto(dados.alimentos),
      situacaoDoPagamento(dados.total, anteriores),
    ]);

    const linhas = dados.pessoas.map((p) => [
      agora,
      comoTexto(dados.codigo),
      comoTexto(p.nome),
      p.idade,
      p.adulto ? 'Adulto' : 'Menor de 15',
      comoTexto(p.igreja),
      p.valor,
      comoTexto(p.alimento),
      comoTexto(dados.responsavel),
    ]);
    participantes
      .getRange(participantes.getLastRow() + 1, 1, linhas.length, COLUNAS_PARTICIPANTES.length)
      .setValues(linhas);

    return responder({ ok: true, codigo: dados.codigo });
  } catch (erro) {
    return responder({ ok: false, erro: String((erro && erro.message) || erro) });
  } finally {
    trava.releaseLock();
  }
}

// Abrir o endereço no navegador só mostra se está funcionando; nenhum dado aparece
function doGet() {
  return ContentService.createTextOutput('Inscrições da confraternização: funcionando.');
}

function lerInscricao(e) {
  if (!e || !e.postData || !e.postData.contents) throw new Error('Inscrição vazia.');
  const d = JSON.parse(e.postData.contents);

  const codigo = String(d.codigo || '').toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(codigo)) throw new Error('Código da inscrição inválido.');
  if (!Array.isArray(d.pessoas) || d.pessoas.length < 1 || d.pessoas.length > MAX_PESSOAS) {
    throw new Error('Lista de participantes inválida.');
  }

  const pessoas = d.pessoas.map((p) => ({
    nome: limpar(p && p.nome, 80),
    idade: numero(p && p.idade, 0, 120),
    adulto: Boolean(p && p.adulto),
    igreja: limpar(p && p.igreja, 120),
    valor: numero(p && p.valor, 0, 10000),
    alimento: limpar(p && p.alimento, 60),
  }));
  if (pessoas.some((p) => p.nome.length < 2)) throw new Error('Participante sem nome.');

  const responsavel = limpar(d.responsavel, 80);
  if (responsavel.length < 2) throw new Error('Falta o nome de quem fez a inscrição.');

  // Códigos das versões anteriores, quando a inscrição é uma correção
  const substitui = (Array.isArray(d.substitui) ? d.substitui : [])
    .map((c) => String(c || '').toUpperCase())
    .filter((c) => /^[A-Z0-9]{6}$/.test(c) && c !== codigo)
    .slice(0, 10);

  return {
    codigo: codigo,
    substitui: substitui,
    responsavel: responsavel,
    whatsapp: limpar(d.whatsapp, 20),
    total: numero(d.total, 0, 100000),
    adultos: numero(d.adultos, 0, MAX_PESSOAS),
    menores: numero(d.menores, 0, MAX_PESSOAS),
    alimentos: limpar(d.alimentos, 300),
    pessoas: pessoas,
  };
}

function limpar(valor, maximo) {
  return String(valor == null ? '' : valor).replace(/\s+/g, ' ').trim().slice(0, maximo);
}

function numero(valor, minimo, maximo) {
  const n = Number(valor);
  if (!isFinite(n)) return minimo;
  return Math.min(maximo, Math.max(minimo, Math.round(n * 100) / 100));
}

// O apóstrofo faz a planilha guardar exatamente o texto digitado: nada vira fórmula, data ou número
function comoTexto(texto) {
  return texto ? "'" + texto : '';
}

// Apaga as linhas das inscrições com esses códigos e devolve como estava o pagamento delas
function removerInscricoes(planilha, codigos) {
  const anteriores = [];
  if (!codigos.length) return anteriores;
  [ABA_INSCRICOES, ABA_PARTICIPANTES].forEach((nome) => {
    const aba = planilha.getSheetByName(nome);
    if (!aba || aba.getLastRow() < 2) return;
    const linhas = aba.getRange(2, 1, aba.getLastRow() - 1, aba.getLastColumn()).getValues();
    // De baixo para cima, para os números das linhas não mudarem durante a remoção
    for (let i = linhas.length - 1; i >= 0; i--) {
      if (codigos.indexOf(String(linhas[i][1])) === -1) continue;
      if (nome === ABA_INSCRICOES) {
        anteriores.push({ pagamento: String(linhas[i][9]), total: Number(linhas[i][7]) });
      }
      aba.deleteRow(i + 2);
    }
  });
  return anteriores;
}

// Correção de inscrição já paga: se o valor não mudou, continua "Pago"; se mudou, a tesouraria confere
function situacaoDoPagamento(total, anteriores) {
  const pagas = anteriores.filter((a) => a.pagamento === 'Pago' || a.pagamento === 'Conferir');
  if (pagas.length) {
    return pagas.every((a) => a.pagamento === 'Pago' && a.total === total) ? 'Pago' : 'Conferir';
  }
  return total > 0 ? 'Aguardando' : 'Isento';
}

function pegarAba(planilha, nome, colunas) {
  let aba = planilha.getSheetByName(nome);
  if (!aba) {
    aba = planilha.insertSheet(nome);
    aba.getRange(1, 1, 1, colunas.length).setValues([colunas]).setFontWeight('bold');
    aba.setFrozenRows(1);
  }
  return aba;
}

function responder(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto)).setMimeType(
    ContentService.MimeType.JSON
  );
}
