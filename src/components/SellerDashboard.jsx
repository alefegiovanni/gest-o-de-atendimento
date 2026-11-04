import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, AlertCircle, TrendingUp, Calendar, 
  Send, PhoneCall, MessageSquare, FileText, Award, DollarSign,
  Save, Clock, Info
} from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { formatCurrency, formatNumber, formatPercent, formatDateBR, calculateRates } from '../utils/formatters';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function SellerDashboard({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Formulário do registro
  const todayStr = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    data: todayStr,
    contatos: 0,
    respostas: 0,
    atendimentos: 0,
    propostas: 0,
    vendas: 0,
    valor_vendido: 0,
    observacao: ''
  });

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/seller/my-dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        // Se já houver registro hoje, pré-carrega
        if (json.registro_hoje) {
          setFormData({
            data: json.registro_hoje.data,
            contatos: json.registro_hoje.contatos,
            respostas: json.registro_hoje.respostas,
            atendimentos: json.registro_hoje.atendimentos,
            propostas: json.registro_hoje.propostas,
            vendas: json.registro_hoje.vendas,
            valor_vendido: json.registro_hoje.valor_vendido,
            observacao: json.registro_hoje.observacao || ''
          });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback({ type: '', message: '' });

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Erro ao salvar registro');

      setFeedback({ type: 'success', message: resData.message || 'Lançamento salvo com sucesso!' });
      await fetchData(); // Atualiza dados
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
        <p>Carregando seus resultados...</p>
      </div>
    );
  }

  const totals = data?.totais_mes || {};
  const metas = data?.metas || {};
  const isFilledToday = data?.hoje_preenchido;

  // Calculos de taxas do mês
  const rates = calculateRates({
    contatos: totals.total_contatos,
    respostas: totals.total_respostas,
    atendimentos: totals.total_atendimentos,
    propostas: totals.total_propostas,
    vendas: totals.total_vendas,
    valor_vendido: totals.total_valor_vendido
  });

  // Progresso das metas
  const pctContatos = metas.meta_contatos > 0 ? (totals.total_contatos / metas.meta_contatos) * 100 : 0;
  const pctAtendimentos = metas.meta_atendimentos > 0 ? (totals.total_atendimentos / metas.meta_atendimentos) * 100 : 0;
  const pctPropostas = metas.meta_propostas > 0 ? (totals.total_propostas / metas.meta_propostas) * 100 : 0;
  const pctVendas = metas.meta_vendas > 0 ? (totals.total_vendas / metas.meta_vendas) * 100 : 0;
  const pctValor = metas.meta_valor_vendido > 0 ? (totals.total_valor_vendido / metas.meta_valor_vendido) * 100 : 0;

  // Configuração do gráfico de evolução diária
  const history = data?.historico_diario || [];
  const chartLabels = history.map(h => formatDateBR(h.data).slice(0, 5)); // DD/MM
  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Contatos',
        data: history.map(h => h.contatos),
        borderColor: '#0f2d59',
        backgroundColor: 'rgba(15, 45, 89, 0.05)',
        tension: 0.3,
        borderWidth: 2
      },
      {
        label: 'Atendimentos',
        data: history.map(h => h.atendimentos),
        borderColor: '#0284c7',
        backgroundColor: 'rgba(2, 132, 199, 0.05)',
        tension: 0.3,
        borderWidth: 2
      },
      {
        label: 'Propostas',
        data: history.map(h => h.propostas),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.05)',
        tension: 0.3,
        borderWidth: 2
      },
      {
        label: 'Vendas',
        data: history.map(h => h.vendas),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.3,
        borderWidth: 2.5
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      tooltip: {
        callbacks: {
          label: (context) => ` ${context.dataset.label}: ${context.raw}`
        }
      }
    },
    scales: {
      y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
      x: { grid: { display: false } }
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
      
      {/* 1. Header com saudação e status do dia */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        marginBottom: '24px',
        backgroundColor: '#ffffff',
        padding: '20px 24px',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f2d59', margin: 0 }}>
            Olá, {user.primeiro_nome} 👋
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
            <Calendar size={16} />
            <span>Hoje é <strong>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong></span>
          </div>
        </div>

        {/* Badge de status do dia */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          borderRadius: '30px',
          backgroundColor: isFilledToday ? '#ecfdf5' : '#fffbeb',
          color: isFilledToday ? '#059669' : '#b45309',
          border: `1px solid ${isFilledToday ? '#a7f3d0' : '#fde68a'}`,
          fontWeight: '700',
          fontSize: '13px'
        }}>
          {isFilledToday ? (
            <>
              <CheckCircle size={18} />
              <span>Registro de hoje preenchido!</span>
            </>
          ) : (
            <>
              <Clock size={18} />
              <span>Atenção: Registro de hoje pendente</span>
            </>
          )}
        </div>
      </div>

      {/* 2. Formulário de Registro Diário */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '24px',
        marginBottom: '28px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f2d59', margin: 0 }}>
              {isFilledToday ? 'Editar Lançamento Diário' : 'Novo Lançamento Diário'}
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
              Preencha com exatidão os números do seu dia de atendimento a consórcios.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Data do Registro:</span>
            <input
              type="date"
              value={formData.data}
              onChange={(e) => handleInputChange('data', e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                fontWeight: '600',
                color: '#0f2d59'
              }}
            />
          </div>
        </div>

        {feedback.message && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            borderRadius: '10px',
            marginBottom: '20px',
            backgroundColor: feedback.type === 'success' ? '#ecfdf5' : '#fef2f2',
            color: feedback.type === 'success' ? '#047857' : '#b91c1c',
            border: `1px solid ${feedback.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            fontSize: '14px'
          }}>
            {feedback.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span>{feedback.message}</span>
          </div>
        )}

        <form onSubmit={handleSave}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '16px',
            marginBottom: '20px'
          }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                1. Contatos Feitos
              </label>
              <input
                type="number"
                min="0"
                value={formData.contatos}
                onChange={(e) => handleInputChange('contatos', Math.max(0, parseInt(e.target.value) || 0))}
                required
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '15px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                2. Responderam
              </label>
              <input
                type="number"
                min="0"
                value={formData.respostas}
                onChange={(e) => handleInputChange('respostas', Math.max(0, parseInt(e.target.value) || 0))}
                required
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '15px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                3. Atendidos
              </label>
              <input
                type="number"
                min="0"
                value={formData.atendimentos}
                onChange={(e) => handleInputChange('atendimentos', Math.max(0, parseInt(e.target.value) || 0))}
                required
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '15px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                4. Propostas / Simulações
              </label>
              <input
                type="number"
                min="0"
                value={formData.propostas}
                onChange={(e) => handleInputChange('propostas', Math.max(0, parseInt(e.target.value) || 0))}
                required
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '15px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#10b981', marginBottom: '6px' }}>
                5. Vendas Fechadas
              </label>
              <input
                type="number"
                min="0"
                value={formData.vendas}
                onChange={(e) => handleInputChange('vendas', Math.max(0, parseInt(e.target.value) || 0))}
                required
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #10b981', fontSize: '15px', backgroundColor: '#f0fdf4' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#10b981', marginBottom: '6px' }}>
                6. Total Vendido (R$)
              </label>
              <input
                type="number"
                min="0"
                step="500"
                value={formData.valor_vendido}
                onChange={(e) => handleInputChange('valor_vendido', Math.max(0, parseFloat(e.target.value) || 0))}
                required
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #10b981', fontSize: '15px', backgroundColor: '#f0fdf4', fontWeight: '700' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
              Observações do Dia (Opcional)
            </label>
            <input
              type="text"
              value={formData.observacao}
              onChange={(e) => handleInputChange('observacao', e.target.value)}
              placeholder="Ex: Cliente fechou cota de R$ 120k automóvel; simulação em andamento para médico."
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                backgroundColor: '#0f2d59',
                color: '#ffffff',
                padding: '12px 28px',
                borderRadius: '10px',
                border: 'none',
                fontWeight: '700',
                fontSize: '15px',
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 10px rgba(15, 45, 89, 0.2)'
              }}
            >
              <Save size={18} />
              <span>{saving ? 'Gravando...' : 'Salvar Resultados'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 3. Cards de Resumo do Mês */}
      <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f2d59', marginBottom: '16px' }}>
        Seu Desempenho no Mês Atual
      </h3>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
        marginBottom: '28px'
      }}>
        {/* Card Contatos */}
        <div style={{ backgroundColor: '#ffffff', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Contatos</span>
          <p style={{ fontSize: '24px', fontWeight: '800', color: '#0f2d59', margin: '8px 0 0 0' }}>
            {formatNumber(totals.total_contatos)}
          </p>
        </div>

        {/* Card Respostas */}
        <div style={{ backgroundColor: '#ffffff', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Respostas</span>
          <p style={{ fontSize: '24px', fontWeight: '800', color: '#0284c7', margin: '8px 0 0 0' }}>
            {formatNumber(totals.total_respostas)}
          </p>
          <small style={{ fontSize: '11px', color: '#64748b' }}>Taxa Resp: {rates.taxaResposta}</small>
        </div>

        {/* Card Atendimentos */}
        <div style={{ backgroundColor: '#ffffff', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Atendimentos</span>
          <p style={{ fontSize: '24px', fontWeight: '800', color: '#0f2d59', margin: '8px 0 0 0' }}>
            {formatNumber(totals.total_atendimentos)}
          </p>
          <small style={{ fontSize: '11px', color: '#64748b' }}>Taxa Atend: {rates.taxaAtendimento}</small>
        </div>

        {/* Card Propostas */}
        <div style={{ backgroundColor: '#ffffff', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Propostas</span>
          <p style={{ fontSize: '24px', fontWeight: '800', color: '#f59e0b', margin: '8px 0 0 0' }}>
            {formatNumber(totals.total_propostas)}
          </p>
          <small style={{ fontSize: '11px', color: '#64748b' }}>Taxa Prop: {rates.taxaProposta}</small>
        </div>

        {/* Card Vendas */}
        <div style={{ backgroundColor: '#ffffff', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#10b981', textTransform: 'uppercase' }}>Vendas Fechadas</span>
          <p style={{ fontSize: '24px', fontWeight: '800', color: '#10b981', margin: '8px 0 0 0' }}>
            {formatNumber(totals.total_vendas)}
          </p>
          <small style={{ fontSize: '11px', color: '#047857', fontWeight: '600' }}>Fechamento: {rates.taxaFechamento}</small>
        </div>

        {/* Card Valor Vendido */}
        <div style={{ backgroundColor: '#ffffff', padding: '18px', borderRadius: '12px', border: '1.5px solid #10b981', boxShadow: '0 2px 4px rgba(16,185,129,0.1)' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#059669', textTransform: 'uppercase' }}>Valor Total Vendido</span>
          <p style={{ fontSize: '22px', fontWeight: '800', color: '#059669', margin: '8px 0 0 0' }}>
            {formatCurrency(totals.total_valor_vendido)}
          </p>
          <small style={{ fontSize: '11px', color: '#64748b' }}>Ticket Médio: {rates.ticketMedio}</small>
        </div>
      </div>

      {/* 4. Metas Individuais (Barras de Progresso) */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '24px',
        marginBottom: '28px'
      }}>
        <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#0f2d59', marginBottom: '18px' }}>
          Atingimento das Suas Metas Mensais
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {/* Meta Vendas */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
              <span style={{ fontWeight: '600', color: '#334155' }}>Cotas Vendidas</span>
              <span style={{ fontWeight: '700', color: pctVendas >= 100 ? '#10b981' : '#0f2d59' }}>
                {totals.total_vendas} / {metas.meta_vendas || '—'} ({formatPercent(pctVendas)})
              </span>
            </div>
            <div style={{ height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, pctVendas)}%`,
                backgroundColor: pctVendas >= 100 ? '#10b981' : '#0070f3',
                borderRadius: '4px'
              }} />
            </div>
          </div>

          {/* Meta Valor Vendido */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
              <span style={{ fontWeight: '600', color: '#334155' }}>Volume de Vendas (R$)</span>
              <span style={{ fontWeight: '700', color: pctValor >= 100 ? '#10b981' : '#0f2d59' }}>
                {formatCurrency(totals.total_valor_vendido)} / {formatCurrency(metas.meta_valor_vendido)} ({formatPercent(pctValor)})
              </span>
            </div>
            <div style={{ height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, pctValor)}%`,
                backgroundColor: pctValor >= 100 ? '#10b981' : '#10b981',
                borderRadius: '4px'
              }} />
            </div>
          </div>

          {/* Meta Propostas */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
              <span style={{ fontWeight: '600', color: '#334155' }}>Propostas Feitas</span>
              <span style={{ fontWeight: '700', color: pctPropostas >= 100 ? '#10b981' : '#0f2d59' }}>
                {totals.total_propostas} / {metas.meta_propostas || '—'} ({formatPercent(pctPropostas)})
              </span>
            </div>
            <div style={{ height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, pctPropostas)}%`,
                backgroundColor: '#f59e0b',
                borderRadius: '4px'
              }} />
            </div>
          </div>

          {/* Meta Atendimentos */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
              <span style={{ fontWeight: '600', color: '#334155' }}>Atendimentos Concluídos</span>
              <span style={{ fontWeight: '700', color: pctAtendimentos >= 100 ? '#10b981' : '#0f2d59' }}>
                {totals.total_atendimentos} / {metas.meta_atendimentos || '—'} ({formatPercent(pctAtendimentos)})
              </span>
            </div>
            <div style={{ height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, pctAtendimentos)}%`,
                backgroundColor: '#0284c7',
                borderRadius: '4px'
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* 5. Gráfico de Evolução Diária */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '24px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
      }}>
        <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#0f2d59', marginBottom: '8px' }}>
          Evolução Diária de Atividades e Vendas
        </h3>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
          Acompanhamento visual dos últimos 30 dias de trabalho.
        </p>

        <div style={{ height: '320px', width: '100%' }}>
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

    </div>
  );
}

