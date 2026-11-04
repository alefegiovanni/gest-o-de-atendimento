import React, { useState, useEffect } from 'react';
import { UserPlus, Edit2, Key, CheckCircle, XCircle, Search, Save, X, Eye } from 'lucide-react';
import { formatDateBR } from '../utils/formatters';

export default function TeamManagement() {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [resetCodeModal, setResetCodeModal] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Form Vendedor
  const [formData, setFormData] = useState({
    nome_completo: '',
    primeiro_nome: '',
    codigo_acesso: '',
    telefone: '',
    ativo: 1,
    meta_contatos: 240,
    meta_atendimentos: 150,
    meta_propostas: 75,
    meta_vendas: 10,
    meta_valor_vendido: 1000000
  });

  // Form Reset Código
  const [novoCodigo, setNovoCodigo] = useState('');

  const fetchSellers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/manager/sellers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setSellers(json.sellers);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSellers();
  }, []);

  const openCreateModal = () => {
    setSelectedSeller(null);
    setFormData({
      nome_completo: '',
      primeiro_nome: '',
      codigo_acesso: '',
      telefone: '',
      ativo: 1,
      meta_contatos: 240,
      meta_atendimentos: 150,
      meta_propostas: 75,
      meta_vendas: 10,
      meta_valor_vendido: 1000000
    });
    setModalOpen(true);
  };

  const openEditModal = (seller) => {
    setSelectedSeller(seller);
    setFormData({
      nome_completo: seller.nome_completo,
      primeiro_nome: seller.primeiro_nome,
      telefone: seller.telefone || '',
      ativo: seller.ativo,
      codigo_acesso: '' // opcional ao editar
    });
    setModalOpen(true);
  };

  const handleSaveSeller = async (e) => {
    e.preventDefault();
    setFeedback({ type: '', message: '' });

    try {
      const token = localStorage.getItem('token');
      if (selectedSeller) {
        // Update
        const payload = {
          nome_completo: formData.nome_completo,
          primeiro_nome: formData.primeiro_nome,
          telefone: formData.telefone,
          ativo: formData.ativo
        };
        const res = await fetch(`/api/manager/sellers/${selectedSeller.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload)
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || 'Erro ao atualizar');
        setFeedback({ type: 'success', message: 'Vendedor atualizado com sucesso!' });
      } else {
        // Create
        const payload = {
          nome_completo: formData.nome_completo,
          primeiro_nome: formData.primeiro_nome,
          codigo_acesso: formData.codigo_acesso,
          telefone: formData.telefone,
          ativo: formData.ativo,
          metas: {
            meta_contatos: formData.meta_contatos,
            meta_atendimentos: formData.meta_atendimentos,
            meta_propostas: formData.meta_propostas,
            meta_vendas: formData.meta_vendas,
            meta_valor_vendido: formData.meta_valor_vendido
          }
        };
        const res = await fetch('/api/manager/sellers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload)
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || 'Erro ao cadastrar');
        setFeedback({ type: 'success', message: 'Vendedor cadastrado com sucesso!' });
      }

      setModalOpen(false);
      fetchSellers();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleToggleStatus = async (seller) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/manager/sellers/${seller.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ativo: seller.ativo ? 0 : 1 })
      });
      if (res.ok) {
        fetchSellers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetCode = async (e) => {
    e.preventDefault();
    if (!novoCodigo || novoCodigo.length !== 6) {
      alert('O código precisa ter 6 números.');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/manager/sellers/${selectedSeller.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ novo_codigo: novoCodigo })
      });
      if (res.ok) {
        alert('Código de acesso redefinido com sucesso!');
        setResetCodeModal(false);
        setNovoCodigo('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
      
      {/* Top Header */}
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
            Gestão da Equipe de Vendas
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
            Cadastre vendedores, redefina códigos de acesso e controle o status da equipe.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#0f2d59',
            color: '#ffffff',
            padding: '10px 20px',
            borderRadius: '10px',
            border: 'none',
            fontSize: '14px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 4px 6px -1px rgba(15, 45, 89, 0.2)'
          }}
        >
          <UserPlus size={18} />
          <span>Novo Vendedor</span>
        </button>
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

      {/* Tabela de Vendedores */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '14px 16px', color: '#475569', fontWeight: '700' }}>Nome Completo</th>
                <th style={{ padding: '14px 16px', color: '#475569', fontWeight: '700' }}>Primeiro Nome (Login)</th>
                <th style={{ padding: '14px 16px', color: '#475569', fontWeight: '700' }}>Telefone</th>
                <th style={{ padding: '14px 16px', color: '#475569', fontWeight: '700' }}>Status</th>
                <th style={{ padding: '14px 16px', color: '#475569', fontWeight: '700' }}>Data de Cadastro</th>
                <th style={{ padding: '14px 16px', color: '#475569', fontWeight: '700', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {sellers.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 16px', fontWeight: '700', color: '#0f2d59' }}>
                    {s.nome_completo}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#334155' }}>
                    <code style={{ backgroundColor: '#f1f5f9', padding: '3px 8px', borderRadius: '4px', fontSize: '13px' }}>
                      {s.primeiro_nome}
                    </code>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#64748b' }}>
                    {s.telefone || '—'}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <button
                      onClick={() => handleToggleStatus(s)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '700',
                        border: 'none',
                        cursor: 'pointer',
                        backgroundColor: s.ativo ? '#ecfdf5' : '#fef2f2',
                        color: s.ativo ? '#059669' : '#dc2626'
                      }}
                    >
                      {s.ativo ? <CheckCircle size={14} /> : <XCircle size={14} />}
                      <span>{s.ativo ? 'Ativo' : 'Inativo'}</span>
                    </button>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '13px' }}>
                    {formatDateBR(s.criado_em)}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                      <button
                        onClick={() => openEditModal(s)}
                        title="Editar Vendedor"
                        style={{
                          padding: '6px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                          color: '#0f2d59',
                          cursor: 'pointer'
                        }}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedSeller(s);
                          setNovoCodigo('');
                          setResetCodeModal(true);
                        }}
                        title="Redefinir Código de Acesso"
                        style={{
                          padding: '6px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#f8fafc',
                          color: '#0284c7',
                          cursor: 'pointer'
                        }}
                      >
                        <Key size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Criar / Editar Vendedor */}
      {modalOpen && (
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
            maxWidth: '520px',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f2d59', margin: 0 }}>
                {selectedSeller ? 'Editar Vendedor' : 'Cadastrar Novo Vendedor'}
              </h3>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveSeller}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={formData.nome_completo}
                  onChange={(e) => {
                    const fullName = e.target.value;
                    const first = fullName.trim().split(' ')[0] || '';
                    setFormData(prev => ({
                      ...prev,
                      nome_completo: fullName,
                      primeiro_nome: prev.primeiro_nome || first
                    }));
                  }}
                  placeholder="Ex: Mariana Silveira"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Primeiro Nome (Para Login)
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.primeiro_nome}
                    onChange={(e) => setFormData(prev => ({ ...prev, primeiro_nome: e.target.value.trim() }))}
                    placeholder="Ex: Mariana"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Telefone (Opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.telefone}
                    onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>
              </div>

              {!selectedSeller && (
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Código Inicial de 6 Números
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={formData.codigo_acesso}
                    onChange={(e) => setFormData(prev => ({ ...prev, codigo_acesso: e.target.value.replace(/\D/g, '') }))}
                    placeholder="••••••"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '16px', letterSpacing: '3px' }}
                  />
                  <small style={{ color: '#64748b', fontSize: '11px' }}>O código será guardado com criptografia segura.</small>
                </div>
              )}

              {/* Se for novo cadastro, define meta mensal inicial */}
              {!selectedSeller && (
                <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#0f2d59', display: 'block', marginBottom: '8px' }}>
                    Metas Mensais Iniciais (Consórcio)
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: '#64748b' }}>Meta Cotas Vendidas</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.meta_vendas}
                        onChange={(e) => setFormData(prev => ({ ...prev, meta_vendas: parseInt(e.target.value) || 0 }))}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#64748b' }}>Meta Valor Vendido (R$)</label>
                      <input
                        type="number"
                        min="0"
                        step="10000"
                        value={formData.meta_valor_vendido}
                        onChange={(e) => setFormData(prev => ({ ...prev, meta_valor_vendido: parseFloat(e.target.value) || 0 }))}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#0f2d59', color: '#fff', fontWeight: '700', cursor: 'pointer' }}
                >
                  {selectedSeller ? 'Salvar Alterações' : 'Criar Vendedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Redefinir Código */}
      {resetCodeModal && selectedSeller && (
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
            maxWidth: '400px',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f2d59', margin: '0 0 10px 0' }}>
              Redefinir Código de Acesso
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
              Defina um novo código de 6 números para <strong>{selectedSeller.nome_completo}</strong>.
            </p>

            <form onSubmit={handleResetCode}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Novo Código de 6 números
                </label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  value={novoCodigo}
                  onChange={(e) => setNovoCodigo(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '18px', letterSpacing: '4px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setResetCodeModal(false)}
                  style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', backgroundColor: '#0f2d59', color: '#fff', fontWeight: '700', cursor: 'pointer' }}
                >
                  Confirmar Novo Código
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

