'use client';

import { useState } from 'react';

export function ImprimirAgenda() {
  return <button type="button" className="painel-controle painel-controle-destaque" onClick={() => window.print()}>Imprimir</button>;
}

export function DataAgenda({ data, min, max }: { data: string; min: string; max: string }) {
  const [selecionada, setSelecionada] = useState(data);
  return (
    <label>Data da agenda
      <span className="agenda-data">
        <span aria-hidden="true">{selecionada.split('-').reverse().join('/')}</span>
        <input name="dataAgenda" type="date" value={selecionada} min={min} max={max} required
          onChange={evento => setSelecionada(evento.currentTarget.value)} />
      </span>
    </label>
  );
}
