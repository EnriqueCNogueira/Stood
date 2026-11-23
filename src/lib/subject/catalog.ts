import type { StoodTreeFile } from "@/lib/stood/tree";

// Matérias: Stoods globais, iguais para todos e só leitura, que o Usuário copia para um Stood dele.

type SubjectVideo = { topic: string; videoId: string };
export type Subject = { slug: string; name: string; description: string; videos: SubjectVideo[] };

// Os Vídeos ficam na ordem da ementa; o número no nome mantém essa ordem na árvore, que ordena por nome
export const SUBJECTS: Subject[] = [
  {
    slug: "calculo-1",
    name: "Cálculo 1",
    description: "Funções, limites, derivadas e integrais, com as aulas de Cálculo I da Unicamp publicadas pela UNIVESP.",
    videos: [
      { topic: "Introdução", videoId: "XJCmMuZV-JA" },
      { topic: "Funções", videoId: "vBxka1HhlAs" },
      { topic: "Limites", videoId: "8_Sgh5YnxY8" },
      { topic: "Regras de limites", videoId: "_bKzJP0Q778" },
      { topic: "Continuidade", videoId: "jXIP2GciTaY" },
      { topic: "Derivada", videoId: "HK6DDx8G7ZU" },
      { topic: "Regra da cadeia", videoId: "JMtmSdWcjqA" },
      { topic: "Derivação implícita", videoId: "f_PwzFrWp7Q" },
      { topic: "Taxas relacionadas", videoId: "2NAPSX-GHPI" },
      { topic: "Máximos e mínimos", videoId: "sIAowfuIz6Q" },
      { topic: "Teorema do Valor Médio", videoId: "pEMM0IKPJ1Y" },
      { topic: "Regra de L'Hôpital", videoId: "aYC5UqqDWP4" },
      { topic: "Integral e área", videoId: "p-HMNfGRgvE" },
      { topic: "Teorema Fundamental do Cálculo", videoId: "NaIgyOeN8KM" },
      { topic: "Áreas entre curvas", videoId: "KP-bf_Qwhdk" },
    ],
  },
  {
    slug: "programacao-orientada-a-objetos",
    name: "Programação Orientada a Objetos",
    description: "Classes, encapsulamento, herança, polimorfismo, interfaces, coleções e exceções em Java, com as aulas da UNIVESP.",
    videos: [
      { topic: "Paradigma orientado a objetos", videoId: "9czhqT7OyUs" },
      { topic: "Classes e objetos", videoId: "GHLFEhdk7Ys" },
      { topic: "Encapsulamento", videoId: "fzdLzuD7RAg" },
      { topic: "Herança e polimorfismo (parte 1)", videoId: "cmxIBX44Uws" },
      { topic: "Herança e polimorfismo (parte 2)", videoId: "07SgD8JMHnY" },
      { topic: "Interfaces e classes abstratas", videoId: "bOZQ9q7WhaY" },
      { topic: "Classes e métodos genéricos", videoId: "ufJkkwdw1C4" },
      { topic: "Coleções (parte 1)", videoId: "vr581qxQ4SE" },
      { topic: "Coleções (parte 2)", videoId: "WIUq0-JRM8A" },
      { topic: "Exceções (parte 1)", videoId: "dicmUJ5A6NY" },
      { topic: "Exceções (parte 2)", videoId: "M4l_6bV_Wgw" },
      { topic: "Streams e serialização", videoId: "vtL2r-WrPd8" },
    ],
  },
  {
    slug: "engenharia-de-software",
    name: "Engenharia de Software",
    description: "Processos, métodos ágeis, requisitos, modelagem, arquitetura, configuração e testes, com as aulas da UNIVESP.",
    videos: [
      { topic: "Processos de software", videoId: "kO1PSkzTsYc" },
      { topic: "Processo unificado", videoId: "o-09AFlJZTo" },
      { topic: "Métodos ágeis", videoId: "3vwne84TMgI" },
      { topic: "Programação extrema", videoId: "hF50lDTLYpo" },
      { topic: "Tipos de requisitos", videoId: "Pn93e2fgIro" },
      { topic: "Engenharia de requisitos", videoId: "KT8HIqryUV8" },
      { topic: "Elicitação de requisitos", videoId: "ME0LrcqbeO0" },
      { topic: "Validação de requisitos", videoId: "WOyF1_dEiTA" },
      { topic: "Modelos de contexto e interação", videoId: "KFTkzZ0Vfw0" },
      { topic: "Modelos estruturais", videoId: "0uhwR0ieLaM" },
      { topic: "Padrões de projeto", videoId: "Zywc5kZyscg" },
      { topic: "Arquitetura de software", videoId: "2R4l995J2Jw" },
      { topic: "Gerência de configuração", videoId: "eNYNv156YlY" },
      { topic: "Teste de software", videoId: "rYBiuN02hls" },
      { topic: "Desenvolvimento dirigido a testes", videoId: "3NjdV_-UTWo" },
    ],
  },
];

const SUBJECTS_BY_SLUG = new Map(SUBJECTS.map((subject) => [subject.slug, subject]));

export function findSubject(slug: string): Subject | undefined {
  return SUBJECTS_BY_SLUG.get(slug);
}

// Os Vídeos como Arquivos da raiz, do jeito que ficam no Stood copiado; o id do Vídeo é a chave da prévia
export function buildSubjectTree(subject: Subject): StoodTreeFile[] {
  return subject.videos.map((video, index) => ({
    kind: "file",
    id: video.videoId,
    name: `Vídeo ${index + 1}: ${video.topic}`,
    type: "video",
    videoId: video.videoId,
  }));
}
