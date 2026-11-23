/*
 * CONFIGURAÇÕES DA PÁGINA DE INSCRIÇÃO
 * Tudo o que muda de um evento para outro está aqui. Edite, salve e recarregue a página.
 * Depois que o site estiver publicado, uma mudança aqui só aparece para todos
 * quando a pasta "site" for enviada de novo.
 */
window.CONFRA = {
  evento: {
    nome: 'Confraternização 2026',
    igreja: 'Igreja Adventista da Promessa – Poço',
    // Datas no formato ano-mês-dia. O dia da semana é calculado sozinho.
    datas: ['2026-12-11', '2026-12-12', '2026-12-13'],
    // Nome e/ou endereço do local. Deixe vazio para não mostrar.
    local: '',
  },

  /*
   * VALOR POR ADULTO
   * O valor depende do dia da inscrição, no horário de Maceió.
   * "ate" é o último dia daquele valor (ano-mês-dia) e vale até 23h59.
   * Depois do último dia, as inscrições ficam encerradas.
   * Quem já está inscrito continua com o valor do dia em que se inscreveu, mesmo se
   * corrigir a inscrição depois. Só quem for acrescentado depois paga o valor novo.
   */
  lotes: [
    { valor: 50, ate: '2026-11-30' },
    { valor: 100, ate: '2026-12-05' },
  ],
  idadeAdulto: 15, // paga quem tem esta idade ou mais

  /*
   * ALIMENTO
   * Os alimentos são definidos depois que as inscrições encerrarem. Enquanto a lista
   * "alimentos" estiver vazia, a página só mostra este aviso.
   */
  avisoAlimento:
    'Depois que as inscrições encerrarem, a organização vai calcular os alimentos pelo número de pessoas e avisar o que cada um vai levar.',

  /*
   * Quando a organização decidir os alimentos, dá para preencher a lista. A página volta
   * a sortear um item para cada adulto, sem repetir dentro da mesma inscrição. Exemplo:
   *   { nome: 'arroz', quantidade: 2, unidade: 'kg', proporcao: 3 },
   * quantidade + unidade: o que a pessoa leva. A unidade pode ser 'kg', 'g', 'L', 'ml'
   *   ou uma palavra no singular, como 'pacote', 'dúzia' ou 'garrafa' (o plural sai sozinho).
   * proporcao: quantas vezes o item sai em relação aos outros (3 sai três vezes mais que 1).
   */
  alimentos: [],

  /*
   * Pix que recebe as inscrições.
   * Enquanto "chave" estiver vazia, a página avisa que o Pix ainda não foi cadastrado
   * e não mostra QR Code.
   */
  pix: {
    chave: '82994001609', // telefone com DDD, CPF, CNPJ, e-mail ou chave aleatória
    tipo: 'telefone', // opcional: 'telefone', 'cpf', 'cnpj', 'email' ou 'aleatoria' (se vazio, a página deduz)
    favorecido: '', // nome de quem recebe, como aparece no banco
    cidade: '', // cidade da conta
  },

  // WhatsApp que recebe os comprovantes, com DDD. Ex.: '82999998888'
  whatsapp: '82987414251',

  /*
   * Endereço que grava as inscrições na planilha do Google (termina em /exec).
   * Veja como gerar no começo do arquivo planilha/Codigo.gs.
   * Enquanto estiver vazio, as inscrições NÃO ficam gravadas em lugar nenhum.
   */
  planilha:
    'https://script.google.com/macros/s/AKfycbzDAo4k53nqBoTaSkSdTiHZBIDHm305QIihVfbuvXYSesAhXDbSpdVWWA6M5w7YWMiRig/exec',

  // Fotos do local, na ordem em que aparecem. Os arquivos ficam na pasta "fotos".
  // Para tirar uma foto da página, apague a linha dela. Foto que não existir não aparece.
  fotos: [
    { arquivo: 'fotos/foto-1.jpg', legenda: 'Área verde e piscina' },
    { arquivo: 'fotos/foto-2.jpg', legenda: 'Quiosque ao lado da piscina' },
    { arquivo: 'fotos/foto-3.jpg', legenda: 'Parquinho e jardim' },
    { arquivo: 'fotos/foto-4.jpg', legenda: 'Varanda' },
    { arquivo: 'fotos/foto-5.jpg', legenda: 'Cozinha' },
  ],
};
