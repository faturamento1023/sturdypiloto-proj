const diaISO = /^\d{4}-\d{2}-\d{2}$/;
const instanteISO = /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;
const minuto = 60_000;
const dia = 1440 * minuto;
const calendario = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo', dateStyle: 'short' });

export function dataAgenda(instante: Date) {
  return calendario.format(instante);
}

export function dataValida(data: string) {
  if (!diaISO.test(data) || data.startsWith('0000')) return false;
  const instante = new Date(data + 'T00:00:00Z');
  return Number.isFinite(instante.getTime()) && instante.toISOString().slice(0, 10) === data;
}

export function deslocarDia(data: string, dias: number) {
  const utc = new Date(Date.parse(data + 'T00:00:00Z') + dias * dia).toISOString().slice(0, 10);
  return dataValida(utc) ? utc : data;
}

// Primeiro instante do dia em São Paulo, inclusive em datas com troca de fuso à meia-noite.
function inicioLocal(data: string) {
  const meiaNoiteUTC = Date.parse(data + 'T00:00:00Z') / minuto;
  let inicio = meiaNoiteUTC - 1440;
  let fim = meiaNoiteUTC + 1440;
  while (inicio < fim) {
    const meio = Math.floor((inicio + fim) / 2);
    if (dataAgenda(new Date(meio * minuto)) < data) inicio = meio + 1;
    else fim = meio;
  }
  return new Date(inicio * minuto).toISOString();
}

export function janelaDoDia(data: string) {
  return { inicio: inicioLocal(data), fim: inicioLocal(deslocarDia(data, 1)) };
}

export function janelaValida(inicio: string, fim: string) {
  if ([inicio, fim].some(instante => !instanteISO.test(instante) || !dataValida(instante.slice(0, 10)))) return false;
  const duracao = Date.parse(fim) - Date.parse(inicio);
  return duracao > 0 && duracao <= 31 * dia;
}
