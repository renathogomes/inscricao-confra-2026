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

  /*
   * Alimento que cada adulto leva. A página sorteia um item da lista para cada adulto
   * e, dentro da mesma inscrição, evita repetir.
   *
   * As quantidades fazem cada pessoa gastar mais ou menos o mesmo, perto de R$ 10.
   * A conta usa o preço mediano da pesquisa do Procon Maceió de 6 e 7 de outubro de 2026
   * (9 mercados) e está no comentário de cada linha.
   *
   * quantidade + unidade: o que a pessoa leva. A unidade pode ser 'kg', 'g', 'L', 'ml'
   *   ou uma palavra no singular, como 'pacote', 'dúzia' ou 'garrafa' (o plural sai sozinho).
   * proporcao: quantas vezes o item sai em relação aos outros (3 sai três vezes mais que 1).
   *
   * Deixe a lista vazia ([]) para pedir apenas "1 kg de alimento não perecível".
   */
  alimentos: [
    { nome: 'arroz', quantidade: 2, unidade: 'kg', proporcao: 3 }, // 2 × R$ 5,49 = R$ 10,98
    { nome: 'feijão', quantidade: 1, unidade: 'kg', proporcao: 3 }, // R$ 8,49
    { nome: 'frango', quantidade: 1, unidade: 'kg', proporcao: 3 }, // R$ 13,98 (frango inteiro)
    { nome: 'carne', quantidade: 250, unidade: 'g', proporcao: 3 }, // R$ 45,90 o kg (coxão mole) = R$ 11,48
    { nome: 'macarrão', quantidade: 4, unidade: 'pacote', proporcao: 2 }, // 4 × R$ 2,62 (400 g) = R$ 10,48
    { nome: 'flocão de milho (cuscuz)', quantidade: 3, unidade: 'kg', proporcao: 2 }, // 6 × R$ 1,79 (500 g) = R$ 10,74
    { nome: 'leite', quantidade: 1, unidade: 'L', proporcao: 2 }, // R$ 7,99
    { nome: 'ovos', quantidade: 1, unidade: 'dúzia', proporcao: 2 }, // R$ 18,86 a cartela de 30 = R$ 7,54 a dúzia
    { nome: 'óleo (900 ml)', quantidade: 1, unidade: 'garrafa', proporcao: 2 }, // R$ 8,98
    { nome: 'açúcar', quantidade: 3, unidade: 'kg', proporcao: 1 }, // 3 × R$ 3,49 = R$ 10,47
    { nome: 'farinha', quantidade: 2, unidade: 'kg', proporcao: 1 }, // 2 × R$ 6,32 (mandioca) = R$ 12,64
  ],

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
