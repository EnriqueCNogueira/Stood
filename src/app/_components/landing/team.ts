export type TeamMember = { name: string; photo?: string; linkedin?: string };

// Sem foto, o card mostra a inicial; sem LinkedIn, fica sem link
export const TEAM: TeamMember[] = [
  { name: "Enrique Nogueira", photo: "/equipe/enrique-nogueira.png", linkedin: "https://www.linkedin.com/in/enriquecnogueira" },
  { name: "Otávio Scalari", photo: "/equipe/otavio-scalari.png", linkedin: "https://www.linkedin.com/in/otavio-scalari" },
  { name: "João Victor", photo: "/equipe/joao-victor.png", linkedin: "https://www.linkedin.com/in/joao-victor-santos-silva-1255b3202" },
];
