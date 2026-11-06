import 'server-only';

export function ambientePiloto(): 'desenvolvimento' | 'homologacao' {
  const value = process.env.PILOTO_AMBIENTE
    ?? (process.env.VERCEL_ENV === 'preview' ? 'homologacao' : 'desenvolvimento');

  if (value !== 'desenvolvimento' && value !== 'homologacao') {
    throw new Error('Ambiente do Piloto inválido.');
  }

  return value;
}
