export const landingContent = {
  hero: {
    eyebrow: "Plataforma & LP",
    title: "Sua escola preparada para qualquer situação",
    subtitle:
      "Transforme risco em segurança com o curso Gestão de Incidentes em Estabelecimentos de Ensino.",
    primaryCta: {
      label: "Quero garantir meu acesso agora",
      href: "#planos",
    },
    secondaryCta: {
      label: "Conhecer planos",
      href: "#planos",
    },
    trustBadges: [
      "+200 profissionais capacitados",
      "+70 protocolos implantados",
      "Metodologia validada na UnB e SEDF",
    ],
  },
  audience: {
    id: "para-quem",
    title: "Feito para quem lidera, protege e educa.",
    description:
      "Se você faz parte de uma escola, sabe que a segurança é responsabilidade de todos. Este curso é ideal para:",
    items: [
      {
        title: "Gestores e diretores",
        description: "Protocolos claros para prevenção e resposta a incidentes em toda a instituição.",
        icon: "ShieldCheck",
      },
      {
        title: "Professores e coordenadores",
        description: "Preparação prática para agir com segurança diante de qualquer cenário crítico.",
        icon: "Users",
      },
      {
        title: "Psicólogos e orientadores",
        description: "Mediação emocional e comunicação assertiva com alunos, famílias e equipes.",
        icon: "HeartHandshake",
      },
      {
        title: "Mantenedoras e redes escolares",
        description: "Implementação de uma cultura institucional de segurança contínua.",
        icon: "Building2",
      },
    ],
  },
  outcomes: {
    id: "resultados",
    title: "Resultados reais, aplicáveis e transformadores.",
    items: [
      "Um protocolo de gestão de incidentes pronto para aplicar na sua escola.",
      "Planos de ação para evacuação, lockdown e comunicação de crise.",
      "Checklist de resposta e simulação de incidentes.",
      "Maior tranquilidade, preparo e confiança para toda a comunidade escolar.",
    ],
  },
  workflow: {
    id: "como-funciona",
    title: "Aprenda no seu ritmo, com acompanhamento e prática.",
    steps: [
      {
        title: "Acesse as aulas",
        description:
          "12 videoaulas gravadas com o especialista Hamilton Esteves, com linguagem clara e prática.",
        icon: "PlayCircle",
      },
      {
        title: "Baixe os modelos",
        description: "Protocolos, checklists e formulários para personalizar e aplicar na sua instituição.",
        icon: "FileDown",
      },
      {
        title: "Implemente e valide",
        description: "Monte o plano da sua escola, valide com sua equipe e fortaleça sua cultura de segurança.",
        icon: "ClipboardCheck",
      },
    ],
    highlight:
      "Tudo em uma plataforma própria, com login individual, certificado de conclusão e suporte exclusivo.",
  },
  curriculum: {
    id: "conteudo",
    title: "Do conceito à prática: veja o que você vai aprender.",
    modules: [
      "Introdução à Gestão de Incidentes em Escolas",
      "Estrutura e papéis no Sistema de Gestão de Incidentes",
      "Identificação e avaliação de riscos",
      "Comunicação e resposta em situações críticas",
      "Planos de Evacuação e Lockdown",
      "Gestão de Conflitos e Comunicação Não Violenta",
      "Primeiras ações e comando inicial",
      "Coordenação de equipes e recursos",
      "Relacionamento com a imprensa e redes sociais durante crises",
      "Simulações e exercícios práticos",
      "Avaliação pós-incidente e melhoria contínua",
      "Elaboração do Protocolo Final da Escola",
    ],
  },
  materials: {
    id: "bonus",
    title: "Materiais e bônus exclusivos.",
    items: [
      { title: "Modelos de protocolo", description: "Evacuação e lockdown prontos para personalizar.", icon: "FileDigit" },
      { title: "Checklist de gestão", description: "Fluxo completo de resposta a incidentes.", icon: "ListCheck" },
      {
        title: "E-book Comunicação Não Violenta",
        description: "Guia de mediação e comunicação em cenários críticos.",
        icon: "BookOpenCheck",
      },
      {
        title: "Aula bônus",
        description: "Como lidar com imprensa e redes sociais durante um incidente.",
        icon: "Megaphone",
      },
      {
        title: "Grupo exclusivo",
        description: "WhatsApp para suporte e trocas entre participantes.",
        icon: "MessageCircle",
      },
      {
        title: "Selo Escola Segura",
        description: "Reconhecimento para instituições certificadas.",
        icon: "Award",
      },
    ],
  },
  testimonial: {
    id: "prova-social",
    title: "Uma metodologia já validada em campo.",
    description:
      "O curso foi aplicado com sucesso em escolas públicas do Distrito Federal e na Universidade de Brasília (UnB), formando mais de 200 profissionais e resultando em mais de 70 protocolos de segurança implantados.",
    quote:
      "A metodologia é prática, realista e transformadora. Nossas equipes se sentem preparadas e seguras para agir em qualquer situação.",
    author: "Gestora escolar participante do curso piloto - DF",
    logos: ["unb", "sedf"],
  },
  plans: {
    id: "planos",
    title: "Planos e investimento.",
    description: "Escolha o formato ideal para sua necessidade:",
    items: [
      {
        sku: "ESSENCIAL",
        name: "Essencial",
        description: "12 aulas gravadas + modelos + certificado",
        idealFor: "Profissionais individuais",
        price: "R$ 497",
        ctaLabel: "Ir para checkout",
        highlight: false,
        checkoutEnvKey: "NEXT_PUBLIC_CHECKOUT_URL_ESSENCIAL",
      },
      {
        sku: "PRO",
        name: "Pro",
        description: "Tudo do Essencial + 2 encontros de mentoria em grupo",
        idealFor: "Coordenadores e diretores",
        price: "R$ 997",
        ctaLabel: "Ir para checkout",
        highlight: true,
        checkoutEnvKey: "NEXT_PUBLIC_CHECKOUT_URL_PRO",
      },
      {
        sku: "INSTITUCIONAL",
        name: "Institucional",
        description: "Licenças + revisão de protocolo + sessão com o formador",
        idealFor: "Escolas e redes",
        price: "Sob consulta",
        ctaLabel: "Falar com especialista",
        highlight: false,
        checkoutEnvKey: "NEXT_PUBLIC_CHECKOUT_URL_INSTITUCIONAL",
      },
    ],
  },
  guarantee: {
    id: "garantia",
    title: "Certificado e garantia.",
    items: [
      {
        title: "Certificado 60h",
        description: "Emitido pela plataforma ao concluir todas as aulas.",
        icon: "GraduationCap",
      },
      {
        title: "Garantia 7 dias",
        description: "Se não estiver satisfeito, devolvemos seu investimento.",
        icon: "BadgeCheck",
      },
      {
        title: "Acesso vitalício",
        description: "Aulas e materiais sempre disponíveis, com atualizações.",
        icon: "Infinity",
      },
    ],
  },
  faq: {
    id: "faq",
    title: "Perguntas frequentes.",
    items: [
      {
        question: "Por quanto tempo terei acesso ao curso?",
        answer: "Acesso vitalício às aulas e materiais, incluindo futuras atualizações.",
      },
      {
        question: "Receberei certificado?",
        answer: "Sim. Ao concluir todas as aulas, você recebe automaticamente o certificado de 60h.",
      },
      {
        question: "Posso comprar para minha escola inteira?",
        answer:
          "Sim! Temos planos institucionais com licenças múltiplas e sessões personalizadas. Fale com nossa equipe comercial para alinhar a necessidade.",
      },
      {
        question: "Como funcionam os bônus e o grupo de suporte?",
        answer:
          "Após a compra, você recebe o link do grupo exclusivo no WhatsApp e o acesso aos materiais complementares diretamente na plataforma.",
      },
      {
        question: "O curso é reconhecido oficialmente?",
        answer:
          "É um curso livre, com metodologia validada em instituições públicas e privadas e formadores com experiência comprovada.",
      },
    ],
  },
  finalCta: {
    id: "cta-final",
    title: "Sua escola pronta para agir com segurança começa aqui.",
    subtitle:
      "Invista hoje em prevenção, preparo e tranquilidade. Em poucas horas, você pode transformar a gestão de segurança da sua instituição.",
    ctaLabel: "Garantir meu acesso agora",
    ctaHref: "#planos",
  },
  footer: {
    contactEmail: "contato@gestaodeincidentes.com.br",
    contactWhatsapp: "(61) 99984-0651",
    trainers: ["Hamilton Santos Esteves Junior", "Marcos de Alencar Dantas"],
    links: [
      { label: "Política de Privacidade", href: "#politica-de-privacidade" },
      { label: "Termos de Uso", href: "#termos-de-uso" },
      { label: "Certificação Digital", href: "#certificacao-digital" },
    ],
  },
} as const;

export type IconName =
  | "Award"
  | "BadgeCheck"
  | "BookOpenCheck"
  | "Building2"
  | "ClipboardCheck"
  | "FileDigit"
  | "FileDown"
  | "GraduationCap"
  | "HeartHandshake"
  | "Infinity"
  | "ListCheck"
  | "Megaphone"
  | "MessageCircle"
  | "PlayCircle"
  | "ShieldCheck"
  | "Users";

export type PlanItem = (typeof landingContent)["plans"]["items"][number];
