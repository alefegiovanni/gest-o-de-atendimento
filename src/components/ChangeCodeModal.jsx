import React, { useState } from 'react';
import { Lock, CheckCircle, AlertCircle, X } from 'lucide-react';

export default function ChangeCodeModal({ isOpen, onClose }) {
  const [codigoAtual, setCodigoAtual] = useState('');
  const [novoCodigo, setNovoCodigo] = useState('');
  const [confirmaCodigo, setConfirmaCodigo] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (novoCodigo.length !== 6 || !/^\d{6}$/.test(novoCodigo)) {
      setError('O novo código deve possuir exatamente 6 números.');
      return;
    }

    if (novoCodigo !== confirmaCodigo) {
      setError('A confirmação do código não confere com o novo código.');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/auth/change-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          codigo_atual: codigoAtual,
          novo_codigo: novoCodigo
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao alterar código');

      setSuccess('Código de acesso alterado com sucesso!');
      setCodigoAtual('');
      setNovoCodigo('');
      setConfirmaCodigo('');
      setTimeout(() => {
        onClose();
        setSuccess('');
      }, 1500);
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
        maxWidth: '400px',
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
            <Lock size={20} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f2d59', margin: 0 }}>
            Alterar Código de Acesso
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
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
              Código Atual (6 números)
            </label>
            <input
              type="password"
              maxLength={6}
              value={codigoAtual}
              onChange={(e) => setCodigoAtual(e.target.value.replace(/\D/g, ''))}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '16px',
                letterSpacing: '2px'
              }}
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
              Novo Código (6 números)
            </label>
            <input
              type="password"
              maxLength={6}
              value={novoCodigo}
              onChange={(e) => setNovoCodigo(e.target.value.replace(/\D/g, ''))}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '16px',
                letterSpacing: '2px'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
              Confirmar Novo Código
            </label>
            <input
              type="password"
              maxLength={6}
              value={confirmaCodigo}
              onChange={(e) => setConfirmaCodigo(e.target.value.replace(/\D/g, ''))}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '16px',
                letterSpacing: '2px'
              }}
            />
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
                padding: '10px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#0f2d59',
                color: '#ffffff',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Salvando...' : 'Atualizar Código'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

