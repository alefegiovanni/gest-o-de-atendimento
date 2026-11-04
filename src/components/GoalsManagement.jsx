import React, { useState, useEffect } from 'react';
import { Target, Save, Users, User, CheckCircle, AlertCircle } from 'lucide-react';
import { formatCurrency, formatNumber } from '../utils/formatters';

export default function GoalsManagement() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [sellers, setSellers] = useState([]);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const now = new Date();
  const currentMonthDefault = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [mes, setMes] = useState(currentMonthDefault);

  // Formulário Meta de Equipe
  const [teamForm, setTeamForm] = useState({
    meta_contatos: 0,
    meta_atendimentos: 0,
    meta_propostas: 0,
    meta_vendas: 0,
    meta_valor_vendido: 0
  });

  // Metas individuais (map: userId -> objeto)
  const [individualForms, setIndividualForms] = useState({});

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/manager/goals?mes=${mes}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const sRes = await fetch('/api/manager/sellers', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok && sRes.ok) {
        const json = await res.json();
        const sJson = await sRes.json();
        setData(json);
        setSellers(sJson.sellers);

        if (json.meta_equipe) {
          setTeamForm({
            meta_contatos: json.meta_equipe.meta_contatos,
            meta_atendimentos: json.meta_equipe.meta_atendimentos,
            meta_propostas: json.meta_equipe.meta_propostas,
            meta_vendas: json.meta_equipe.meta_vendas,
            meta_valor_vendido: json.meta_equipe.meta_valor_vendido
          });
        }

        const indMap = {};
        sJson.sellers.forEach(s => {
          const found = json.metas_individuais.find(g => g.user_id === s.id);
          indMap[s.id] = found ? {
            meta_contatos: found.meta_contatos,
            meta_atendimentos: found.meta_atendimentos,
            meta_propostas: found.meta_propostas,
            meta_vendas: found.meta_vendas,
            meta_valor_vendido: found.meta_valor_vendido
          } : {
            meta_contatos: 240,
            meta_atendimentos: 150,
            meta_propostas: 75,
            meta_vendas: 10,
            meta_valor_vendido: 1000000
          };
        });
        setIndividualForms(indMap);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, [mes]);

  const handleSaveTeamGoal = async (e) => {
    e.preventDefault();
    setFeedback({ type: '', message: '' });
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/manager/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          user_id: null,
          mes_referencia: mes,
          ...teamForm
        })
      });
      if (res.ok) {
        setFeedback({ type: 'success', message: 'Meta mensal da equipe atualizada com sucesso!' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleSaveIndividualGoal = async (userId) => {
    setFeedback({ type: '', message: '' });
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/manager/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          user_id: userId,
          mes_referencia: mes,
          ...individualForms[userId]
        })
      });
      if (res.ok) {
        setFeedback({ type: 'success', message: 'Meta individual salva com sucesso!' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
      
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f2d59', margin: 0 }}>
            Planejamento de Metas Comerciais
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
            Defina os objetivos mensais de atendimento e vendas de consórcio para o time e individualmente.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f2d59' }}>Mês de Referência:</span>
          <input
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              fontWeight: '700',
              color: '#0f2d59'
            }}
          />
        </div>
      </div>

      {feedback.message && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '10px',
          marginBottom: '20px',
          backgroundColor: feedback.type === 'success' ? '#ecfdf5' : '#fef2f2',
          color: feedback.type === 'success' ? '#047857' : '#b91c1c',
          border: `1px solid ${feedback.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          fontSize: '14px'
        }}>
          {feedback.message}
        </div>
      )}

      {/* Meta da Equipe */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1.5px solid #0f2d59',
        padding: '24px',
        marginBottom: '32px',
        boxShadow: '0 4px 6px -1px rgba(15, 45, 89, 0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div style={{ backgroundColor: '#0f2d59', color: '#fff', padding: '8px', borderRadius: '8px' }}>
            <Users size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f2d59', margin: 0 }}>
              Meta Geral da Equipe ({mes})
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Objetivo total somado de todos os vendedores</span>
          </div>
        </div>

        <form onSubmit={handleSaveTeamGoal}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                Meta Contatos
              </label>
              <input
                type="number"
                min="0"
                value={teamForm.meta_contatos}
                onChange={(e) => setTeamForm(prev => ({ ...prev, meta_contatos: parseInt(e.target.value) || 0 }))}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                Meta Atendimentos
              </label>
              <input
                type="number"
                min="0"
                value={teamForm.meta_atendimentos}
                onChange={(e) => setTeamForm(prev => ({ ...prev, meta_atendimentos: parseInt(e.target.value) || 0 }))}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                Meta Propostas
              </label>
              <input
                type="number"
                min="0"
                value={teamForm.meta_propostas}
                onChange={(e) => setTeamForm(prev => ({ ...prev, meta_propostas: parseInt(e.target.value) || 0 }))}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#10b981', marginBottom: '4px' }}>
                Meta Cotas Vendidas
              </label>
              <input
                type="number"
                min="0"
                value={teamForm.meta_vendas}
                onChange={(e) => setTeamForm(prev => ({ ...prev, meta_vendas: parseInt(e.target.value) || 0 }))}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #10b981', fontSize: '14px', backgroundColor: '#f0fdf4' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#10b981', marginBottom: '4px' }}>
                Meta Total Vendido (R$)
              </label>
              <input
                type="number"
                min="0"
                step="50000"
                value={teamForm.meta_valor_vendido}
                onChange={(e) => setTeamForm(prev => ({ ...prev, meta_valor_vendido: parseFloat(e.target.value) || 0 }))}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #10b981', fontSize: '14px', backgroundColor: '#f0fdf4', fontWeight: '700' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              style={{
                backgroundColor: '#0f2d59',
                color: '#fff',
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Save size={16} />
              <span>Salvar Meta da Equipe</span>
            </button>
          </div>
        </form>
      </div>

      {/* Metas Individuais dos Vendedores */}
      <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f2d59', marginBottom: '16px' }}>
        Metas Individuais por Vendedor
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {sellers.map((seller) => {
          const form = individualForms[seller.id] || {};

          return (
            <div
              key={seller.id}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                padding: '18px 22px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <User size={18} color="#0f2d59" />
                  <span style={{ fontSize: '15px', fontWeight: '800', color: '#0f2d59' }}>{seller.nome_completo}</span>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>({seller.primeiro_nome})</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSaveIndividualGoal(seller.id)}
                  style={{
                    backgroundColor: '#f1f5f9',
                    color: '#0f2d59',
                    border: '1px solid #cbd5e1',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Save size={14} />
                  <span>Salvar Meta deste Vendedor</span>
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '4px' }}>Contatos</label>
                  <input
                    type="number"
                    min="0"
                    value={form.meta_contatos || 0}
                    onChange={(e) => setIndividualForms(prev => ({
                      ...prev,
                      [seller.id]: { ...prev[seller.id], meta_contatos: parseInt(e.target.value) || 0 }
                    }))}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '4px' }}>Atendimentos</label>
                  <input
                    type="number"
                    min="0"
                    value={form.meta_atendimentos || 0}
                    onChange={(e) => setIndividualForms(prev => ({
                      ...prev,
                      [seller.id]: { ...prev[seller.id], meta_atendimentos: parseInt(e.target.value) || 0 }
                    }))}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '4px' }}>Propostas</label>
                  <input
                    type="number"
                    min="0"
                    value={form.meta_propostas || 0}
                    onChange={(e) => setIndividualForms(prev => ({
                      ...prev,
                      [seller.id]: { ...prev[seller.id], meta_propostas: parseInt(e.target.value) || 0 }
                    }))}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: '#10b981', display: 'block', marginBottom: '4px' }}>Vendas (Cotas)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.meta_vendas || 0}
                    onChange={(e) => setIndividualForms(prev => ({
                      ...prev,
                      [seller.id]: { ...prev[seller.id], meta_vendas: parseInt(e.target.value) || 0 }
                    }))}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #10b981', fontSize: '13px', backgroundColor: '#f0fdf4', fontWeight: '700' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: '#10b981', display: 'block', marginBottom: '4px' }}>Valor Vendido (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    value={form.meta_valor_vendido || 0}
                    onChange={(e) => setIndividualForms(prev => ({
                      ...prev,
                      [seller.id]: { ...prev[seller.id], meta_valor_vendido: parseFloat(e.target.value) || 0 }
                    }))}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1.5px solid #10b981', fontSize: '13px', backgroundColor: '#f0fdf4', fontWeight: '700' }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}

