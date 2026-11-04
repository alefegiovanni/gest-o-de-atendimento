import React, { useState, useEffect } from 'react';
import { Search, Filter, Edit2, Trash2, Eye, Calendar, User, FileText, CheckCircle, X, ShieldAlert } from 'lucide-react';
import { formatCurrency, formatNumber, formatDateBR, calculateRates } from '../utils/formatters';

export default function RecordsManagement() {
  const [records, setRecords] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('registros'); // 'registros' | 'auditoria'

  // Filtros
  const [vendedorId, setVendedorId] = useState('todos');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  // Modal Edição
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      let url = `/api/manager/records?vendedor_id=${vendedorId}`;
      if (dataInicio) url += `&data_inicio=${dataInicio}`;
      if (dataFim) url += `&data_fim=${dataFim}`;

      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const sRes = await fetch('/api/manager/sellers', { headers: { Authorization: `Bearer ${token}` } });
      const aRes = await fetch('/api/manager/audit-logs', { headers: { Authorization: `Bearer ${token}` } });

      if (res.ok) {
        const json = await res.json();
        setRecords(json.records);
      }
      if (sRes.ok) {
        const sJson = await sRes.json();
        setSellers(sJson.sellers);
      }
      if (aRes.ok) {
        const aJson = await aRes.json();
        setAuditLogs(aJson.logs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [vendedorId, dataInicio, dataFim]);

  const handleDelete = async (record) => {
    if (!window.confirm(`Tem certeza que deseja excluir o lançamento de ${record.nome_completo} do dia ${formatDateBR(record.data)}? Esta ação será registrada na auditoria.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/manager/records/${record.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchRecords();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenEdit = (rec) => {
    setEditingRecord({ ...rec });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          user_id: editingRecord.user_id,
          data: editingRecord.data,
          contatos: editingRecord.contatos,
          respostas: editingRecord.respostas,
          atendimentos: editingRecord.atendimentos,
          propostas: editingRecord.propostas,
          vendas: editingRecord.vendas,
          valor_vendido: editingRecord.valor_vendido,
          observacao: editingRecord.observacao
        })
      });

      if (res.ok) {
        setEditModalOpen(false);
        fetchRecords();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
      
      {/* Header com Tabs */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f2d59', margin: 0 }}>
            Central de Lançamentos & Auditoria
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
            Consulte o histórico detalhado de registros de cada vendedor e a trilha de auditoria.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', backgroundColor: '#e2e8f0', padding: '4px', borderRadius: '10px' }}>
          <button
            onClick={() => setTab('registros')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              backgroundColor: tab === 'registros' ? '#0f2d59' : 'transparent',
              color: tab === 'registros' ? '#ffffff' : '#475569'
            }}
          >
            Lançamentos Diários
          </button>
          <button
            onClick={() => setTab('auditoria')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              backgroundColor: tab === 'auditoria' ? '#0f2d59' : 'transparent',
              color: tab === 'auditoria' ? '#ffffff' : '#475569'
            }}
          >
            Histórico de Auditoria
          </button>
        </div>
      </div>

      {tab === 'registros' ? (
        <>
          {/* Filtros */}
          <div style={{
            backgroundColor: '#ffffff',
            padding: '16px 20px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            marginBottom: '20px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={16} color="#64748b" />
              <select
                value={vendedorId}
                onChange={(e) => setVendedorId(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              >
                <option value="todos">Todos os Vendedores</option>
                {sellers.map(s => (
                  <option key={s.id} value={s.id}>{s.nome_completo}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={16} color="#64748b" />
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
              <span style={{ fontSize: '12px', color: '#64748b' }}>até</span>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>
          </div>

          {/* Tabela de Lançamentos */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '12px 14px', color: '#475569', fontWeight: '700' }}>Data</th>
                    <th style={{ padding: '12px 14px', color: '#475569', fontWeight: '700' }}>Vendedor</th>
                    <th style={{ padding: '12px 14px', color: '#475569', fontWeight: '700' }}>Contatos</th>
                    <th style={{ padding: '12px 14px', color: '#475569', fontWeight: '700' }}>Resp.</th>
                    <th style={{ padding: '12px 14px', color: '#475569', fontWeight: '700' }}>Atend.</th>
                    <th style={{ padding: '12px 14px', color: '#475569', fontWeight: '700' }}>Prop.</th>
                    <th style={{ padding: '12px 14px', color: '#475569', fontWeight: '700' }}>Vendas</th>
                    <th style={{ padding: '12px 14px', color: '#475569', fontWeight: '700' }}>Valor (R$)</th>
                    <th style={{ padding: '12px 14px', color: '#475569', fontWeight: '700' }}>Observação</th>
                    <th style={{ padding: '12px 14px', color: '#475569', fontWeight: '700', textAlign: 'center' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', fontWeight: '600', color: '#0f2d59' }}>
                        {formatDateBR(r.data)}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: '600' }}>
                        {r.nome_completo}
                      </td>
                      <td style={{ padding: '12px 14px' }}>{r.contatos}</td>
                      <td style={{ padding: '12px 14px' }}>{r.respostas}</td>
                      <td style={{ padding: '12px 14px' }}>{r.atendimentos}</td>
                      <td style={{ padding: '12px 14px' }}>{r.propostas}</td>
                      <td style={{ padding: '12px 14px', color: '#10b981', fontWeight: '700' }}>{r.vendas}</td>
                      <td style={{ padding: '12px 14px', color: '#047857', fontWeight: '800' }}>
                        {formatCurrency(r.valor_vendido)}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#64748b', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.observacao || '—'}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                          <button
                            onClick={() => handleOpenEdit(r)}
                            title="Editar lançamento"
                            style={{ padding: '5px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#0f2d59', cursor: 'pointer' }}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(r)}
                            title="Excluir lançamento"
                            style={{ padding: '5px', borderRadius: '6px', border: '1px solid #fecaca', backgroundColor: '#fff5f5', color: '#dc2626', cursor: 'pointer' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Trilha de Auditoria */
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={18} color="#0f2d59" />
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f2d59' }}>
              Trilha de Auditoria (Últimas 100 alterações do sistema)
            </h4>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 14px', color: '#475569', fontWeight: '700' }}>Data / Hora</th>
                  <th style={{ padding: '12px 14px', color: '#475569', fontWeight: '700' }}>Responsável</th>
                  <th style={{ padding: '12px 14px', color: '#475569', fontWeight: '700' }}>Ação</th>
                  <th style={{ padding: '12px 14px', color: '#475569', fontWeight: '700' }}>Entidade</th>
                  <th style={{ padding: '12px 14px', color: '#475569', fontWeight: '700' }}>Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {log.data_hora}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: '700', color: '#0f2d59' }}>
                      {log.autor_nome}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '700',
                        backgroundColor: log.tipo_de_acao.includes('EXCLUSAO') ? '#fee2e2' : log.tipo_de_acao.includes('CRIACAO') ? '#ecfdf5' : '#eff6ff',
                        color: log.tipo_de_acao.includes('EXCLUSAO') ? '#b91c1c' : log.tipo_de_acao.includes('CRIACAO') ? '#047857' : '#1d4ed8'
                      }}>
                        {log.tipo_de_acao}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#475569' }}>
                      {log.entidade} #{log.entidade_id}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#334155', maxWidth: '400px' }}>
                      <code style={{ fontSize: '11px', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', wordBreak: 'break-all' }}>
                        {log.detalhes}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Editar Lançamento */}
      {editModalOpen && editingRecord && (
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
            borderRadius: '16px',
            width: '100%',
            maxWidth: '480px',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f2d59', margin: 0 }}>
                  Editar Lançamento
                </h3>
                <span style={{ fontSize: '13px', color: '#64748b' }}>
                  {editingRecord.nome_completo} • {formatDateBR(editingRecord.data)}
                </span>
              </div>
              <button onClick={() => setEditModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Contatos</label>
                  <input
                    type="number"
                    min="0"
                    value={editingRecord.contatos}
                    onChange={(e) => setEditingRecord(prev => ({ ...prev, contatos: parseInt(e.target.value) || 0 }))}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Respostas</label>
                  <input
                    type="number"
                    min="0"
                    value={editingRecord.respostas}
                    onChange={(e) => setEditingRecord(prev => ({ ...prev, respostas: parseInt(e.target.value) || 0 }))}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Atendimentos</label>
                  <input
                    type="number"
                    min="0"
                    value={editingRecord.atendimentos}
                    onChange={(e) => setEditingRecord(prev => ({ ...prev, atendimentos: parseInt(e.target.value) || 0 }))}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Propostas</label>
                  <input
                    type="number"
                    min="0"
                    value={editingRecord.propostas}
                    onChange={(e) => setEditingRecord(prev => ({ ...prev, propostas: parseInt(e.target.value) || 0 }))}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#10b981', display: 'block', marginBottom: '4px' }}>Vendas</label>
                  <input
                    type="number"
                    min="0"
                    value={editingRecord.vendas}
                    onChange={(e) => setEditingRecord(prev => ({ ...prev, vendas: parseInt(e.target.value) || 0 }))}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1.5px solid #10b981' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#10b981', display: 'block', marginBottom: '4px' }}>Valor (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={editingRecord.valor_vendido}
                    onChange={(e) => setEditingRecord(prev => ({ ...prev, valor_vendido: parseFloat(e.target.value) || 0 }))}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1.5px solid #10b981', fontWeight: '700' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Observação</label>
                <input
                  type="text"
                  value={editingRecord.observacao || ''}
                  onChange={(e) => setEditingRecord(prev => ({ ...prev, observacao: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', backgroundColor: '#0f2d59', color: '#fff', fontWeight: '700', cursor: 'pointer' }}
                >
                  Gravar Alteração
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

