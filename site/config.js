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

  // Regras de valor
  valorAdulto: 50, // R$ por adulto
  idadeAdulto: 15, // paga quem tem esta idade ou mais
  kgPorAdulto: 1, // quilos de alimento por adulto

  /*
   * Alimentos que a página distribui entre os adultos (um por adulto).
   * "proporcao" define a frequência: quem tem 3 aparece três vezes mais do que quem tem 1.
   * Deixe a lista vazia ([]) para mostrar apenas "1 kg de alimento não perecível".
   */
  alimentos: [
    { nome: 'arroz', proporcao: 3 },
    { nome: 'feijão', proporcao: 2 },
    { nome: 'macarrão', proporcao: 2 },
    { nome: 'açúcar', proporcao: 1 },
    { nome: 'flocão de milho (cuscuz)', proporcao: 1 },
  ],

  /*
   * Pix que recebe as inscrições.
   * Enquanto "chave" estiver vazia, a página avisa que o Pix ainda não foi cadastrado
   * e não mostra QR Code.
   */
  pix: {
    chave: '', // telefone com DDD, CPF, CNPJ, e-mail ou chave aleatória
    tipo: '', // opcional: 'telefone', 'cpf', 'cnpj', 'email' ou 'aleatoria' (se vazio, a página deduz)
    favorecido: '', // nome de quem recebe, como aparece no banco
    cidade: '', // cidade da conta
  },

  // WhatsApp que recebe os comprovantes, com DDD. Ex.: '82999998888'
  whatsapp: '',

  /*
   * Endereço que grava as inscrições na planilha do Google (termina em /exec).
   * Veja como gerar no começo do arquivo planilha/Codigo.gs.
   * Enquanto estiver vazio, as inscrições NÃO ficam gravadas em lugar nenhum.
   */
  planilha: '',

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
