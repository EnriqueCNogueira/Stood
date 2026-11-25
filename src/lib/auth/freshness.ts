const MS_PER_DAY = 86_400_000;

// Login recente: ligar ou desligar Conta e apagar o cadastro pedem uma Sessão de até 1 dia.
// Renovar a Sessão não muda a data em que ela foi criada, então não conta como entrar de novo.
export function isFreshSession(createdAt: Date, now = new Date()) {
  return now.getTime() - createdAt.getTime() <= MS_PER_DAY;
}
