import React, { useState, useEffect } from 'react';
import { Users, Calendar, Clock, PhoneCall, MessageSquare, ChevronRight, X, ArrowUpRight, Trash2, AlertTriangle } from 'lucide-react';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function SimpleManagerDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [periodo, setPeriodo] = useState('hoje'); // 'hoje', 'semana', 'mes'
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [sellerRecords, setSellerRecords] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [feedback, setFeedback] = useState('');

  const handleDeleteSingleRecord = async (recordId, dateStr) => {
    const formattedDate = dateStr.split('-').reverse().join('/');
    if (!window.confirm(`Deseja realmente apagar o lançamento do dia ${formattedDate}?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/records/${recordId}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      
      let data = {};
      try {
        data = await res.json();
      } catch (e) {
        // ignore
      }

      if (!res.ok) throw new Error(data.error || `Erro ${res.status}: Falha ao apagar registro`);

      // Atualiza a lista do modal
      setSellerRecords(prev => prev.filter(r => r.id !== recordId));
      fetchDashboardData();
    } catch (err) {
      alert(err.message || 'Falha ao excluir registro');
    }
  };

  const handleDeleteSellerAllRecords = async (seller) => {
    if (!window.confirm(`ATENÇÃO GERENTE: Deseja apagar TODOS os registros de atendimentos de ${seller.nome_completo}? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/manager/records/seller/${seller.user_id}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      
      let data = {};
      try {
        data = await res.json();
      } catch(e) {
        // ignore parse error if empty
      }

      if (!res.ok) throw new Error(data.error || `Erro ${res.status}: Não foi possível apagar os registros`);

      alert(data.message || 'Lançamentos apagados com sucesso!');
      setSelectedSeller(null);
      fetchDashboardData();
    } catch (err) {
      alert(err.message || 'Erro ao apagar registros');
    }
  };

  const handleDeleteAllTeamRecords = async () => {
    if (!window.confirm("ATENÇÃO MÁXIMA: Deseja realmente APAGAR TODOS OS REGISTROS DE TODA A EQUIPE?")) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/manager/records/all', {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      let data = {};
      try {
        data = await res.json();
      } catch(e) {
        // ignore
      }

      if (!res.ok) throw new Error(data.error || `Erro ${res.status}: Não foi possível zerar o histórico`);

      alert(data.message || 'Histórico zerado com sucesso!');
      setSelectedSeller(null);
      fetchDashboardData();
    } catch (err) {
      alert(err.message || 'Erro ao zerar histórico');
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/manager/dashboard?periodo=${periodo}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [periodo]);

  const handleOpenSeller = async (seller) => {
    setSelectedSeller(seller);
    setLoadingDetails(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/manager/records?vendedor_id=${seller.user_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setSellerRecords(json.records || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  };

  if (loading && !data) {
    return <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Carregando dados da equipe...</div>;
  }

  const totals = data?.totais || {};
  const ranking = data?.ranking || [];

  // Cálculos para o gráfico Pizza do vendedor selecionado
  const contatos = selectedSeller ? selectedSeller.contatos : 0;
  const atenderam = selectedSeller ? selectedSeller.atendimentos : 0;
  const naoAtenderam = Math.max(0, contatos - atenderam);

  const pieData = {
    labels: ['Atenderam', 'Não Atenderam / Sem Resposta'],
    datasets: [
      {
        data: [atenderam, naoAtenderam],
        backgroundColor: ['#10b981', '#cbd5e1'],
        hoverBackgroundColor: ['#059669', '#94a3b8'],
        borderWidth: 2,
        borderColor: '#ffffff'
      }
    ]
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          font: { size: 12, weight: '600' },
          color: '#334155',
          padding: 16
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const val = context.raw || 0;
            const pct = contatos > 0 ? Math.round((val / contatos) * 100) : 0;
            return ` ${context.label}: ${val} (${pct}%)`;
          }
        }
      }
    }
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '24px 16px' }}>
      
      {/* Barra de Filtro de Período */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '20px'
      }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f2d59', margin: 0 }}>
            Visão Geral dos Atendimentos
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
            Clique no nome de qualquer colaborador para ver o gráfico e detalhes.
          </p>
        </div>

        {/* Botões do Período e Zerar */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={handleDeleteAllTeamRecords}
            title="Ação administrativa: apaga todos os registros de toda a equipe"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #fecaca',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            <Trash2 size={14} />
            <span>Zerar Histórico da Equipe</span>
          </button>

          <div style={{ display: 'flex', gap: '6px', backgroundColor: '#e2e8f0', padding: '4px', borderRadius: '10px' }}>
            {[
              { id: 'hoje', label: 'Hoje' },
              { id: 'semana', label: 'Esta Semana' },
              { id: 'mes', label: 'Este Mês' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => {
                  setPeriodo(p.id);
                  setSelectedSeller(null);
                }}
                style={{
                  padding: '6px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  backgroundColor: periodo === p.id ? '#0f2d59' : 'transparent',
                  color: periodo === p.id ? '#ffffff' : '#475569',
                  transition: 'all 0.2s'
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cards de Resumo Rápido */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        
        {/* Total Contatos */}
        <div style={{
          backgroundColor: '#ffffff',
          padding: '20px',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
        }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
            Total de Contatos Feitos
          </span>
          <p style={{ fontSize: '32px', fontWeight: '800', color: '#0f2d59', margin: '8px 0 0 0' }}>
            {totals.contatos || 0}
          </p>
          <small style={{ color: '#64748b', fontSize: '12px' }}>no período selecionado</small>
        </div>

        {/* Total Atendimentos */}
        <div style={{
          backgroundColor: '#ffffff',
          padding: '20px',
          borderRadius: '14px',
          border: '1.5px solid #059669',
          boxShadow: '0 2px 4px rgba(5, 150, 105, 0.08)'
        }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#059669', textTransform: 'uppercase' }}>
            Atendimentos Efetivos
          </span>
          <p style={{ fontSize: '32px', fontWeight: '800', color: '#059669', margin: '8px 0 0 0' }}>
            {totals.atendimentos || 0}
          </p>
          <small style={{ color: '#047857', fontSize: '12px', fontWeight: '600' }}>
            {totals.contatos > 0 ? Math.round((totals.atendimentos / totals.contatos) * 100) : 0}% de conversão geral
          </small>
        </div>

        {/* Total Não Atenderam */}
        <div style={{
          backgroundColor: '#ffffff',
          padding: '20px',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
        }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#dc2626', textTransform: 'uppercase' }}>
            Não Atenderam
          </span>
          <p style={{ fontSize: '32px', fontWeight: '800', color: '#dc2626', margin: '8px 0 0 0' }}>
            {Math.max(0, (totals.contatos || 0) - (totals.atendimentos || 0))}
          </p>
          <small style={{ color: '#991b1b', fontSize: '12px', fontWeight: '600' }}>
            {totals.contatos > 0 ? Math.round((Math.max(0, (totals.contatos || 0) - (totals.atendimentos || 0)) / totals.contatos) * 100) : 0}% sem atendimento
          </small>
        </div>

        {/* Total NF (Negócios Fechados) */}
        <div style={{
          backgroundColor: '#ffffff',
          padding: '20px',
          borderRadius: '14px',
          border: '1.5px solid #d4af37',
          boxShadow: '0 2px 4px rgba(212, 175, 55, 0.12)'
        }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#b45309', textTransform: 'uppercase' }}>
            NF (Negócios Fechados)
          </span>
          <p style={{ fontSize: '32px', fontWeight: '800', color: '#b45309', margin: '8px 0 0 0' }}>
            {totals.vendas || 0}
          </p>
          <small style={{ color: '#92400e', fontSize: '12px', fontWeight: '600' }}>
            {totals.atendimentos > 0 ? Math.round(((totals.vendas || 0) / totals.atendimentos) * 100) : 0}% de conversão de atendimentos
          </small>
        </div>
      </div>

      {/* Tabela dos Funcionários Clicáveis */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
      }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f2d59', margin: 0 }}>
            Resultado por Funcionário ({periodo === 'hoje' ? 'Hoje' : periodo === 'semana' ? 'Esta Semana' : 'Este Mês'})
          </h3>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Clique em um nome para detalhar</span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '12px 18px', color: '#475569', fontWeight: '700' }}>Funcionário (Clique para abrir)</th>
              <th style={{ padding: '12px 18px', color: '#475569', fontWeight: '700', textAlign: 'center' }}>Contatos</th>
              <th style={{ padding: '12px 18px', color: '#475569', fontWeight: '700', textAlign: 'center' }}>Atenderam</th>
              <th style={{ padding: '12px 18px', color: '#475569', fontWeight: '700', textAlign: 'center' }}>Não Atenderam</th>
              <th style={{ padding: '12px 18px', color: '#b45309', fontWeight: '800', textAlign: 'center' }}>NF (Fechados)</th>
              <th style={{ padding: '12px 18px', color: '#475569', fontWeight: '700', textAlign: 'center' }}>Aproveitamento</th>
              <th style={{ padding: '12px 18px', textAlign: 'center', width: '40px' }}></th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((row) => {
              const aproveitamento = row.contatos > 0 ? Math.round((row.atendimentos / row.contatos) * 100) : 0;
              const naoAtenderam = Math.max(0, (row.contatos || 0) - (row.atendimentos || 0));
              const nf = row.vendas || 0;

              return (
                <tr
                  key={row.user_id}
                  onClick={() => handleOpenSeller(row)}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s',
                    backgroundColor: selectedSeller?.user_id === row.user_id ? '#eff6ff' : 'transparent'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={(e) => {
                    if (selectedSeller?.user_id !== row.user_id) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <td style={{ padding: '14px 18px', fontWeight: '700', color: '#0f2d59' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ textDecoration: 'underline', textUnderlineOffset: '3px' }}>{row.nome_completo}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 18px', textAlign: 'center', fontSize: '15px', fontWeight: '700', color: '#334155' }}>
                    {row.contatos}
                  </td>
                  <td style={{ padding: '14px 18px', textAlign: 'center', fontSize: '15px', fontWeight: '800', color: '#059669' }}>
                    {row.atendimentos}
                  </td>
                  <td style={{ padding: '14px 18px', textAlign: 'center', fontSize: '15px', fontWeight: '700', color: '#dc2626' }}>
                    {naoAtenderam}
                  </td>
                  <td style={{ padding: '14px 18px', textAlign: 'center', fontSize: '15px', fontWeight: '800', color: '#b45309' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      backgroundColor: nf > 0 ? '#fef3c7' : 'transparent',
                      color: nf > 0 ? '#b45309' : '#64748b'
                    }}>
                      {nf}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '700',
                      backgroundColor: aproveitamento >= 50 ? '#ecfdf5' : '#f8fafc',
                      color: aproveitamento >= 50 ? '#059669' : '#64748b',
                      border: `1px solid ${aproveitamento >= 50 ? '#a7f3d0' : '#e2e8f0'}`
                    }}>
                      {aproveitamento}%
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px', textAlign: 'center', color: '#94a3b8' }}>
                    <ChevronRight size={18} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL DETALHE DO FUNCIONÁRIO COM GRÁFICO PIZZA */}
      {selectedSeller && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '540px',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            position: 'relative',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            {/* Botão Fechar */}
            <button
              onClick={() => setSelectedSeller(null)}
              style={{
                position: 'absolute',
                top: '18px',
                right: '18px',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b'
              }}
            >
              <X size={18} />
            </button>

            {/* Cabeçalho do Colaborador */}
            <div style={{ marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingRight: '40px' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
                  Detalhamento ({periodo === 'hoje' ? 'Hoje' : periodo === 'semana' ? 'Esta Semana' : 'Este Mês'})
                </span>
                <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f2d59', margin: '4px 0 0 0' }}>
                  {selectedSeller.nome_completo}
                </h3>
              </div>

              {/* Botão de Excluir todos os registros deste vendedor */}
              <button
                type="button"
                onClick={() => handleDeleteSellerAllRecords(selectedSeller)}
                title="Apagar todo o histórico deste funcionário"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid #fecaca',
                  backgroundColor: '#fef2f2',
                  color: '#dc2626',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                <Trash2 size={14} />
                <span>Apagar Histórico Dele</span>
              </button>
            </div>

            {/* Cards Numéricos (Contatos vs Atenderam vs Não Atenderam vs NF) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '20px' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <span style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Contatos</span>
                <p style={{ fontSize: '20px', fontWeight: '800', color: '#0f2d59', margin: '4px 0 0 0' }}>
                  {contatos}
                </p>
              </div>

              <div style={{ backgroundColor: '#ecfdf5', padding: '10px', borderRadius: '12px', border: '1px solid #a7f3d0', textAlign: 'center' }}>
                <span style={{ fontSize: '10px', fontWeight: '700', color: '#047857', textTransform: 'uppercase' }}>Atenderam</span>
                <p style={{ fontSize: '20px', fontWeight: '800', color: '#059669', margin: '4px 0 0 0' }}>
                  {atenderam}
                </p>
                <small style={{ fontSize: '10px', color: '#047857', fontWeight: '700' }}>
                  {contatos > 0 ? Math.round((atenderam / contatos) * 100) : 0}%
                </small>
              </div>

              <div style={{ backgroundColor: '#fef2f2', padding: '10px', borderRadius: '12px', border: '1px solid #fecaca', textAlign: 'center' }}>
                <span style={{ fontSize: '10px', fontWeight: '700', color: '#dc2626', textTransform: 'uppercase' }}>Não Atenderam</span>
                <p style={{ fontSize: '20px', fontWeight: '800', color: '#dc2626', margin: '4px 0 0 0' }}>
                  {Math.max(0, contatos - atenderam)}
                </p>
                <small style={{ fontSize: '10px', color: '#dc2626', fontWeight: '700' }}>
                  {contatos > 0 ? Math.round((Math.max(0, contatos - atenderam) / contatos) * 100) : 0}%
                </small>
              </div>

              <div style={{ backgroundColor: '#fffbeb', padding: '10px', borderRadius: '12px', border: '1px solid #fde68a', textAlign: 'center' }}>
                <span style={{ fontSize: '10px', fontWeight: '700', color: '#b45309', textTransform: 'uppercase' }}>NF</span>
                <p style={{ fontSize: '20px', fontWeight: '800', color: '#b45309', margin: '4px 0 0 0' }}>
                  {selectedSeller?.vendas || 0}
                </p>
                <small style={{ fontSize: '10px', color: '#b45309', fontWeight: '700' }}>
                  Fechados
                </small>
              </div>
            </div>

            {/* Gráfico Pizza */}
            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#0f2d59', margin: '0 0 12px 0', textAlign: 'center' }}>
                Proporção: Atenderam vs Não Atenderam
              </h4>

              {contatos > 0 ? (
                <div style={{ height: '220px', width: '100%', position: 'relative' }}>
                  <Pie data={pieData} options={pieOptions} />
                </div>
              ) : (
                <div style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '13px' }}>
                  Nenhum contato registrado neste período.
                </div>
              )}
            </div>

            {/* Histórico Recente de Lançamentos com Exclusão Individual */}
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#0f2d59', margin: '0 0 10px 0' }}>
                Lançamentos do Funcionário (Clique na lixeira para apagar um específico)
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sellerRecords.slice(0, 15).map(rec => (
                  <div
                    key={rec.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      backgroundColor: '#f8fafc',
                      fontSize: '13px',
                      border: '1px solid #f1f5f9'
                    }}
                  >
                    <span style={{ fontWeight: '700', color: '#334155' }}>
                      {rec.data.split('-').reverse().join('/')}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <span style={{ color: '#64748b' }}>
                        Contatos: <strong style={{ color: '#0f2d59' }}>{rec.contatos}</strong>
                      </span>
                      <span style={{ color: '#64748b' }}>
                        Atenderam: <strong style={{ color: '#059669' }}>{rec.atendimentos}</strong>
                      </span>
                      <span style={{ color: '#64748b' }}>
                        Não: <strong style={{ color: '#dc2626' }}>{Math.max(0, (rec.contatos || 0) - (rec.atendimentos || 0))}</strong>
                      </span>
                      <span style={{ color: '#64748b' }}>
                        NF: <strong style={{ color: '#b45309' }}>{rec.vendas || 0}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteSingleRecord(rec.id, rec.data)}
                        title="Apagar apenas este lançamento específico"
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {sellerRecords.length === 0 && (
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Sem histórico disponível.</p>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
