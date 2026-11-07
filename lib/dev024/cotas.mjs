/** DEV-024: avaliação pura. A reserva real exige transação no PostgreSQL. */
export function avaliarCota({regras,reservas,pedido}) {
  if (!Array.isArray(regras)||!Array.isArray(reservas)||!pedido||typeof pedido!=='object') throw new TypeError('Entrada inválida');
  const dimensoes=['unidadeId','convenioId','procedimentoId','grupoId'];
  for(const k of [...dimensoes,'inicio']) if(typeof pedido[k]!=='string'||!pedido[k].trim()) throw new TypeError('Pedido inválido: '+k);
  const instante=Date.parse(pedido.inicio);
  if(!Number.isFinite(instante)||!/(Z|[+-]\d\d:\d\d)$/.test(pedido.inicio)) throw new TypeError('Início deve conter fuso');
  const detalhes=[];
  for(const r of regras) {
    if(!r||typeof r!=='object'||typeof r.id!=='string'||!r.id.trim()||typeof r.unidadeId!=='string'||!r.unidadeId.trim()||!Number.isSafeInteger(r.limite)||r.limite<0||!Number.isSafeInteger(r.intervaloMinutos)||r.intervaloMinutos<1) throw new TypeError('Regra inválida');
    for(const k of dimensoes.slice(1)) if(r[k]!=null&&(typeof r[k]!=='string'||!r[k].trim())) throw new TypeError('Dimensão inválida');
    if(r.ativo!==undefined&&typeof r.ativo!=='boolean') throw new TypeError('Estado da regra inválido');
    if(r.ativo===false||r.unidadeId!==pedido.unidadeId||!dimensoes.slice(1).every(k=>r[k]==null||r[k]===pedido[k])) continue;
    const duracao=r.intervaloMinutos*60000;
    if(!Number.isSafeInteger(duracao)||duracao>8640000000000000) throw new TypeError('Intervalo em milissegundos inválido');
    const inicio=Math.floor(instante/duracao)*duracao;
    let usados=0;
    for(const x of reservas) {
      if(!x||typeof x!=='object') throw new TypeError('Reserva inválida');
      if(x.status==='cancelada') continue;
      const t=Date.parse(x.inicio);
      if(typeof x.inicio!=='string'||!Number.isFinite(t)||!/(Z|[+-]\d\d:\d\d)$/.test(x.inicio)) throw new TypeError('Data da reserva inválida');
      if(x.unidadeId===pedido.unidadeId&&dimensoes.slice(1).every(k=>r[k]==null||x[k]===pedido[k])&&t>=inicio&&t<inicio+duracao) usados++;
    }
    detalhes.push({regraId:r.id,limite:r.limite,usados,disponiveis:Math.max(0,r.limite-usados),permitido:usados<r.limite});
  }
  return {permitido:detalhes.every(x=>x.permitido),detalhes};
}
