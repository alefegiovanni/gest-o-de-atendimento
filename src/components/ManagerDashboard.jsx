import React, { useState, useEffect } from 'react';
import { 
  Users, Target, BarChart3, TrendingUp, AlertTriangle, 
  CheckCircle, Clock, Calendar, Download, Filter, 
  ChevronRight, Award, DollarSign, FileSpreadsheet, Eye, Printer, Layers
} from 'lucide-react';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import * as XLSX from 'xlsx';
import { formatCurrency, formatNumber, formatPercent, formatDateBR } from '../utils/formatters';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function ManagerDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [periodo, setPeriodo] = useState('mes');
  const [vendedorId, setVendedorId] = useState('todos');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [sellersList, setSellersList] = useState([]);
  const [barMetric, setBarMetric] = useState('valor_vendido'); // 'valor_vendido', 'vendas', 'atendimentos', 'contatos'

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      let url = `/api/manager/dashboard?periodo=${periodo}&vendedor_id=${vendedorId}`;
      if (periodo === 'custom' && dataInicio && dataFim) {
        url += `&data_inicio=${dataInicio}&data_fim=${dataFim}`;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }

      // Fetch sellers list for dropdown
      const sRes = await fetch('/api/manager/sellers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (sRes.ok) {
        const sJson = await sRes.json();
        setSellersList(sJson.sellers);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [periodo, vendedorId]);

  const handleCustomFilter = () => {
    if (periodo === 'custom' && dataInicio && dataFim) {
      fetchDashboardData();
    }
  };

  // Exportar Excel
  const exportToExcel = () => {
    if (!data || !data.ranking) return;

    const exportRows = data.ranking.map(r => ({
      'Posição': r.posicao,
      'Vendedor': r.nome_completo,
      'Contatos': r.contatos,
      'Respostas': r.respostas,
      'Atendimentos': r.atendimentos,
      'Propostas': r.propostas,
      'Vendas Fechadas': r.vendas,
      'Valor Vendido (R$)': r.valor_vendido,
      'Taxa de Atendimento': `${r.taxa_atendimento}%`,
      'Taxa de Fechamento': `${r.taxa_fechamento}%`,
      '% Meta Valor': `${r.percentual_meta_valor}%`
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ranking_Vendas');
    XLSX.writeFile(wb, `Relatorio_Gestao_Atendimento_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading && !data) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
        <p>Carregando painel de inteligência comercial...</p>
      </div>
    );
  }

  const totals = data?.totais || {};
  const prevTotals = data?.mes_anterior || {};
  const alerts = data?.alertas || {};
  const ranking = data?.ranking || [];
  const teamGoal = data?.meta_equipe || {};

  // Taxas médias
  const taxaMediaAtendimento = totals.respostas > 0 ? (totals.atendimentos / totals.respostas) * 100 : 0;
  const taxaMediaFechamento = totals.propostas > 0 ? (totals.vendas / totals.propostas) * 100 : 0;
  const pctMetaEquipeValor = teamGoal.meta_valor_vendido > 0 ? (totals.valor_vendido / teamGoal.meta_valor_vendido) * 100 : 0;

  // Comparação mês anterior (crescimento %)
  const calcGrowth = (curr, prev) => {
    if (!prev || prev === 0) return null;
    return Math.round(((curr - prev) / prev) * 100);
  };
  const growthValor = calcGrowth(totals.valor_vendido, prevTotals.valor_vendido);
  const growthVendas = calcGrowth(totals.vendas, prevTotals.vendas);

  // 1. Gráfico de Barras: Comparativo de Vendedores
  const barChartData = {
    labels: ranking.map(r => r.primeiro_nome),
    datasets: [
      {
        label: barMetric === 'valor_vendido' ? 'Valor Vendido (R$)' : 
               barMetric === 'vendas' ? 'Vendas Fechadas' :
               barMetric === 'atendimentos' ? 'Atendimentos' : 'Contatos',
        data: ranking.map(r => r[barMetric]),
        backgroundColor: barMetric === 'valor_vendido' ? '#10b981' :
                         barMetric === 'vendas' ? '#0f2d59' :
                         barMetric === 'atendimentos' ? '#0284c7' : '#64748b',
        borderRadius: 6
      }
    ]
  };

  // 2. Gráfico de Linha: Evolução Diária da Equipe
  const dailyEv = data?.evolucao_diaria || [];
  const lineChartData = {
    labels: dailyEv.map(d => formatDateBR(d.data).slice(0, 5)),
    datasets: [
      {
        label: 'Contatos',
        data: dailyEv.map(d => d.contatos),
        borderColor: '#94a3b8',
        backgroundColor: 'rgba(148, 163, 184, 0.1)',
        tension: 0.3
      },
      {
        label: 'Atendimentos',
        data: dailyEv.map(d => d.atendimentos),
        borderColor: '#0284c7',
        backgroundColor: 'rgba(2, 132, 199, 0.1)',
        tension: 0.3
      },
      {
        label: 'Vendas Fechadas',
        data: dailyEv.map(d => d.vendas),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        tension: 0.3,
        borderWidth: 2.5
      }
    ]
  };

  // 3. Gráfico de Rosca: Market Share de Vendas da Equipe
  const doughnutColors = ['#0f2d59', '#10b981', '#0284c7', '#f59e0b', '#8b5cf6', '#ec4899'];
  const doughnutData = {
    labels: ranking.map(r => r.primeiro_nome),
    datasets: [
      {
        data: ranking.map(r => r.valor_vendido),
        backgroundColor: doughnutColors.slice(0, ranking.length),
        borderWidth: 2,
        borderColor: '#ffffff'
      }
    ]
  };

  // 4. Gráfico de Metas: Individual vs Meta
  const goalsBarData = {
    labels: ranking.map(r => r.primeiro_nome),
    datasets: [
      {
        label: 'Realizado (R$)',
        data: ranking.map(r => r.valor_vendido),
        backgroundColor: '#10b981',
        borderRadius: 6
      },
      {
        label: 'Meta Individual (R$)',
        data: ranking.map(r => r.meta_valor),
        backgroundColor: '#cbd5e1',
        borderRadius: 6
      }
    ]
  };

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '24px 16px' }}>

      {/* Top Bar com Filtros e Ações de Relatório */}
      <div style={{
        backgroundColor: '#ffffff',
        padding: '20px',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px'
      }}>
        {/* Filtros */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={18} color="#0f2d59" />
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f2d59' }}>Filtrar:</span>
          </div>

          {/* Período */}
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              fontWeight: '600',
              color: '#334155'
            }}
          >
            <option value="hoje">Hoje</option>
            <option value="semana">Esta Semana</option>
            <option value="mes">Este Mês</option>
            <option value="custom">Personalizado...</option>
          </select>

          {/* Vendedor */}
          <select
            value={vendedorId}
            onChange={(e) => setVendedorId(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              fontWeight: '600',
              color: '#334155'
            }}
          >
            <option value="todos">Toda a Equipe</option>
            {sellersList.map(s => (
              <option key={s.id} value={s.id}>{s.nome_completo}</option>
            ))}
          </select>

          {periodo === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
              />
              <span style={{ fontSize: '12px', color: '#64748b' }}>até</span>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
              />
              <button
                onClick={handleCustomFilter}
                style={{
                  padding: '7px 14px',
                  backgroundColor: '#0f2d59',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Aplicar
              </button>
            </div>
          )}
        </div>

        {/* Botões de Ação / Exportação */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={exportToExcel}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 14px',
              borderRadius: '8px',
              border: '1px solid #10b981',
              backgroundColor: '#ecfdf5',
              color: '#065f46',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <FileSpreadsheet size={16} />
            <span>Exportar Excel</span>
          </button>

          <button
            onClick={handlePrint}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#f8fafc',
              color: '#334155',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <Printer size={16} />
            <span>Imprimir / PDF</span>
          </button>
        </div>
      </div>

      {/* Seção de Alertas do Gerente */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        
        {/* Alerta 1: Registros Pendentes Hoje */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          padding: '18px',
          border: '1px solid',
          borderColor: alerts.pendentes_hoje?.length > 0 ? '#fed7aa' : '#bbf7d0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={20} color={alerts.pendentes_hoje?.length > 0 ? '#ea580c' : '#16a34a'} />
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>
                Lançamentos de Hoje
              </h4>
            </div>
            <span style={{
              fontSize: '12px',
              fontWeight: '700',
              padding: '2px 8px',
              borderRadius: '12px',
              backgroundColor: alerts.pendentes_hoje?.length > 0 ? '#ffedd5' : '#dcfce7',
              color: alerts.pendentes_hoje?.length > 0 ? '#c2410c' : '#15803d'
            }}>
              {alerts.total_registrados_hoje} / {alerts.total_vendedores_ativos} preenchidos
            </span>
          </div>

          {alerts.pendentes_hoje?.length > 0 ? (
            <div>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>
                Vendedores ativos que ainda não preencheram:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {alerts.pendentes_hoje.map(s => (
                  <span
                    key={s.id}
                    style={{
                      fontSize: '12px',
                      backgroundColor: '#fff7ed',
                      border: '1px solid #fdba74',
                      color: '#9a3412',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontWeight: '600'
                    }}
                  >
                    {s.nome_completo}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p style={{ fontSize: '13px', color: '#16a34a', margin: 0, fontWeight: '600' }}>
              🎉 Parabéns! Todos os vendedores ativos já registraram os resultados de hoje.
            </p>
          )}
        </div>

        {/* Alerta 2: Ritmo da Meta Mensal */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          padding: '18px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <AlertTriangle size={20} color="#f59e0b" />
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>
              Ritmo de Vendas e Superações
            </h4>
          </div>

          {alerts.metas_batidas?.length > 0 && (
            <div style={{ marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: '700' }}>⭐ Meta do Mês Batida: </span>
              {alerts.metas_batidas.map(m => (
                <span key={m.user_id} style={{ fontSize: '12px', color: '#15803d', fontWeight: '600' }}>
                  {m.nome} ({m.percentual}%)
                </span>
              ))}
            </div>
          )}

          {alerts.ritmo_baixo?.length > 0 ? (
            <div>
              <p style={{ fontSize: '12px', color: '#b45309', margin: '4px 0', fontWeight: '600' }}>
                Atenção ao ritmo: {alerts.ritmo_baixo.map(r => `${r.nome} (${r.percentual}% da meta)`).join(', ')}
              </p>
            </div>
          ) : (
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
              Equipe dentro da projeção esperada para o período.
            </p>
          )}
        </div>

      </div>

      {/* Cards de Indicadores Principais */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '28px'
      }}>
        {/* Total Contatos */}
        <div style={{ backgroundColor: '#ffffff', padding: '18px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Contatos Feitos</span>
          <p style={{ fontSize: '26px', fontWeight: '800', color: '#0f2d59', margin: '6px 0 0 0' }}>
            {formatNumber(totals.contatos)}
          </p>
        </div>

        {/* Respostas */}
        <div style={{ backgroundColor: '#ffffff', padding: '18px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Responderam</span>
          <p style={{ fontSize: '26px', fontWeight: '800', color: '#0284c7', margin: '6px 0 0 0' }}>
            {formatNumber(totals.respostas)}
          </p>
          <small style={{ fontSize: '11px', color: '#64748b' }}>
            Tx Resp: {formatPercent(totals.contatos > 0 ? (totals.respostas / totals.contatos) * 100 : 0)}
          </small>
        </div>

        {/* Atendimentos */}
        <div style={{ backgroundColor: '#ffffff', padding: '18px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Atendimentos</span>
          <p style={{ fontSize: '26px', fontWeight: '800', color: '#0f2d59', margin: '6px 0 0 0' }}>
            {formatNumber(totals.atendimentos)}
          </p>
          <small style={{ fontSize: '11px', color: '#0284c7', fontWeight: '600' }}>
            Tx Atend: {formatPercent(taxaMediaAtendimento)}
          </small>
        </div>

        {/* Propostas */}
        <div style={{ backgroundColor: '#ffffff', padding: '18px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Propostas Feitas</span>
          <p style={{ fontSize: '26px', fontWeight: '800', color: '#f59e0b', margin: '6px 0 0 0' }}>
            {formatNumber(totals.propostas)}
          </p>
        </div>

        {/* Vendas Fechadas */}
        <div style={{ backgroundColor: '#ffffff', padding: '18px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#10b981', textTransform: 'uppercase' }}>Vendas Fechadas</span>
          <p style={{ fontSize: '26px', fontWeight: '800', color: '#10b981', margin: '6px 0 0 0' }}>
            {formatNumber(totals.vendas)}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <small style={{ fontSize: '11px', color: '#047857', fontWeight: '600' }}>
              Fechamento: {formatPercent(taxaMediaFechamento)}
            </small>
            {growthVendas !== null && (
              <span style={{ fontSize: '11px', fontWeight: '700', color: growthVendas >= 0 ? '#10b981' : '#ef4444' }}>
                {growthVendas >= 0 ? `+${growthVendas}%` : `${growthVendas}%`} vs mês ant.
              </span>
            )}
          </div>
        </div>

        {/* Valor Total Vendido */}
        <div style={{ backgroundColor: '#ffffff', padding: '18px', borderRadius: '14px', border: '2px solid #10b981', boxShadow: '0 4px 6px rgba(16, 185, 129, 0.1)' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#059669', textTransform: 'uppercase' }}>Valor Total Vendido</span>
          <p style={{ fontSize: '24px', fontWeight: '800', color: '#059669', margin: '6px 0 0 0' }}>
            {formatCurrency(totals.valor_vendido)}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
            <small style={{ fontSize: '11px', color: '#64748b' }}>
              Meta Equipe: {formatPercent(pctMetaEquipeValor)}
            </small>
            {growthValor !== null && (
              <span style={{ fontSize: '11px', fontWeight: '700', color: growthValor >= 0 ? '#10b981' : '#ef4444' }}>
                {growthValor >= 0 ? `+${growthValor}%` : `${growthValor}%`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Seção de Gráficos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        
        {/* 1. Comparativo por Vendedor */}
        <div style={{ backgroundColor: '#ffffff', padding: '22px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#0f2d59', margin: 0 }}>
              Comparativo de Desempenho
            </h4>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['valor_vendido', 'vendas', 'atendimentos', 'contatos'].map(metric => (
                <button
                  key={metric}
                  onClick={() => setBarMetric(metric)}
                  style={{
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: '600',
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: barMetric === metric ? '#0f2d59' : '#e2e8f0',
                    backgroundColor: barMetric === metric ? '#0f2d59' : '#f8fafc',
                    color: barMetric === metric ? '#ffffff' : '#475569',
                    cursor: 'pointer'
                  }}
                >
                  {metric === 'valor_vendido' ? 'Valor (R$)' : 
                   metric === 'vendas' ? 'Vendas' :
                   metric === 'atendimentos' ? 'Atendimentos' : 'Contatos'}
                </button>
              ))}
            </div>
          </div>
          <div style={{ height: '280px' }}>
            <Bar data={barChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>

        {/* 2. Evolução Diária da Equipe */}
        <div style={{ backgroundColor: '#ffffff', padding: '22px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#0f2d59', margin: '0 0 16px 0' }}>
            Evolução Diária da Equipe
          </h4>
          <div style={{ height: '280px' }}>
            <Line data={lineChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>

        {/* 3. Participação no Total Vendido (Market Share interno) */}
        <div style={{ backgroundColor: '#ffffff', padding: '22px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#0f2d59', margin: '0 0 16px 0' }}>
            Participação de Vendas por Vendedor
          </h4>
          <div style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Doughnut data={doughnutData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }} />
          </div>
        </div>

        {/* 4. Metas Individuais vs Realizado */}
        <div style={{ backgroundColor: '#ffffff', padding: '22px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#0f2d59', margin: '0 0 16px 0' }}>
            Realizado vs Meta Individual (R$)
          </h4>
          <div style={{ height: '280px' }}>
            <Bar data={goalsBarData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>

      </div>

      {/* Ranking da Equipe de Vendas */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f2d59', margin: 0 }}>
              Ranking de Produtividade da Equipe
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
              Destaque para o pódio com os 3 maiores volumes de vendas em consórcio.
            </p>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '12px 14px', color: '#475569', fontWeight: '700' }}>Posição</th>
                <th style={{ padding: '12px 14px', color: '#475569', fontWeight: '700' }}>Vendedor</th>
                <th style={{ padding: '12px 14px', color: '#475569', fontWeight: '700' }}>Contatos</th>
                <th style={{ padding: '12px 14px', color: '#475569', fontWeight: '700' }}>Atendimentos</th>
                <th style={{ padding: '12px 14px', color: '#475569', fontWeight: '700' }}>Propostas</th>
                <th style={{ padding: '12px 14px', color: '#475569', fontWeight: '700' }}>Vendas</th>
                <th style={{ padding: '12px 14px', color: '#475569', fontWeight: '700' }}>Total Vendido</th>
                <th style={{ padding: '12px 14px', color: '#475569', fontWeight: '700' }}>Tx Fechamento</th>
                <th style={{ padding: '12px 14px', color: '#475569', fontWeight: '700' }}>% Meta</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((row) => {
                const isPodium = row.posicao <= 3;
                const medalBg = row.posicao === 1 ? '#fef3c7' : row.posicao === 2 ? '#f1f5f9' : row.posicao === 3 ? '#ffedd5' : '#ffffff';
                const medalColor = row.posicao === 1 ? '#d97706' : row.posicao === 2 ? '#64748b' : row.posicao === 3 ? '#ea580c' : '#334155';

                return (
                  <tr 
                    key={row.user_id} 
                    style={{ 
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: row.posicao === 1 ? '#fefce8' : '#ffffff',
                      fontWeight: isPodium ? '600' : 'normal'
                    }}
                  >
                    <td style={{ padding: '14px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: medalBg,
                        color: medalColor,
                        fontWeight: '800',
                        fontSize: '13px'
                      }}>
                        {row.posicao === 1 ? '🥇 1' : row.posicao === 2 ? '🥈 2' : row.posicao === 3 ? '🥉 3' : row.posicao}
                      </span>
                    </td>
                    <td style={{ padding: '14px', color: '#0f2d59', fontWeight: '700' }}>
                      {row.nome_completo}
                    </td>
                    <td style={{ padding: '14px' }}>{formatNumber(row.contatos)}</td>
                    <td style={{ padding: '14px' }}>{formatNumber(row.atendimentos)}</td>
                    <td style={{ padding: '14px' }}>{formatNumber(row.propostas)}</td>
                    <td style={{ padding: '14px', color: '#10b981', fontWeight: '700' }}>
                      {formatNumber(row.vendas)}
                    </td>
                    <td style={{ padding: '14px', color: '#047857', fontWeight: '800' }}>
                      {formatCurrency(row.valor_vendido)}
                    </td>
                    <td style={{ padding: '14px' }}>{formatPercent(row.taxa_fechamento)}</td>
                    <td style={{ padding: '14px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '700',
                        backgroundColor: row.percentual_meta_valor >= 100 ? '#ecfdf5' : '#f8fafc',
                        color: row.percentual_meta_valor >= 100 ? '#059669' : '#0f2d59',
                        border: `1px solid ${row.percentual_meta_valor >= 100 ? '#a7f3d0' : '#e2e8f0'}`
                      }}>
                        {formatPercent(row.percentual_meta_valor)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

