import React, { useState } from 'react';
import { Lock, CheckCircle, AlertCircle, X, ShieldAlert } from 'lucide-react';

export default function ChangeCodeModal({ isOpen, onClose, forced = false, onCodeChanged }) {
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

    if (novoCodigo === codigoAtual) {
      setError('O novo código deve ser diferente do código atual/temporário.');
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

      setSuccess('Código de acesso atualizado com sucesso!');
      setCodigoAtual('');
      setNovoCodigo('');
      setConfirmaCodigo('');
      
      if (onCodeChanged) onCodeChanged();

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
      backgroundColor: forced ? 'rgba(15, 23, 42, 0.85)' : 'rgba(15, 23, 42, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
        padding: '24px',
        position: 'relative'
      }}>
        {!forced && (
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
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <div style={{
            backgroundColor: forced ? '#fff7ed' : '#e0f2fe',
            color: forced ? '#ea580c' : '#0284c7',
            padding: '8px',
            borderRadius: '10px'
          }}>
            {forced ? <ShieldAlert size={22} /> : <Lock size={20} />}
          </div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f2d59', margin: 0 }}>
              {forced ? 'Atualização de Senha Obrigatória' : 'Alterar Código de Acesso'}
            </h3>
            {forced && (
              <span style={{ fontSize: '12px', color: '#c2410c', fontWeight: '700' }}>
                Primeiro acesso ou senha temporária redefinida
              </span>
            )}
          </div>
        </div>

        {forced && (
          <p style={{ fontSize: '13px', color: '#475569', marginBottom: '16px', lineHeight: '1.4' }}>
            Para a segurança dos seus lançamentos, por favor cadastre seu código pessoal de 6 números antes de continuar.
          </p>
        )}

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
              {forced ? 'Código Padrão / Temporário Atual (6 números)' : 'Código Atual (6 números)'}
            </label>
            <input
              type="password"
              maxLength={6}
              value={codigoAtual}
              onChange={(e) => setCodigoAtual(e.target.value.replace(/\D/g, ''))}
              required
              placeholder="••••••"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '16px',
                letterSpacing: '3px'
              }}
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
              Seu Novo Código Pessoal (6 números)
            </label>
            <input
              type="password"
              maxLength={6}
              value={novoCodigo}
              onChange={(e) => setNovoCodigo(e.target.value.replace(/\D/g, ''))}
              required
              placeholder="••••••"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '16px',
                letterSpacing: '3px'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
              Confirmar Seu Novo Código
            </label>
            <input
              type="password"
              maxLength={6}
              value={confirmaCodigo}
              onChange={(e) => setConfirmaCodigo(e.target.value.replace(/\D/g, ''))}
              required
              placeholder="••••••"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '16px',
                letterSpacing: '3px'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            {!forced && (
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
            )}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: forced ? '100%' : 'auto',
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#0f2d59',
                color: '#ffffff',
                fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Salvando...' : 'Salvar Meu Novo Código'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
