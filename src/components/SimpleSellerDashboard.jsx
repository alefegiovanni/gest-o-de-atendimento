import React, { useState, useEffect } from 'react';
import { Save, CheckCircle, Clock, Calendar, ArrowRight, MessageSquare, PhoneCall, Trash2, AlertCircle, ChevronDown, ChevronUp, Plus, UserCheck } from 'lucide-react';

export default function SimpleSellerDashboard({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];
  const [contatos, setContatos] = useState('');
  const [atendimentos, setAtendimentos] = useState('');
  const [vendas, setVendas] = useState('');
  const [observacao, setObservacao] = useState('');
  const [showAllHistory, setShowAllHistory] = useState(false);

  // Observações individuais de clientes
  const [clientNotes, setClientNotes] = useState([]);
  const [newClientName, setNewClientName] = useState('');
  const [newClientStatus, setNewClientStatus] = useState('fechou'); // 'fechou', 'atendeu', 'nao_atendeu'
  const [newClientObs, setNewClientObs] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [showAddNoteForm, setShowAddNoteForm] = useState(false);

  const fetchClientNotes = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/client-notes?data=${todayStr}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setClientNotes(json.notes || []);
      }
    } catch (err) {
      console.error('Erro ao buscar notas de clientes:', err);
    }
  };

  const handleAddClientNote = async (e) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    setSavingNote(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/client-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          data: todayStr,
          nome_cliente: newClientName.trim(),
          status: newClientStatus,
          observacao: newClientObs.trim()
        })
      });

      if (res.ok) {
        setNewClientName('');
        setNewClientObs('');
        setShowAddNoteForm(false);
        await fetchClientNotes();
      } else {
        const json = await res.json();
        alert(json.error || 'Erro ao adicionar cliente');
      }
    } catch (err) {
      alert(err.message || 'Erro ao salvar');
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteClientNote = async (noteId) => {
    if (!window.confirm('Deseja excluir esta observação de cliente?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/client-notes/${noteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setClientNotes(prev => prev.filter(n => n.id !== noteId));
      }
    } catch (err) {
      alert('Erro ao excluir observação');
    }
  };

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
          setVendas(json.registro_hoje.vendas || '');
          setObservacao(json.registro_hoje.observacao || '');
        } else {
          setContatos('');
          setAtendimentos('');
          setVendas('');
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
    fetchClientNotes();
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
          vendas: Number(vendas) || 0,
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '14px', marginBottom: '18px' }}>
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
                Ligações ou mensagens
              </small>
            </div>

            {/* Campo Atendimentos */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                2. Atendimentos
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
                Responderam/conversaram
              </small>
            </div>

            {/* Campo NF (Negócios Fechados) */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0f2d59', marginBottom: '6px' }}>
                3. NF (Fechados)
              </label>
              <input
                type="number"
                min="0"
                placeholder="Ex: 2"
                value={vendas}
                onChange={(e) => setVendas(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '2px solid #bbf7d0',
                  backgroundColor: '#f0fdf4',
                  fontSize: '18px',
                  fontWeight: '800',
                  color: '#15803d',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#16a34a'}
                onBlur={(e) => e.target.style.borderColor = '#bbf7d0'}
              />
              <small style={{ color: '#15803d', fontSize: '11px', marginTop: '4px', display: 'block', fontWeight: '600' }}>
                Negócios fechados
              </small>
            </div>
          </div>

          {/* Observação comum ou Detalhamento obrigatório de NF */}
          <div style={{
            marginBottom: '22px',
            padding: Number(vendas) > 0 ? '16px' : '0',
            backgroundColor: Number(vendas) > 0 ? '#fffbeb' : 'transparent',
            borderRadius: Number(vendas) > 0 ? '12px' : '0',
            border: Number(vendas) > 0 ? '1.5px solid #fde68a' : 'none',
            transition: 'all 0.2s ease'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '13px',
              fontWeight: '700',
              color: Number(vendas) > 0 ? '#b45309' : '#334155',
              marginBottom: '6px'
            }}>
              <span>
                {Number(vendas) > 0 
                  ? '⭐ Detalhes dos Negócios Fechados (Obrigatório informar)' 
                  : 'Observação rápida (opcional)'}
              </span>
              {Number(vendas) > 0 && (
                <span style={{ fontSize: '11px', backgroundColor: '#fef3c7', padding: '2px 8px', borderRadius: '6px' }}>
                  NF Fechado!
                </span>
              )}
            </label>
            <textarea
              rows={Number(vendas) > 0 ? 3 : 2}
              required={Number(vendas) > 0}
              placeholder={Number(vendas) > 0 
                ? "Informe os detalhes da venda (Ex: Cliente João Silva, cota de R$ 150.000 consórcio imobiliário, entrada paga)." 
                : "Ex: 3 clientes pediram proposta para amanhã..."}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: Number(vendas) > 0 ? '1.5px solid #f59e0b' : '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '14px',
                color: '#0f2d59',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
              onFocus={(e) => e.target.style.borderColor = Number(vendas) > 0 ? '#d97706' : '#0070f3'}
              onBlur={(e) => e.target.style.borderColor = Number(vendas) > 0 ? '#f59e0b' : '#cbd5e1'}
            />
            {Number(vendas) > 0 && (
              <small style={{ color: '#b45309', fontSize: '11px', marginTop: '4px', display: 'block', fontWeight: '600' }}>
                Descreva acima o nome do cliente ou detalhes do negócio fechado para visualização da gerência.
              </small>
            )}
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

      {/* BLOCO: OBSERVAÇÕES INDIVIDUAIS DE CLIENTES (OPÇÃO 3) */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        border: '1.5px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f2d59', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>👥 Observações Individuais de Clientes</span>
              <span style={{ fontSize: '11px', backgroundColor: '#e2e8f0', color: '#475569', padding: '2px 8px', borderRadius: '12px' }}>
                {clientNotes.length}
              </span>
            </h3>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>
              Anote o que aconteceu com cada cliente específico (especialmente negócios fechados).
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddNoteForm(!showAddNoteForm)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: showAddNoteForm ? '#f1f5f9' : '#0f2d59',
              color: showAddNoteForm ? '#334155' : '#ffffff',
              borderRadius: '8px',
              border: 'none',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            <Plus size={16} />
            <span>{showAddNoteForm ? 'Fechar Formulário' : '+ Adicionar Cliente'}</span>
          </button>
        </div>

        {/* Formulário de Adicionar Observação de Cliente */}
        {showAddNoteForm && (
          <form onSubmit={handleAddClientNote} style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px'
          }}>
            <h4 style={{ fontSize: '13px', fontWeight: '800', color: '#0f2d59', margin: '0 0 12px 0' }}>
              Nova Observação de Cliente
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  Nome do Cliente
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Eduardo"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  Status
                </label>
                <select
                  value={newClientStatus}
                  onChange={(e) => setNewClientStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    backgroundColor: '#ffffff',
                    fontWeight: '700',
                    color: newClientStatus === 'fechou' ? '#b45309' : '#059669',
                    outline: 'none'
                  }}
                >
                  <option value="fechou">⭐ NF (Fechou)</option>
                  <option value="atendeu">Atendeu / Em conversa</option>
                  <option value="nao_atendeu">Não Atendeu</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                Observação / Detalhes (Cota, valor, entrada, o que conversou)
              </label>
              <textarea
                rows={2}
                placeholder="Ex: Fechou cota imobiliária de 200k, entrada no PIX paga hoje."
                value={newClientObs}
                onChange={(e) => setNewClientObs(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={savingNote}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#059669',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: '700',
                cursor: savingNote ? 'not-allowed' : 'pointer'
              }}
            >
              {savingNote ? 'Salvando...' : 'Salvar Observação'}
            </button>
          </form>
        )}

        {/* Lista de Clientes com Observações Registradas Hoje */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {clientNotes.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, fontStyle: 'italic' }}>
              Nenhuma observação de cliente adicionada hoje. Clique em "+ Adicionar Cliente" acima.
            </p>
          ) : (
            clientNotes.map(n => (
              <div
                key={n.id}
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  backgroundColor: n.status === 'fechou' ? '#fffbeb' : '#f8fafc',
                  border: n.status === 'fechou' ? '1px solid #fde68a' : '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '14px', color: '#0f2d59' }}>{n.nome_cliente}</strong>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '800',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      backgroundColor: n.status === 'fechou' ? '#fef3c7' : '#ecfdf5',
                      color: n.status === 'fechou' ? '#b45309' : '#059669',
                      border: `1px solid ${n.status === 'fechou' ? '#fde68a' : '#a7f3d0'}`
                    }}>
                      {n.status === 'fechou' ? '⭐ NF (Fechou)' : n.status === 'atendeu' ? 'Atendeu' : 'Não Atendeu'}
                    </span>
                  </div>
                  {n.observacao && (
                    <p style={{ margin: 0, fontSize: '13px', color: n.status === 'fechou' ? '#92400e' : '#475569' }}>
                      {n.observacao}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteClientNote(n.id)}
                  title="Excluir esta observação"
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
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
            <React.Fragment key={h.id}>
              <div
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
                  <span style={{ color: '#64748b' }}>
                    NF: <strong style={{ color: '#15803d' }}>{h.vendas || 0}</strong>
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
              {h.observacao && (
                <div style={{
                  marginTop: '4px',
                  marginBottom: '4px',
                  padding: '6px 12px',
                  backgroundColor: h.vendas > 0 ? '#fffbeb' : '#f1f5f9',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: h.vendas > 0 ? '#92400e' : '#475569',
                  borderLeft: h.vendas > 0 ? '3px solid #f59e0b' : '3px solid #94a3b8'
                }}>
                  <strong>{h.vendas > 0 ? 'Obs Venda / NF:' : 'Obs:'}</strong> {h.observacao}
                </div>
              )}
            </React.Fragment>
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
