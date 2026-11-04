import React, { useState, useEffect } from 'react';
import { Save, CheckCircle, Clock, Calendar, ArrowRight, MessageSquare, PhoneCall, Trash2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

export default function SimpleSellerDashboard({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];
  const [contatos, setContatos] = useState('');
  const [atendimentos, setAtendimentos] = useState('');
  const [observacao, setObservacao] = useState('');
  const [showAllHistory, setShowAllHistory] = useState(false);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/seller/my-dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (json.registro_hoje) {
          setContatos(json.registro_hoje.contatos);
          setAtendimentos(json.registro_hoje.atendimentos);
          setObservacao(json.registro_hoje.observacao || '');
        } else {
          setContatos('');
          setAtendimentos('');
          setObservacao('');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          data: todayStr,
          contatos: Number(contatos) || 0,
          atendimentos: Number(atendimentos) || 0,
          respostas: Number(atendimentos) || 0,
          propostas: 0,
          vendas: 0,
          valor_vendido: 0,
          observacao
        })
      });

      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || 'Erro ao salvar');

      setFeedback('Lançamento salvo com sucesso!');
      await fetchData();
    } catch (err) {
      setFeedback('Erro: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecord = async (recordId, dateStr) => {
    const formattedDate = dateStr.split('-').reverse().join('/');
    if (!window.confirm(`Tem certeza que deseja excluir o seu lançamento do dia ${formattedDate}?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/records/${recordId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || 'Erro ao excluir');

      setFeedback('Lançamento excluído com sucesso!');
      await fetchData();
    } catch (err) {
      setFeedback('Erro ao excluir: ' + err.message);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Carregando...</div>;
  }

  const isFilled = data?.hoje_preenchido;
  const todayRecord = data?.registro_hoje;
  const allHistory = [...(data?.historico_diario || [])].reverse();
  const displayedHistory = showAllHistory ? allHistory : allHistory.slice(0, 3);

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '24px 16px' }}>
      
      {/* Card Boas-vindas */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f2d59', margin: 0 }}>
              Olá, {user.primeiro_nome}! 👋
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
              Hoje é <strong>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</strong>
            </p>
          </div>

          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '700',
            backgroundColor: isFilled ? '#ecfdf5' : '#fffbeb',
            color: isFilled ? '#059669' : '#b45309',
            border: `1px solid ${isFilled ? '#a7f3d0' : '#fde68a'}`
          }}>
            {isFilled ? <CheckCircle size={15} /> : <Clock size={15} />}
            {isFilled ? 'Lançado hoje' : 'Pendente hoje'}
          </span>
        </div>
      </div>

      {/* Formulário Simples */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 12px rgba(15, 45, 89, 0.05)',
        marginBottom: '24px'
      }}>
        <div style={{ marginBottom: '18px' }}>
          <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f2d59', margin: 0 }}>
            {isFilled ? 'Editar meus números de hoje' : 'Lançar atendimentos de hoje'}
          </h3>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
            Informe quantos contatos e atendimentos você realizou hoje.
          </p>
        </div>

        {feedback && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '10px',
            marginBottom: '18px',
            backgroundColor: feedback.includes('Erro') ? '#fef2f2' : '#ecfdf5',
            color: feedback.includes('Erro') ? '#dc2626' : '#059669',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            {feedback}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
            {/* Campo Contatos */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                1. Contatos Feitos
              </label>
              <input
                type="number"
                min="0"
                required
                placeholder="Ex: 25"
                value={contatos}
                onChange={(e) => setContatos(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '2px solid #cbd5e1',
                  fontSize: '18px',
                  fontWeight: '700',
                  color: '#0f2d59',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#0070f3'}
                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
              />
              <small style={{ color: '#64748b', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                Ligações, mensagens ou tentativas
              </small>
            </div>

            {/* Campo Atendimentos */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                2. Atendimentos Concluídos
              </label>
              <input
                type="number"
                min="0"
                required
                placeholder="Ex: 12"
                value={atendimentos}
                onChange={(e) => setAtendimentos(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '2px solid #cbd5e1',
                  fontSize: '18px',
                  fontWeight: '700',
                  color: '#0f2d59',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#0070f3'}
                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
              />
              <small style={{ color: '#64748b', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                Clientes que responderam e conversaram
              </small>
            </div>
          </div>

          <div style={{ marginBottom: '22px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              Observação rápida (opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: 3 clientes pediram proposta para amanhã"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: '#0f2d59',
              color: '#ffffff',
              fontSize: '16px',
              fontWeight: '700',
              cursor: saving ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 10px rgba(15, 45, 89, 0.2)'
            }}
          >
            <Save size={18} />
            <span>{saving ? 'Gravando...' : (isFilled ? 'Atualizar Registro' : 'Salvar Registro de Hoje')}</span>
          </button>
        </form>
      </div>

      {/* Histórico Recente com Opção de Exclusão */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '20px',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f2d59', margin: 0 }}>
            Seus lançamentos recentes
          </h4>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
            {allHistory.length} registro(s)
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {allHistory.length === 0 && (
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>Nenhum lançamento anterior.</p>
          )}

          {displayedHistory.map(h => (
            <div
              key={h.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 14px',
                borderRadius: '10px',
                backgroundColor: '#f8fafc',
                fontSize: '13px',
                border: '1px solid #f1f5f9'
              }}
            >
              <span style={{ fontWeight: '700', color: '#334155' }}>
                {h.data.split('-').reverse().join('/')}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ color: '#64748b' }}>
                  Contatos: <strong style={{ color: '#0f2d59' }}>{h.contatos}</strong>
                </span>
                <span style={{ color: '#64748b' }}>
                  Atendimentos: <strong style={{ color: '#059669' }}>{h.atendimentos}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteRecord(h.id, h.data)}
                  title="Excluir este lançamento"
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
        </div>

        {/* Botão Seta para Expandir / Recolher Histórico */}
        {allHistory.length > 3 && (
          <button
            type="button"
            onClick={() => setShowAllHistory(!showAllHistory)}
            style={{
              width: '100%',
              marginTop: '12px',
              padding: '10px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              backgroundColor: '#f8fafc',
              color: '#0f2d59',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
          >
            <span>{showAllHistory ? 'Recolher lançamentos' : `Ver mais lançamentos (+${allHistory.length - 3})`}</span>
            {showAllHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
      </div>

    </div>
  );
}
