export type FaqEntry = { question: string; answer: string }

export const faq: FaqEntry[] = [
  {
    question: 'Quem pode usar o Unishop?',
    answer:
      'Apenas alunos da Unifor com e-mail institucional (@edu.unifor.br). A verificação acontece no cadastro, antes de você poder comprar ou anunciar.',
  },
  {
    question: 'O Unishop cobra alguma taxa?',
    answer:
      'Não. Anunciar e comprar é gratuito. Nos pagamentos feitos pelo site, só é aplicada a tarifa do meio de pagamento (cartão ou Pix).',
  },
  {
    question: 'Como faço para entrar em contato com o vendedor?',
    answer:
      "Todo anúncio tem o WhatsApp do vendedor. Clique em 'Fazer pedido' e escolha 'Falar com o vendedor' para abrir a conversa.",
  },
  {
    question: 'Posso pagar pelo site?',
    answer:
      "Sim. Ao fazer o pedido, escolha 'Seguir para o pagamento' e pague com cartão de crédito ou Pix. O vendedor é avisado na hora.",
  },
  {
    question: 'Onde retiro o item que comprei?',
    answer:
      'Você combina a retirada com o vendedor, sempre dentro do campus da Unifor, em um bloco e horário que funcione para os dois.',
  },
  {
    question: 'O que posso anunciar?',
    answer:
      'Livros, apostilas, eletrônicos, materiais de curso, alimentos e outros itens úteis para alunos. Itens proibidos pela universidade não são permitidos.',
  },
]
