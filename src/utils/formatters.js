// Formatters and calculations for Gestão de Atendimento

export function formatCurrency(value) {
  if (value === null || value === undefined || isNaN(value)) return 'R$ 0,00';
  return Number(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function formatNumber(value) {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return Number(value).toLocaleString('pt-BR');
}

export function formatPercent(value) {
  if (value === null || value === undefined || isNaN(value) || !isFinite(value)) return '0%';
  return `${Number(value).toFixed(1).replace('.', ',')}%`;
}

export function formatDateBR(dateStr) {
  if (!dateStr) return '—';
  // If dateStr is YYYY-MM-DD
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export function calculateRates(record) {
  const contatos = Number(record.contatos || 0);
  const respostas = Number(record.respostas || 0);
  const atendimentos = Number(record.atendimentos || 0);
  const propostas = Number(record.propostas || 0);
  const vendas = Number(record.vendas || 0);
  const valor = Number(record.valor_vendido || 0);

  const taxaResposta = contatos > 0 ? (respostas / contatos) * 100 : null;
  const taxaAtendimento = respostas > 0 ? (atendimentos / respostas) * 100 : null;
  const taxaProposta = atendimentos > 0 ? (propostas / atendimentos) * 100 : null;
  const taxaFechamento = propostas > 0 ? (vendas / propostas) * 100 : null;
  const ticketMedio = vendas > 0 ? valor / vendas : null;

  return {
    taxaResposta: taxaResposta !== null ? formatPercent(taxaResposta) : '—',
    taxaAtendimento: taxaAtendimento !== null ? formatPercent(taxaAtendimento) : '—',
    taxaProposta: taxaProposta !== null ? formatPercent(taxaProposta) : '—',
    taxaFechamento: taxaFechamento !== null ? formatPercent(taxaFechamento) : '—',
    ticketMedio: ticketMedio !== null ? formatCurrency(ticketMedio) : '—',
    rawTaxaFechamento: taxaFechamento || 0,
    rawTaxaAtendimento: taxaAtendimento || 0
  };
}

