/*
 * Gera o código "Pix copia e cola" (BR Code estático) com o valor já preenchido.
 * Formato definido pelo Banco Central: campos EMV + CRC16 no final.
 */
(function (raiz) {
  'use strict';

  function campo(id, valor) {
    var v = String(valor);
    return id + String(v.length).padStart(2, '0') + v;
  }

  // CRC16-CCITT (polinômio 0x1021, valor inicial 0xFFFF)
  function crc16(texto) {
    var crc = 0xffff;
    for (var i = 0; i < texto.length; i++) {
      crc ^= texto.charCodeAt(i) << 8;
      for (var b = 0; b < 8; b++) {
        crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
        crc &= 0xffff;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  function semAcento(texto) {
    return String(texto || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
  }

  // Nome e cidade vão sem acento, em maiúsculas e com tamanho limitado
  function textoSimples(texto, maximo) {
    return semAcento(texto)
      .replace(/[^A-Za-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase()
      .slice(0, maximo)
      .trim();
  }

  function cpfValido(d) {
    if (!/^\d{11}$/.test(d) || /^(\d)\1{10}$/.test(d)) return false;
    function digito(qtd) {
      var soma = 0;
      for (var i = 0; i < qtd; i++) soma += Number(d[i]) * (qtd + 1 - i);
      var resto = (soma * 10) % 11;
      return resto === 10 ? 0 : resto;
    }
    return digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
  }

  function deduzirTipo(chave) {
    var c = String(chave || '').trim();
    var digitos = c.replace(/\D/g, '');
    if (c.indexOf('@') !== -1) return 'email';
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c)) return 'aleatoria';
    if (c.charAt(0) === '+') return 'telefone';
    if (digitos.length === 14) return 'cnpj';
    if (digitos.length === 11) return cpfValido(digitos) ? 'cpf' : 'telefone';
    if (digitos.length === 10 || digitos.length === 12 || digitos.length === 13) return 'telefone';
    return 'aleatoria';
  }

  // Deixa a chave no formato que os bancos esperam dentro do código
  function normalizarChave(chave, tipo) {
    var c = String(chave || '').trim();
    var t = tipo || deduzirTipo(c);
    var digitos = c.replace(/\D/g, '');
    if (t === 'telefone') {
      if (digitos.length >= 12 && digitos.indexOf('55') === 0) return '+' + digitos;
      return '+55' + digitos;
    }
    if (t === 'cpf' || t === 'cnpj') return digitos;
    return c.toLowerCase();
  }

  var NOMES_TIPO = {
    telefone: 'telefone',
    cpf: 'CPF',
    cnpj: 'CNPJ',
    email: 'e-mail',
    aleatoria: 'chave aleatória',
  };

  function gerarPixCopiaECola(dados) {
    var chave = normalizarChave(dados.chave, dados.tipo);
    var nome = textoSimples(dados.favorecido, 25) || 'RECEBEDOR';
    var cidade = textoSimples(dados.cidade, 15) || 'BRASIL';
    var identificador =
      String(dados.identificador || '')
        .replace(/[^A-Za-z0-9]/g, '')
        .slice(0, 25) || '***';

    var conta = campo('00', 'br.gov.bcb.pix') + campo('01', chave);
    var corpo =
      campo('00', '01') +
      campo('26', conta) +
      campo('52', '0000') +
      campo('53', '986') +
      (dados.valor > 0 ? campo('54', Number(dados.valor).toFixed(2)) : '') +
      campo('58', 'BR') +
      campo('59', nome) +
      campo('60', cidade) +
      campo('62', campo('05', identificador)) +
      '6304';

    return corpo + crc16(corpo);
  }

  var api = {
    gerarPixCopiaECola: gerarPixCopiaECola,
    normalizarChave: normalizarChave,
    deduzirTipo: deduzirTipo,
    nomeDoTipo: function (chave, tipo) {
      return NOMES_TIPO[tipo || deduzirTipo(chave)] || 'chave';
    },
    crc16: crc16,
  };

  raiz.Pix = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
