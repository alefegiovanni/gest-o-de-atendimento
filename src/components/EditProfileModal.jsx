import React, { useState } from 'react';
import { User, CheckCircle, AlertCircle, X, Save } from 'lucide-react';

export default function EditProfileModal({ isOpen, onClose, user, onUserUpdated }) {
  const [nomeCompleto, setNomeCompleto] = useState(user?.nome_completo || '');
  const [primeiroNome, setPrimeiroNome] = useState(user?.primeiro_nome || '');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!nomeCompleto.trim() || !primeiroNome.trim()) {
      setError('Nome completo e primeiro nome são obrigatórios.');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nome_completo: nomeCompleto.trim(),
          primeiro_nome: primeiroNome.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao atualizar nome');

      setSuccess('Nome atualizado com sucesso!');
      localStorage.setItem('user', JSON.stringify(data.user));
      onUserUpdated(data.user);

      setTimeout(() => {
        onClose();
        setSuccess('');
      }, 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
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
        maxWidth: '420px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        padding: '24px',
        position: 'relative'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#64748b'
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div style={{
            backgroundColor: '#e0f2fe',
            color: '#0284c7',
            padding: '8px',
            borderRadius: '10px'
          }}>
            <User size={20} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f2d59', margin: 0 }}>
            Editar Meu Nome
          </h3>
        </div>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#fef2f2',
            color: '#dc2626',
            padding: '10px 12px',
            borderRadius: '8px',
            fontSize: '13px',
            marginBottom: '16px'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#f0fdf4',
            color: '#16a34a',
            padding: '10px 12px',
            borderRadius: '8px',
            fontSize: '13px',
            marginBottom: '16px'
          }}>
            <CheckCircle size={16} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
              Nome Completo
            </label>
            <input
              type="text"
              value={nomeCompleto}
              onChange={(e) => {
                const full = e.target.value;
                setNomeCompleto(full);
                const first = full.trim().split(' ')[0] || '';
                setPrimeiroNome(first);
              }}
              required
              placeholder="Ex: Carlos Roberto Silva"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '22px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
              Primeiro Nome (Usado para o Login)
            </label>
            <input
              type="text"
              value={primeiroNome}
              onChange={(e) => setPrimeiroNome(e.target.value.trim())}
              required
              placeholder="Ex: Carlos"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                outline: 'none'
              }}
            />
            <small style={{ color: '#64748b', fontSize: '11px', marginTop: '4px', display: 'block' }}>
              Este é o nome que você digita para entrar no sistema.
            </small>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#0f2d59',
                color: '#ffffff',
                fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Save size={16} />
              <span>{loading ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

