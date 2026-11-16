/*
 * Lógica da página de inscrição.
 * As regras (valor, idade, alimentos, Pix, WhatsApp e planilha) vêm do config.js.
 * Etapas: 1) quem vai  2) conferir e confirmar (grava na planilha)  3) pagamento.
 * Dá para voltar a qualquer etapa. Se a inscrição já foi registrada e a pessoa muda algo,
 * a nova confirmação vai como correção: substitui a inscrição anterior na planilha.
 */
(function () {
  'use strict';

  const C = window.CONFRA;
  if (!C || !C.evento) {
    document.body.insertAdjacentHTML(
      'afterbegin',
      '<p class="aviso" style="margin:16px">Não foi possível ler o arquivo config.js. ' +
        'Confira se ele não ficou com algum erro de digitação.</p>'
    );
    return;
  }

  const RASCUNHO = 'confra-inscricao-rascunho';
  const VALIDADE_RASCUNHO = 12 * 60 * 60 * 1000; // 12 horas
  const VALIDADE_ENVIADA = 30 * 24 * 60 * 60 * 1000; // 30 dias: dá para voltar e pagar depois
  const MAX_PESSOAS = 30;
  const DENOMINACAO = 'Igreja Adventista da Promessa';
  // Código da inscrição sem caracteres que se confundem (0/O, 1/I/L) e sem E
  const LETRAS_CODIGO = 'ABCDFGHJKMNPQRSTUVWXYZ23456789';
  const VOLTAR_PARA = { 2: 'Voltar para os participantes', 3: 'Voltar para o resumo' };

  const IGREJAS = [
    { id: 'poco', rotulo: C.evento.igreja },
    {
      id: 'iap',
      rotulo: DENOMINACAO + ' – outra localidade',
      pergunta: 'De qual cidade ou bairro?',
      falta: 'Diga de qual localidade é a igreja.',
    },
    {
      id: 'outra',
      rotulo: 'Outra denominação',
      pergunta: 'Qual igreja?',
      falta: 'Diga qual é a igreja.',
    },
    { id: 'nenhuma', rotulo: 'Sem religião / não frequento igreja' },
  ];

  /* ---------- Utilidades ---------- */

  const $ = (id) => document.getElementById(id);
  const brl = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const plural = (n, um, varios) => n + ' ' + (n === 1 ? um : varios);
  const rolagem = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  const telaPequena = window.matchMedia('(max-width: 700px)');
  const soDigitos = (v) => String(v || '').replace(/\D/g, '');
  const planilhaConfigurada = () => Boolean(String(C.planilha || '').trim());
  const codigoValido = (c) => /^[A-Z0-9]{6}$/.test(c || '');

  function elTexto(tag, classe, texto) {
    const e = document.createElement(tag);
    if (classe) e.className = classe;
    e.textContent = texto;
    return e;
  }

  function listaComE(itens) {
    if (itens.length <= 1) return itens.join('');
    return itens.slice(0, -1).join(', ') + ' e ' + itens[itens.length - 1];
  }

  function dataLocal(iso) {
    const partes = String(iso).split('-').map(Number);
    return new Date(partes[0], partes[1] - 1, partes[2]);
  }

  const datas = (C.evento.datas || []).map(dataLocal).filter((d) => !isNaN(d));
  const ultimaData = datas[datas.length - 1];
  const mesTexto = ultimaData ? ultimaData.toLocaleDateString('pt-BR', { month: 'long' }) : '';
  const anoTexto = ultimaData ? String(ultimaData.getFullYear()) : '';

  function periodoTexto() {
    if (!datas.length) return '';
    return listaComE(datas.map((d) => String(d.getDate()))) + ' de ' + mesTexto + ' de ' + anoTexto;
  }

  // (82) 99999-8888 enquanto a pessoa digita; aceita também +55 colado do preenchimento automático
  function formatarTelefone(valor) {
    let d = soDigitos(valor);
    if (d.length > 11 && d.indexOf('55') === 0) d = d.slice(2);
    d = d.slice(0, 11);
    if (!d) return '';
    if (d.length <= 2) return '(' + d;
    if (d.length <= 6) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
    if (d.length <= 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
  }

  function telefoneValido(valor) {
    const d = soDigitos(valor);
    return (d.length === 10 || d.length === 11) && d[0] !== '0';
  }

  function novoCodigo() {
    const n = new Uint32Array(6);
    window.crypto.getRandomValues(n);
    return Array.from(n, (x) => LETRAS_CODIGO[x % LETRAS_CODIGO.length]).join('');
  }

  /* ---------- Estado e rascunho ---------- */

  let contador = 0;

  function novaPessoa() {
    contador += 1;
    return {
      id: 'p' + Date.now().toString(36) + contador,
      nome: '',
      idade: '',
      igreja: 'poco',
      detalhe: '',
      alimento: null,
    };
  }

  function estadoInicial() {
    return {
      pessoas: [novaPessoa()],
      responsavel: '',
      respEditado: false,
      telefone: '',
      etapa: 1,
      codigo: '', // código da inscrição que está na planilha
      enviada: false,
      assinatura: '', // os dados que estão na planilha, para saber se a pessoa mudou algo
      registrado: null, // cópia desses dados, para "Desfazer alterações"
      ultima: null, // última tentativa de envio: { codigo, assinatura }
      tentativas: [], // códigos tentados desde o último envio que deu certo
      substituiu: '', // código que a última correção substituiu
    };
  }

  function lerPessoas(lista) {
    return lista.slice(0, MAX_PESSOAS).map((p) =>
      Object.assign(novaPessoa(), {
        nome: String((p && p.nome) || '').slice(0, 80),
        idade: soDigitos(p && p.idade).slice(0, 3),
        igreja: IGREJAS.some((i) => p && i.id === p.igreja) ? p.igreja : 'poco',
        detalhe: String((p && p.detalhe) || '').slice(0, 80),
        alimento: p && typeof p.alimento === 'string' ? p.alimento : null,
      })
    );
  }

  function carregar() {
    try {
      const d = JSON.parse(localStorage.getItem(RASCUNHO) || 'null');
      if (!d || !Array.isArray(d.pessoas) || !d.pessoas.length) return null;
      const validade = d.enviada ? VALIDADE_ENVIADA : VALIDADE_RASCUNHO;
      if (!d.salvoEm || Date.now() - d.salvoEm > validade) return null;
      const codigo = codigoValido(d.codigo) ? d.codigo : '';
      const r = d.registrado;
      return {
        pessoas: lerPessoas(d.pessoas),
        responsavel: String(d.responsavel || '').slice(0, 80),
        respEditado: Boolean(d.respEditado),
        telefone: soDigitos(d.telefone).slice(0, 11),
        etapa: [1, 2, 3].indexOf(d.etapa) !== -1 ? d.etapa : 1,
        codigo: codigo,
        enviada: Boolean(d.enviada && codigo),
        assinatura: typeof d.assinatura === 'string' ? d.assinatura : '',
        registrado:
          r && Array.isArray(r.pessoas) && r.pessoas.length
            ? {
                pessoas: lerPessoas(r.pessoas),
                responsavel: String(r.responsavel || '').slice(0, 80),
                respEditado: Boolean(r.respEditado),
                telefone: soDigitos(r.telefone).slice(0, 11),
              }
            : null,
        ultima:
          d.ultima && codigoValido(d.ultima.codigo) && typeof d.ultima.assinatura === 'string'
            ? { codigo: d.ultima.codigo, assinatura: d.ultima.assinatura }
            : null,
        tentativas: Array.isArray(d.tentativas) ? d.tentativas.filter(codigoValido).slice(-10) : [],
        substituiu: codigoValido(d.substituiu) ? d.substituiu : '',
      };
    } catch (e) {
      return null;
    }
  }

  function salvar() {
    try {
      localStorage.setItem(RASCUNHO, JSON.stringify(Object.assign({ salvoEm: Date.now() }, estado)));
    } catch (e) {
      /* sem armazenamento: a página funciona do mesmo jeito */
    }
  }

  let estado = carregar() || estadoInicial();

  /* ---------- Regras ---------- */

  function idadeDe(p) {
    const txt = String(p.idade).trim();
    if (!/^\d{1,3}$/.test(txt)) return null;
    const n = Number(txt);
    return n <= 120 ? n : null;
  }

  function ehAdulto(p) {
    const i = idadeDe(p);
    return i !== null && i >= C.idadeAdulto;
  }

  function totais() {
    const comIdade = estado.pessoas.filter((p) => idadeDe(p) !== null);
    const adultos = comIdade.filter(ehAdulto).length;
    return {
      adultos: adultos,
      menores: comIdade.length - adultos,
      total: adultos * C.valorAdulto,
    };
  }

  const igrejaDe = (p) => IGREJAS.find((i) => i.id === p.igreja) || IGREJAS[0];

  function igrejaTexto(p) {
    if (p.igreja === 'iap') return DENOMINACAO + ' – ' + p.detalhe.trim();
    if (p.igreja === 'outra') return p.detalhe.trim();
    if (p.igreja === 'nenhuma') return 'Sem religião';
    return C.evento.igreja;
  }

  function idadeTexto(p) {
    const i = idadeDe(p);
    if (i === 0) return 'menos de 1 ano';
    return plural(i, 'ano', 'anos');
  }

  // Usado quando a lista de alimentos do config.js está vazia: só "1 kg de alimento" e o aviso
  const ALIMENTO_GENERICO = { nome: 'alimento', quantidade: 1, unidade: 'kg' };
  const UNIDADES_ABREVIADAS = { kg: 'kg', g: 'g', l: 'L', ml: 'ml' };

  const listaAlimentos = () => (C.alimentos || []).filter((a) => a && a.nome);
  const sorteiaAlimentos = () => listaAlimentos().length > 0;
  const avisoAlimento = () => String(C.avisoAlimento || '').trim();
  const itemDe = (p) => listaAlimentos().find((a) => a.nome === p.alimento) || ALIMENTO_GENERICO;

  /* "2 kg de arroz", "1 dúzia de ovos", "4 pacotes de macarrão".
     "vezes" soma a quantidade quando mais de um adulto leva o mesmo item. */
  function quantidadeTexto(item, vezes) {
    // Item só com o nome (como no config.js antigo) vale 1 kg
    const semMedida = item.quantidade == null && item.unidade == null;
    let q = (Number(item.quantidade) > 0 ? Number(item.quantidade) : 1) * (vezes || 1);
    let u = semMedida ? 'kg' : String(item.unidade || '').trim();
    const abreviada = UNIDADES_ABREVIADAS[u.toLowerCase()];
    if (abreviada) {
      u = abreviada;
      if (u === 'g' && q >= 1000) {
        q /= 1000;
        u = 'kg';
      } else if (u === 'ml' && q >= 1000) {
        q /= 1000;
        u = 'L';
      }
    } else if (u && q > 1) {
      u = u.replace(/^\S+/, (palavra) => palavra + 's'); // pacote → pacotes, dúzia → dúzias
    }
    const numero = q.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
    return numero + ' ' + (u ? u + ' de ' : '') + item.nome;
  }

  const alimentoTexto = (p) => quantidadeTexto(itemDe(p), 1);
  const primeiroNome = (p) => p.nome.trim().split(/\s+/)[0];

  function detalheTotal(t) {
    if (!t.adultos) return 'Só há menores de ' + C.idadeAdulto + ' anos nesta inscrição. Não há valor a pagar.';
    let texto = plural(t.adultos, 'adulto', 'adultos') + ' × ' + brl(C.valorAdulto);
    if (t.menores) {
      texto += ' · ' + plural(t.menores, 'menor', 'menores') + ' de ' + C.idadeAdulto + ' anos ' +
        (t.menores === 1 ? 'não paga' : 'não pagam');
    }
    return texto;
  }

  // O que importa para saber se a inscrição mudou depois de registrada
  function assinaturaDe(dados) {
    return JSON.stringify({
      p: dados.pessoas.map((p) => [
        p.nome.trim(),
        String(p.idade),
        p.igreja,
        igrejaDe(p).pergunta ? p.detalhe.trim() : '',
      ]),
      r: dados.responsavel.trim(),
      t: soDigitos(dados.telefone),
    });
  }

  const alterada = () => estado.enviada && assinaturaDe(estado) !== estado.assinatura;

  function copiaDosDados() {
    return JSON.parse(
      JSON.stringify({
        pessoas: estado.pessoas,
        responsavel: estado.responsavel,
        respEditado: estado.respEditado,
        telefone: estado.telefone,
      })
    );
  }

  /* Cada adulto recebe um alimento da lista, respeitando as proporções do config.js.
     Dentro da mesma inscrição a página evita repetir enquanto houver opção.
     Quem já tem alimento fica com ele. */
  function sortearAlimentos() {
    const lista = listaAlimentos();
    const peso = (a) => (Number(a.proporcao) > 0 ? Number(a.proporcao) : 1);
    const adultos = estado.pessoas.filter(ehAdulto);

    if (!lista.length) {
      estado.pessoas.forEach((p) => {
        p.alimento = null;
      });
      return;
    }

    const usados = new Set();
    adultos.forEach((p) => {
      if (p.alimento && lista.some((a) => a.nome === p.alimento)) usados.add(p.alimento);
      else p.alimento = null;
    });

    adultos.forEach((p) => {
      if (p.alimento) return;
      let opcoes = lista.filter((a) => !usados.has(a.nome));
      if (!opcoes.length) opcoes = lista;
      let r = Math.random() * opcoes.reduce((s, a) => s + peso(a), 0);
      let escolhido = opcoes[opcoes.length - 1];
      for (const a of opcoes) {
        r -= peso(a);
        if (r < 0) {
          escolhido = a;
          break;
        }
      }
      p.alimento = escolhido.nome;
      usados.add(escolhido.nome);
    });
  }

  function resumoAlimentos() {
    const grupos = new Map();
    estado.pessoas.filter(ehAdulto).forEach((p) => {
      const item = itemDe(p);
      if (!grupos.has(item)) grupos.set(item, []);
      grupos.get(item).push(primeiroNome(p));
    });
    return Array.from(grupos, (par) => ({
      texto: quantidadeTexto(par[0], par[1].length),
      quem: par[1],
    }));
  }

  /* ---------- Topo e fotos ---------- */

  function preencherTopo() {
    $('topo-igreja').textContent = C.evento.igreja;
    $('topo-nome').textContent = C.evento.nome;
    $('rodape-texto').textContent = C.evento.igreja;

    if (datas.length) {
      const dias = $('dias');
      dias.textContent = '';
      datas.forEach((d) => {
        const li = document.createElement('li');
        li.className = 'dia';
        const semana = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
        li.append(
          elTexto('span', 'dia-semana', semana),
          elTexto('span', 'dia-numero', String(d.getDate()))
        );
        dias.append(li);
      });
      $('datas-mes').textContent = 'de ' + mesTexto + ' de ' + anoTexto;
    }

    if (C.evento.local) {
      $('topo-local').textContent = 'Local: ' + C.evento.local;
      $('topo-local').hidden = false;
    }

    const regra = $('topo-regra');
    regra.textContent = '';
    regra.append(
      elTexto('strong', '', brl(C.valorAdulto) + ' por adulto'),
      ' (' + C.idadeAdulto + ' anos ou mais) e ',
      ...(sorteiaAlimentos()
        ? [elTexto('strong', '', 'um alimento'), ' para a cozinha (a inscrição mostra qual e quanto). ']
        : [elTexto('strong', '', quantidadeTexto(ALIMENTO_GENERICO, 1)), '. ' + (avisoAlimento() ? avisoAlimento() + ' ' : '')]),
      'Menores de ' + C.idadeAdulto + ' anos não pagam.'
    );
  }

  // Só a primeira foto carrega de cara; as outras quando chegam perto da tela
  function montarFotos() {
    const secao = $('secao-fotos');
    const grade = $('fotos');
    const lista = (C.fotos || []).filter((f) => f && f.arquivo);
    secao.hidden = !lista.length;
    lista.forEach((f, i) => {
      const fig = document.createElement('figure');
      fig.className = 'foto';
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'foto-abrir';
      botao.setAttribute('aria-label', 'Ampliar foto: ' + (f.legenda || 'foto do local'));
      const img = new Image();
      img.alt = f.legenda || 'Foto do local';
      img.decoding = 'async';
      if (i > 0) img.loading = 'lazy';
      img.onerror = () => {
        fig.remove();
        if (!grade.children.length) secao.hidden = true;
      };
      botao.append(img);
      botao.addEventListener('click', () => abrirVisor(img));
      fig.append(botao);
      if (f.legenda) fig.append(elTexto('figcaption', '', f.legenda));
      grade.append(fig);
      img.src = f.arquivo;
    });
  }

  /* ---------- Fotos em tela cheia ---------- */

  const visor = $('visor');
  let visorFotos = [];
  let visorIndice = 0;

  function mostrarNoVisor(i) {
    const total = visorFotos.length;
    visorIndice = (i + total) % total;
    const origem = visorFotos[visorIndice];
    $('visor-img').src = origem.currentSrc || origem.src;
    $('visor-img').alt = origem.alt;
    $('visor-legenda').textContent =
      origem.alt + (total > 1 ? ' · ' + (visorIndice + 1) + ' de ' + total : '');
    $('visor-ant').hidden = total < 2;
    $('visor-prox').hidden = total < 2;
  }

  function abrirVisor(img) {
    if (typeof visor.showModal !== 'function') return;
    visorFotos = Array.from($('fotos').querySelectorAll('.foto img'));
    const i = visorFotos.indexOf(img);
    if (i < 0) return;
    mostrarNoVisor(i);
    visor.showModal();
    document.body.classList.add('visor-aberto');
  }

  visor.addEventListener('close', () => document.body.classList.remove('visor-aberto'));
  $('visor-fechar').addEventListener('click', () => visor.close());
  $('visor-ant').addEventListener('click', () => mostrarNoVisor(visorIndice - 1));
  $('visor-prox').addEventListener('click', () => mostrarNoVisor(visorIndice + 1));

  // Tocar fora da foto fecha
  visor.addEventListener('click', (e) => {
    if (e.target === visor || e.target.classList.contains('visor-foto')) visor.close();
  });

  visor.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') mostrarNoVisor(visorIndice - 1);
    else if (e.key === 'ArrowRight') mostrarNoVisor(visorIndice + 1);
  });

  // No celular, arrastar para o lado troca de foto
  let toqueX = null;
  let toqueY = null;
  visor.addEventListener(
    'touchstart',
    (e) => {
      toqueX = e.touches[0].clientX;
      toqueY = e.touches[0].clientY;
    },
    { passive: true }
  );
  visor.addEventListener('touchend', (e) => {
    if (toqueX === null) return;
    const dx = e.changedTouches[0].clientX - toqueX;
    const dy = e.changedTouches[0].clientY - toqueY;
    toqueX = null;
    if (visorFotos.length > 1 && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      mostrarNoVisor(visorIndice + (dx < 0 ? 1 : -1));
    }
  });

  /* ---------- Etapa 1: participantes ---------- */

  const cartaoDe = (p) => $('pessoas').querySelector('[data-id="' + p.id + '"]');
  const campoDe = (li, nome) => li.querySelector('[data-campo="' + nome + '"]');
  const erroDe = (li, nome) => li.querySelector('[data-erro="' + nome + '"]');

  function limparErro(input, erroEl) {
    input.removeAttribute('aria-invalid');
    erroEl.hidden = true;
    erroEl.textContent = '';
  }

  // Botão que pede um segundo toque antes de apagar algo
  function emDoisToques(botao, textoConfirmar, acao, dispensaConfirmacao) {
    let espera = null;
    const original = botao.textContent;
    botao.addEventListener('click', () => {
      if (espera || (dispensaConfirmacao && dispensaConfirmacao())) {
        clearTimeout(espera);
        espera = null;
        botao.textContent = original;
        acao();
        return;
      }
      botao.textContent = textoConfirmar;
      espera = setTimeout(() => {
        espera = null;
        botao.textContent = original;
      }, 4000);
    });
  }

  function atualizarSituacao(li, p) {
    const s = li.querySelector('[data-situacao]');
    const i = idadeDe(p);
    if (i === null) {
      s.dataset.tipo = '';
      s.textContent = 'Informe a idade para calcular';
    } else if (i >= C.idadeAdulto) {
      s.dataset.tipo = 'adulto';
      s.textContent = 'Adulto · ' + brl(C.valorAdulto) + ' + ' + (sorteiaAlimentos() ? 'alimento' : quantidadeTexto(ALIMENTO_GENERICO, 1));
    } else {
      s.dataset.tipo = 'menor';
      s.textContent = 'Menor de ' + C.idadeAdulto + ' anos · não paga';
    }
  }

  function atualizarDetalhe(li, p) {
    const igreja = igrejaDe(p);
    const bloco = li.querySelector('[data-bloco="detalhe"]');
    bloco.hidden = !igreja.pergunta;
    if (igreja.pergunta) li.querySelector('[data-rotulo="detalhe"]').textContent = igreja.pergunta;
  }

  function criarCartao(p) {
    const li = document.createElement('li');
    li.className = 'pessoa';
    li.dataset.id = p.id;
    li.innerHTML =
      '<div class="pessoa-topo">' +
      '<h3 class="pessoa-titulo" data-titulo></h3>' +
      '<button type="button" class="remover" data-acao="remover">Remover</button>' +
      '</div>' +
      '<div class="campo">' +
      '<label for="nome-' + p.id + '">Nome completo</label>' +
      '<input id="nome-' + p.id + '" data-campo="nome" type="text" maxlength="80" autocomplete="off" autocapitalize="words" enterkeyhint="next">' +
      '<p class="erro" data-erro="nome" hidden></p>' +
      '</div>' +
      '<div class="linha-idade">' +
      '<div class="campo">' +
      '<label for="idade-' + p.id + '">Idade</label>' +
      '<input id="idade-' + p.id + '" data-campo="idade" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="3" autocomplete="off" enterkeyhint="next" aria-describedby="situacao-' + p.id + '">' +
      '</div>' +
      '<p class="situacao" id="situacao-' + p.id + '" data-situacao></p>' +
      '</div>' +
      '<p class="erro" data-erro="idade" hidden></p>' +
      '<div class="campo">' +
      '<label for="igreja-' + p.id + '">Igreja</label>' +
      '<select id="igreja-' + p.id + '" data-campo="igreja"></select>' +
      '</div>' +
      '<div class="campo" data-bloco="detalhe" hidden>' +
      '<label for="detalhe-' + p.id + '" data-rotulo="detalhe"></label>' +
      '<input id="detalhe-' + p.id + '" data-campo="detalhe" type="text" maxlength="80" autocomplete="off" autocapitalize="words" enterkeyhint="next">' +
      '<p class="erro" data-erro="detalhe" hidden></p>' +
      '</div>';

    const nome = campoDe(li, 'nome');
    const idade = campoDe(li, 'idade');
    const igreja = campoDe(li, 'igreja');
    const detalhe = campoDe(li, 'detalhe');

    IGREJAS.forEach((i) => igreja.add(new Option(i.rotulo, i.id)));
    nome.value = p.nome;
    idade.value = p.idade;
    igreja.value = p.igreja;
    detalhe.value = p.detalhe;
    atualizarSituacao(li, p);
    atualizarDetalhe(li, p);

    nome.addEventListener('input', () => {
      p.nome = nome.value;
      limparErro(nome, erroDe(li, 'nome'));
      espelharResponsavel();
      salvar();
    });

    idade.addEventListener('input', () => {
      const limpo = soDigitos(idade.value).slice(0, 3);
      if (limpo !== idade.value) idade.value = limpo;
      p.idade = limpo;
      limparErro(idade, erroDe(li, 'idade'));
      atualizarSituacao(li, p);
      atualizarBarra();
      salvar();
    });

    igreja.addEventListener('change', () => {
      p.igreja = igreja.value;
      p.detalhe = '';
      detalhe.value = '';
      limparErro(detalhe, erroDe(li, 'detalhe'));
      atualizarDetalhe(li, p);
      salvar();
    });

    detalhe.addEventListener('input', () => {
      p.detalhe = detalhe.value;
      limparErro(detalhe, erroDe(li, 'detalhe'));
      salvar();
    });

    emDoisToques(
      li.querySelector('[data-acao="remover"]'),
      'Toque de novo para remover',
      () => removerPessoa(p),
      () => !p.nome.trim() && !p.idade
    );

    return li;
  }

  // Numera os cartões e esconde "Remover" quando só existe uma pessoa
  function atualizarLista() {
    const unico = estado.pessoas.length === 1;
    estado.pessoas.forEach((p, i) => {
      const li = cartaoDe(p);
      li.querySelector('[data-titulo]').textContent = 'Participante ' + (i + 1);
      li.querySelector('[data-acao="remover"]').hidden = unico;
    });
    $('adicionar').hidden = estado.pessoas.length >= MAX_PESSOAS;
  }

  function adicionarPessoa() {
    if (estado.pessoas.length >= MAX_PESSOAS) return;
    const p = novaPessoa();
    estado.pessoas.push(p);
    const li = criarCartao(p);
    $('pessoas').append(li);
    atualizarLista();
    atualizarBarra();
    salvar();
    campoDe(li, 'nome').focus({ preventScroll: true });
    li.scrollIntoView({ block: 'center', behavior: rolagem });
  }

  function removerPessoa(p) {
    if (estado.pessoas.length === 1) return;
    cartaoDe(p).remove();
    estado.pessoas = estado.pessoas.filter((x) => x !== p);
    atualizarLista();
    atualizarBarra();
    espelharResponsavel();
    salvar();
  }

  // "Seu nome" acompanha o nome do primeiro participante até a pessoa editar o campo
  function espelharResponsavel() {
    if (estado.respEditado) return;
    estado.responsavel = estado.pessoas[0] ? estado.pessoas[0].nome : '';
    $('responsavel').value = estado.responsavel;
    if (estado.responsavel.trim()) limparErro($('responsavel'), $('responsavel-erro'));
  }

  /* A barra do total só aparece quando o formulário está na tela, e some enquanto
     o teclado do celular está aberto (senão cobre o campo que a pessoa está preenchendo). */
  let formularioNaTela = !('IntersectionObserver' in window);
  let campoEmFoco = false;

  function tecladoAberto() {
    if (!campoEmFoco) return false;
    const vv = window.visualViewport;
    if (!vv) return telaPequena.matches;
    return vv.height < window.innerHeight * 0.8;
  }

  function atualizarBarra() {
    const t = totais();
    $('barra-total').textContent = brl(t.total);
    const partes = [];
    if (t.adultos) partes.push(plural(t.adultos, 'adulto', 'adultos'));
    if (t.menores) partes.push(plural(t.menores, 'menor', 'menores') + ' de ' + C.idadeAdulto + ' anos');
    $('barra-detalhe').textContent = partes.length ? partes.join(' · ') : 'Informe as idades para calcular';

    const visivel = estado.etapa === 1 && formularioNaTela && !tecladoAberto();
    $('barra').classList.toggle('fora', !visivel);
    document.documentElement.classList.toggle('com-barra', estado.etapa === 1);
  }

  function problemas() {
    const lista = [];
    estado.pessoas.forEach((p) => {
      if (p.nome.trim().length < 2) lista.push({ p: p, campo: 'nome', msg: 'Escreva o nome desta pessoa.' });
      if (idadeDe(p) === null) lista.push({ p: p, campo: 'idade', msg: 'Informe a idade em anos, só com números.' });
      const igreja = igrejaDe(p);
      if (igreja.pergunta && p.detalhe.trim().length < 2) lista.push({ p: p, campo: 'detalhe', msg: igreja.falta });
    });
    if (estado.responsavel.trim().length < 2) lista.push({ campo: 'responsavel', msg: 'Escreva o seu nome.' });
    if (!telefoneValido(estado.telefone)) {
      lista.push({ campo: 'telefone', msg: 'Escreva o número com DDD, por exemplo (11) 91234-5678.' });
    }
    return lista;
  }

  function validar() {
    const lista = problemas();
    let primeiro = null;
    lista.forEach((x) => {
      const input = x.p ? campoDe(cartaoDe(x.p), x.campo) : $(x.campo);
      const erroEl = x.p ? erroDe(cartaoDe(x.p), x.campo) : $(x.campo + '-erro');
      input.setAttribute('aria-invalid', 'true');
      erroEl.textContent = x.msg;
      erroEl.hidden = false;
      if (!primeiro) primeiro = input;
    });
    if (primeiro) {
      primeiro.focus({ preventScroll: true });
      primeiro.scrollIntoView({ block: 'center', behavior: rolagem });
    }
    return !lista.length;
  }

  function avancar() {
    if (validar()) mostrarEtapa(2, true);
  }

  /* ---------- Etapa 2: conferir e confirmar ---------- */

  function rotuloConfirmar() {
    if (!estado.enviada) return 'Confirmar inscrição';
    return alterada() ? 'Enviar correção' : 'Ir para o pagamento';
  }

  function renderConfirmacao() {
    sortearAlimentos();
    const t = totais();

    const lista = $('resumo-lista');
    lista.textContent = '';
    estado.pessoas.forEach((p) => {
      const li = document.createElement('li');
      li.className = 'resumo-item';
      li.append(
        elTexto('span', 'resumo-nome', p.nome.trim()),
        elTexto('span', 'resumo-valor', ehAdulto(p) ? brl(C.valorAdulto) : 'Não paga'),
        elTexto('span', 'resumo-detalhe', idadeTexto(p) + ' · ' + igrejaTexto(p))
      );
      if (ehAdulto(p) && sorteiaAlimentos()) li.append(elTexto('span', 'resumo-alimento', 'Leva ' + alimentoTexto(p)));
      lista.append(li);
    });

    $('resumo-total').textContent = brl(t.total);
    $('resumo-total-detalhe').textContent = detalheTotal(t);
    $('resumo-contato').textContent =
      'Inscrição feita por ' + estado.responsavel.trim() + ' · WhatsApp ' + formatarTelefone(estado.telefone);

    let intro = 'Confira os dados. Depois de confirmar, aparece o Pix para o pagamento.';
    if (alterada()) {
      intro = 'Você alterou a inscrição ' + estado.codigo + '. Confira e envie a correção: ' +
        'ela substitui a inscrição anterior na lista da organização.';
    } else if (estado.enviada) {
      intro = 'Esta inscrição já está registrada com o código ' + estado.codigo + '.';
    }
    $('confirmar-intro').textContent = intro;
    $('confirmar').textContent = rotuloConfirmar();
    $('desfazer').hidden = !alterada();
    $('envio-erro').hidden = true;
  }

  function dadosParaPlanilha(codigo) {
    const t = totais();
    return {
      codigo: codigo,
      responsavel: estado.responsavel.trim(),
      whatsapp: formatarTelefone(estado.telefone),
      total: t.total,
      adultos: t.adultos,
      menores: t.menores,
      alimentos: sorteiaAlimentos() ? resumoAlimentos().map((a) => a.texto).join(', ') : '',
      pessoas: estado.pessoas.map((p) => ({
        nome: p.nome.trim(),
        idade: idadeDe(p),
        adulto: ehAdulto(p),
        igreja: igrejaTexto(p),
        valor: ehAdulto(p) ? C.valorAdulto : 0,
        alimento: ehAdulto(p) && sorteiaAlimentos() ? alimentoTexto(p) : '',
      })),
    };
  }

  // Envia como texto simples: o Google aceita sem pedir permissão extra ao navegador
  async function enviarParaPlanilha(dados) {
    if (!planilhaConfigurada()) {
      console.warn('config.js: "planilha" está vazio. Esta inscrição não foi gravada em lugar nenhum.');
      return { ok: true };
    }
    const controle = new AbortController();
    const espera = setTimeout(() => controle.abort(), 30000);
    try {
      const resposta = await fetch(String(C.planilha).trim(), {
        method: 'POST',
        body: JSON.stringify(dados),
        signal: controle.signal,
      });
      return await resposta.json();
    } finally {
      clearTimeout(espera);
    }
  }

  let enviando = false;

  async function confirmarInscricao() {
    if (enviando) return;
    if (problemas().length) {
      mostrarEtapa(1, false);
      validar();
      return;
    }
    // Já registrada e sem mudanças: envia de novo com o mesmo código antes de mostrar o pagamento.
    // Se a linha continua na planilha, nada muda; se alguém apagou a linha, ela volta.
    const reenvio = estado.enviada && !alterada();

    // Os mesmos dados enviados de novo (a internet caiu) usam o mesmo código: a planilha não duplica.
    // Dados diferentes ganham código novo, e os códigos anteriores saem da planilha.
    const assinatura = assinaturaDe(estado);
    let codigo;
    let substitui = [];
    if (reenvio) {
      codigo = estado.codigo;
    } else {
      if (estado.ultima && estado.ultima.assinatura === assinatura) {
        codigo = estado.ultima.codigo;
      } else {
        codigo = novoCodigo();
        estado.ultima = { codigo: codigo, assinatura: assinatura };
        estado.tentativas = estado.tentativas.concat(codigo).slice(-10);
      }
      substitui = [estado.codigo].concat(estado.tentativas).filter((c) => c && c !== codigo);
      salvar();
    }

    const botao = $('confirmar');
    enviando = true;
    atualizarNavegacao();
    botao.disabled = true;
    botao.setAttribute('aria-busy', 'true');
    botao.textContent = 'Enviando…';
    $('envio-erro').hidden = true;

    try {
      const dados = dadosParaPlanilha(codigo);
      if (substitui.length) dados.substitui = substitui;
      const resposta = await enviarParaPlanilha(dados);
      if (!resposta || resposta.ok !== true) {
        throw new Error((resposta && resposta.erro) || 'resposta inesperada da planilha');
      }
      if (!reenvio) {
        estado.substituiu = estado.enviada ? estado.codigo : '';
        estado.codigo = codigo;
        estado.enviada = true;
        estado.assinatura = assinatura;
        estado.registrado = copiaDosDados();
        estado.ultima = null;
        estado.tentativas = [];
      }
      enviando = false;
      mostrarEtapa(3, true);
    } catch (erro) {
      console.warn('Não foi possível enviar a inscrição:', erro);
      if (reenvio) {
        // Ela já foi gravada antes: a falha não impede de ver o pagamento
        enviando = false;
        mostrarEtapa(3, true);
        return;
      }
      $('envio-erro').textContent =
        navigator.onLine === false
          ? 'Sem conexão com a internet. Conecte-se e toque no botão de novo.'
          : 'Não foi possível enviar agora. Espere um pouco e toque no botão de novo.';
      $('envio-erro').hidden = false;
    } finally {
      enviando = false;
      botao.disabled = false;
      botao.removeAttribute('aria-busy');
      botao.textContent = rotuloConfirmar();
      atualizarNavegacao();
    }
  }

  // Volta tudo para como está na planilha
  function desfazerAlteracoes() {
    const r = estado.registrado;
    if (!r) return;
    estado.pessoas = r.pessoas.map((p) =>
      Object.assign(novaPessoa(), {
        nome: p.nome,
        idade: p.idade,
        igreja: p.igreja,
        detalhe: p.detalhe,
        alimento: p.alimento,
      })
    );
    estado.responsavel = r.responsavel;
    estado.respEditado = r.respEditado;
    estado.telefone = r.telefone;
    $('pessoas').textContent = '';
    iniciarFormulario();
    mostrarEtapa(3, true);
  }

  /* ---------- Etapa 3: pagamento ---------- */

  function numeroWhatsapp() {
    const d = soDigitos(C.whatsapp);
    if (d.length === 10 || d.length === 11) return '55' + d;
    return d.length >= 12 ? d : '';
  }

  function montarMensagem() {
    const t = totais();
    const linhas = ['*Inscrição · ' + C.evento.nome + '*', 'Código: ' + estado.codigo];
    if (estado.substituiu) linhas.push('(correção da inscrição ' + estado.substituiu + ')');
    linhas.push(C.evento.igreja);
    if (datas.length) linhas.push(periodoTexto());
    linhas.push(
      '',
      'Inscrição feita por: ' + estado.responsavel.trim() + ' · ' + formatarTelefone(estado.telefone),
      ''
    );

    estado.pessoas.forEach((p, i) => {
      linhas.push(i + 1 + '. ' + p.nome.trim() + ', ' + idadeTexto(p));
      linhas.push('   ' + igrejaTexto(p));
      linhas.push(
        ehAdulto(p)
          ? '   ' + brl(C.valorAdulto) + (sorteiaAlimentos() ? ' · leva ' + alimentoTexto(p) : '')
          : '   Menor de ' + C.idadeAdulto + ' anos · não paga'
      );
    });

    const gente = [];
    if (t.adultos) gente.push(plural(t.adultos, 'adulto', 'adultos'));
    if (t.menores) gente.push(plural(t.menores, 'menor', 'menores') + ' de ' + C.idadeAdulto + ' anos');
    linhas.push('', '*Total: ' + brl(t.total) + '* (' + gente.join(', ') + ')');
    if (t.adultos && sorteiaAlimentos()) linhas.push('Alimentos: ' + resumoAlimentos().map((a) => a.texto).join(', '));
    if (t.total > 0) linhas.push('', 'Segue o comprovante do Pix.');
    return linhas.join('\n');
  }

  function desenharQr(texto, destino) {
    destino.textContent = '';
    if (typeof window.qrcode !== 'function') {
      destino.parentElement.hidden = true;
      return;
    }
    const qr = window.qrcode(0, 'M');
    qr.addData(texto);
    qr.make();
    const n = qr.getModuleCount();
    const margem = 4;
    const lado = n + margem * 2;
    let d = '';
    for (let l = 0; l < n; l++) {
      for (let c = 0; c < n; c++) {
        if (qr.isDark(l, c)) d += 'M' + (c + margem) + ' ' + (l + margem) + 'h1v1h-1z';
      }
    }
    destino.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + lado + ' ' + lado + '" ' +
      'shape-rendering="crispEdges" role="img" aria-label="QR Code do Pix">' +
      '<rect width="' + lado + '" height="' + lado + '" fill="#fff"/>' +
      '<path d="' + d + '" fill="#000"/></svg>';
    destino.parentElement.hidden = false;
  }

  function renderPagamento() {
    const t = totais();
    const temValor = t.total > 0;

    $('codigo-inscricao').textContent = estado.codigo;
    $('confirmado-texto').textContent = temValor
      ? 'Falta só o pagamento de ' + brl(t.total) + '. Faça o Pix abaixo e envie o comprovante.'
      : 'Não há valor a pagar. Nos vemos na confraternização!';

    // Pix: o código da inscrição vai junto, para a tesouraria achar o pagamento no extrato
    const pix = C.pix || {};
    const chave = String(pix.chave || '').trim();
    $('pix').hidden = !temValor;
    if (temValor) {
      $('pix-valor').textContent = 'Valor: ' + brl(t.total);
      $('pix-pendente').hidden = Boolean(chave);
      $('pix-corpo').hidden = !chave;
      if (chave) {
        const codigo = window.Pix.gerarPixCopiaECola({
          chave: chave,
          tipo: pix.tipo,
          favorecido: pix.favorecido,
          cidade: pix.cidade,
          valor: t.total,
          identificador: 'CONFRA' + estado.codigo,
        });
        $('pix-codigo').textContent = codigo;
        desenharQr(codigo, $('pix-qr'));
        $('pix-chave-rotulo').textContent = 'Ou use a chave (' + window.Pix.nomeDoTipo(chave, pix.tipo) + ')';
        $('pix-chave').textContent = chave;
        $('pix-favorecido').textContent = pix.favorecido ? 'Favorecido: ' + pix.favorecido : '';
        $('pix-favorecido').hidden = !pix.favorecido;
      }
    }

    // Envio do comprovante
    const zap = numeroWhatsapp();
    const comPlanilha = planilhaConfigurada();
    const mensagem = montarMensagem();
    $('enviar').hidden = comPlanilha && !temValor;
    $('enviar-titulo').textContent = temValor ? 'Envie o comprovante' : 'Envie a inscrição';
    const link = $('enviar-whatsapp');
    link.hidden = !zap;
    if (zap) link.href = 'https://wa.me/' + zap + '?text=' + encodeURIComponent(mensagem);
    link.textContent = temValor ? 'Enviar comprovante pelo WhatsApp' : 'Enviar inscrição pelo WhatsApp';
    $('copiar-resumo').classList.toggle('botao-claro', Boolean(zap));
    $('resumo-texto').hidden = true;
    $('resumo-texto').textContent = mensagem;

    let texto;
    if (!comPlanilha) {
      texto = zap
        ? 'Envie a inscrição pelo WhatsApp' + (temValor ? ' e anexe o comprovante do Pix na conversa' : '') +
          '. A inscrição só fica registrada depois desse envio.'
        : 'Copie o resumo e envie para a organização' + (temValor ? ' junto com o comprovante do Pix' : '') + '.';
    } else {
      texto = zap
        ? 'Depois de pagar, toque no botão abaixo e anexe o comprovante do Pix na conversa.'
        : 'Depois de pagar, envie o comprovante para a organização junto com o código da inscrição.';
    }
    $('enviar-texto').textContent = texto;

    // Alimentos somados, para a família saber o que separar
    const sorteia = sorteiaAlimentos();
    const levar = $('levar-lista');
    levar.textContent = '';
    (sorteia ? resumoAlimentos() : []).forEach((a) => {
      const li = document.createElement('li');
      li.append(elTexto('span', '', a.texto), elTexto('span', '', listaComE(a.quem)));
      levar.append(li);
    });
    levar.hidden = !sorteia;
    $('levar-nota').hidden = !sorteia;
    $('levar-aviso').textContent =
      'Cada adulto leva ' + quantidadeTexto(ALIMENTO_GENERICO, 1) + '.' + (avisoAlimento() ? ' ' + avisoAlimento() : '');
    $('levar-aviso').hidden = sorteia;
    $('levar').hidden = !t.adultos;
  }

  /* ---------- Navegação entre etapas ---------- */

  // Etapas anteriores ficam clicáveis; durante o envio, nada muda de etapa
  function atualizarNavegacao() {
    const n = estado.etapa;
    document.querySelectorAll('.etapa-botao').forEach((b) => {
      b.disabled = enviando || Number(b.dataset.etapa) >= n;
    });
    const voltar = $('voltar-etapa');
    voltar.hidden = n === 1;
    voltar.disabled = enviando;
    if (VOLTAR_PARA[n]) $('voltar-etapa-texto').textContent = VOLTAR_PARA[n];
    $('voltar').disabled = enviando;
    $('desfazer').disabled = enviando;
  }

  function mostrarEtapa(n, rolar) {
    estado.etapa = n;
    if (n === 2) renderConfirmacao();
    if (n === 3) renderPagamento();
    [1, 2, 3].forEach((i) => {
      $('etapa-' + i).hidden = i !== n;
      if (i === n) $('etapa-ind-' + i).setAttribute('aria-current', 'step');
      else $('etapa-ind-' + i).removeAttribute('aria-current');
    });
    const aviso = $('aviso-correcao');
    aviso.hidden = !(n === 1 && estado.enviada);
    if (estado.enviada) {
      aviso.textContent = 'Esta inscrição já está registrada (código ' + estado.codigo + '). ' +
        'Se mudar algo, toque em Continuar e envie a correção.';
    }
    $('ir-inscricao').textContent = estado.enviada ? 'Ver minha inscrição' : 'Fazer inscrição';
    atualizarNavegacao();
    atualizarBarra();
    salvar();
    if (rolar) {
      const titulo = $('titulo-inscricao');
      titulo.focus({ preventScroll: true });
      titulo.scrollIntoView({ block: 'start', behavior: rolagem });
    }
  }

  /* ---------- Copiar ---------- */

  async function copiar(texto) {
    try {
      await navigator.clipboard.writeText(texto);
      return true;
    } catch (e) {
      const t = document.createElement('textarea');
      t.value = texto;
      t.setAttribute('readonly', '');
      t.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      document.body.append(t);
      t.select();
      let ok = false;
      try {
        ok = document.execCommand('copy');
      } catch (e2) {
        ok = false;
      }
      t.remove();
      return ok;
    }
  }

  // Quando o navegador não deixa copiar, o texto fica selecionado para a pessoa copiar à mão
  function selecionar(el) {
    const faixa = document.createRange();
    faixa.selectNodeContents(el);
    const selecao = window.getSelection();
    selecao.removeAllRanges();
    selecao.addRange(faixa);
  }

  function avisarNoBotao(botao, texto) {
    if (!botao.dataset.original) botao.dataset.original = botao.textContent;
    botao.textContent = texto;
    clearTimeout(botao._volta);
    botao._volta = setTimeout(() => {
      botao.textContent = botao.dataset.original;
    }, 3000);
  }

  /* ---------- Ligações ---------- */

  $('adicionar').addEventListener('click', adicionarPessoa);

  $('responsavel').addEventListener('input', (e) => {
    estado.responsavel = e.target.value;
    estado.respEditado = e.target.value.trim() !== '';
    limparErro(e.target, $('responsavel-erro'));
    salvar();
  });

  $('telefone').addEventListener('input', (e) => {
    const formatado = formatarTelefone(e.target.value);
    if (formatado !== e.target.value) e.target.value = formatado;
    estado.telefone = soDigitos(formatado);
    limparErro(e.target, $('telefone-erro'));
    salvar();
  });

  $('etapa-1').addEventListener('submit', (e) => {
    e.preventDefault();
    avancar();
  });

  // Enter (ou "próximo" no teclado do celular) leva ao campo seguinte; no último, avança
  $('etapa-1').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.isComposing || e.target.tagName !== 'INPUT') return;
    e.preventDefault();
    const campos = Array.from($('etapa-1').querySelectorAll('input')).filter(
      (el) => el.getClientRects().length > 0
    );
    const i = campos.indexOf(e.target);
    if (i >= 0 && i < campos.length - 1) campos[i + 1].focus();
    else avancar();
  });

  let saidaDoCampo = null;
  $('etapa-1').addEventListener('focusin', (e) => {
    if (!e.target.matches('input, select')) return;
    clearTimeout(saidaDoCampo);
    campoEmFoco = true;
    atualizarBarra();
  });
  $('etapa-1').addEventListener('focusout', (e) => {
    if (!e.target.matches('input, select')) return;
    saidaDoCampo = setTimeout(() => {
      campoEmFoco = false;
      atualizarBarra();
    }, 120);
  });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', atualizarBarra);

  if (!formularioNaTela) {
    new IntersectionObserver(
      (entradas) => {
        formularioNaTela = entradas[0].isIntersecting;
        atualizarBarra();
      },
      { rootMargin: '0px 0px -20% 0px' }
    ).observe($('inscricao'));
  }

  // Voltar: pelo botão do topo, pelas etapas já feitas ou por "Voltar e corrigir"
  $('voltar-etapa').addEventListener('click', () => {
    if (estado.etapa > 1) mostrarEtapa(estado.etapa - 1, true);
  });
  document.querySelectorAll('.etapa-botao').forEach((b) => {
    b.addEventListener('click', () => {
      const alvo = Number(b.dataset.etapa);
      if (alvo < estado.etapa) mostrarEtapa(alvo, true);
    });
  });
  $('voltar').addEventListener('click', () => mostrarEtapa(1, true));
  $('desfazer').addEventListener('click', desfazerAlteracoes);
  $('confirmar').addEventListener('click', confirmarInscricao);

  emDoisToques($('nova'), 'Toque de novo para começar outra', () => {
    estado = estadoInicial();
    $('pessoas').textContent = '';
    iniciarFormulario();
    mostrarEtapa(1, true);
  });

  $('copiar-codigo').addEventListener('click', async () => {
    const botao = $('copiar-codigo');
    const ok = await copiar($('pix-codigo').textContent);
    if (!ok) selecionar($('pix-codigo'));
    avisarNoBotao(botao, ok ? 'Copiado! Agora cole no app do banco' : 'Copie o código selecionado abaixo');
  });

  $('copiar-chave').addEventListener('click', async () => {
    const botao = $('copiar-chave');
    const ok = await copiar($('pix-chave').textContent);
    if (!ok) selecionar($('pix-chave'));
    avisarNoBotao(botao, ok ? 'Chave copiada' : 'Copie a chave selecionada');
  });

  $('copiar-resumo').addEventListener('click', async () => {
    const botao = $('copiar-resumo');
    const ok = await copiar($('resumo-texto').textContent);
    if (!ok) {
      $('resumo-texto').hidden = false;
      selecionar($('resumo-texto'));
    }
    avisarNoBotao(botao, ok ? 'Resumo copiado' : 'Copie o texto selecionado abaixo');
  });

  /* ---------- Início ---------- */

  function iniciarFormulario() {
    estado.pessoas.forEach((p) => $('pessoas').append(criarCartao(p)));
    $('responsavel').value = estado.responsavel;
    $('telefone').value = formatarTelefone(estado.telefone);
    atualizarLista();
    atualizarBarra();
  }

  preencherTopo();
  montarFotos();
  iniciarFormulario();

  // Quem saiu para o app do banco e voltou encontra a inscrição onde deixou.
  // Se mudou algo depois de registrar e não enviou a correção, volta para a confirmação.
  let etapaInicial = 1;
  if (estado.enviada) etapaInicial = !alterada() ? 3 : problemas().length ? 1 : 2;
  else if (estado.etapa === 2 && !problemas().length) etapaInicial = 2;
  mostrarEtapa(etapaInicial, false);
})();
