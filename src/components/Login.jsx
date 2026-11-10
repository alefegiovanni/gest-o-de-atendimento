import React, { useState } from 'react';
import { ShieldCheck, UserCheck, AlertCircle, Lock, ArrowRight, KeyRound, CheckCircle } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [primeiroNome, setPrimeiroNome] = useState('');
  const [codigoAcesso, setCodigoAcesso] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [ambiguousOptions, setAmbiguousOptions] = useState(null);

  // Modo Alterar Código (Primeiro Acesso / Esqueci Código)
  const [isChangingCode, setIsChangingCode] = useState(false);
  const [resetNome, setResetNome] = useState('');
  const [codigoAtual, setCodigoAtual] = useState('');
  const [novoCodigo, setNovoCodigo] = useState('');
  const [confirmaNovo, setConfirmaNovo] = useState('');

  const handleSubmit = async (e, chosenUser = null) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!codigoAcesso || codigoAcesso.length !== 6) {
      setError('Por favor, informe o seu código de acesso com 6 números.');
      return;
    }

    if (!chosenUser && !primeiroNome.trim()) {
      setError('Por favor, informe seu primeiro nome.');
      return;
    }

    setLoading(true);
    try {
      const payload = chosenUser 
        ? { user_id: chosenUser.id, codigo_acesso: codigoAcesso }
        : { primeiro_nome: primeiroNome.trim(), codigo_acesso: codigoAcesso };

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.status === 300 && data.ambiguous) {
        setAmbiguousOptions(data.options);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || 'Falha no login');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetCode = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!resetNome.trim()) {
      setError('Informe seu primeiro nome.');
      return;
    }

    if (codigoAtual.length !== 6) {
      setError('O código atual precisa ter 6 números.');
      return;
    }

    if (novoCodigo.length !== 6) {
      setError('O novo código precisa ter 6 números.');
      return;
    }

    if (novoCodigo !== confirmaNovo) {
      setError('A confirmação não confere com o novo código.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primeiro_nome: resetNome.trim(),
          codigo_atual: codigoAtual,
          novo_codigo: novoCodigo
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao alterar código');

      setSuccessMsg(data.message || 'Código alterado com sucesso! Já pode entrar.');
      setPrimeiroNome(resetNome.trim());
      setCodigoAcesso(novoCodigo);
      setIsChangingCode(false);
      setCodigoAtual('');
      setNovoCodigo('');
      setConfirmaNovo('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #091a32 0%, #0f2d59 50%, #1b4984 100%)',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '460px',
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden'
      }}>
        {/* Header visual */}
        <div style={{
          backgroundColor: '#0f2d59',
          padding: '32px 28px',
          color: '#ffffff',
          textAlign: 'center',
          position: 'relative',
          borderBottom: '4px solid #10b981'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            marginBottom: '16px'
          }}>
            <ShieldCheck size={32} color="#10b981" />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px', margin: 0 }}>
            Gestão de Atendimento
          </h1>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '6px' }}>
            {isChangingCode ? 'Primeiro Acesso / Alterar Código' : 'Acompanhe seus resultados todos os dias.'}
          </p>
        </div>

        {/* Form Container */}
        <div style={{ padding: '32px 28px' }}>
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              padding: '12px 16px',
              borderRadius: '12px',
              marginBottom: '20px',
              fontSize: '13px',
              border: '1px solid #fecaca'
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: '#ecfdf5',
              color: '#059669',
              padding: '12px 16px',
              borderRadius: '12px',
              marginBottom: '20px',
              fontSize: '13px',
              border: '1px solid #a7f3d0'
            }}>
              <CheckCircle size={18} style={{ flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Ambiguous selector modal / alert */}
          {ambiguousOptions ? (
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '14px', color: '#334155', fontWeight: '600', marginBottom: '12px' }}>
                Encontramos mais de um colaborador chamado "{primeiroNome}". Quem é você?
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {ambiguousOptions.map(opt => (
                  <button
                    key={opt.id}
                    onClick={(e) => handleSubmit(e, opt)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#f8fafc',
                      color: '#0f2d59',
                      fontWeight: '600',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span>{opt.nome_completo}</span>
                    <ArrowRight size={16} />
                  </button>
                ))}
              </div>
            </div>
          ) : isChangingCode ? (
            /* FORMULÁRIO DE TROCAR CÓDIGO */
            <form onSubmit={handleResetCode}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Seu primeiro nome
                </label>
                <input
                  type="text"
                  value={resetNome}
                  onChange={(e) => setResetNome(e.target.value)}
                  placeholder="Ex: Isabela"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    fontSize: '15px',
                    borderRadius: '10px',
                    border: '1.5px solid #e2e8f0',
                    outline: 'none',
                    backgroundColor: '#f8fafc'
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Código Atual / Temporário (6 números)
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={codigoAtual}
                  onChange={(e) => setCodigoAtual(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    fontSize: '16px',
                    letterSpacing: '3px',
                    borderRadius: '10px',
                    border: '1.5px solid #e2e8f0',
                    outline: 'none',
                    backgroundColor: '#f8fafc'
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Novo Código de 6 números
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={novoCodigo}
                  onChange={(e) => setNovoCodigo(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    fontSize: '16px',
                    letterSpacing: '3px',
                    borderRadius: '10px',
                    border: '1.5px solid #e2e8f0',
                    outline: 'none',
                    backgroundColor: '#f8fafc'
                  }}
                />
              </div>

              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Confirmar Novo Código
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={confirmaNovo}
                  onChange={(e) => setConfirmaNovo(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    fontSize: '16px',
                    letterSpacing: '3px',
                    borderRadius: '10px',
                    border: '1.5px solid #e2e8f0',
                    outline: 'none',
                    backgroundColor: '#f8fafc'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  fontSize: '15px',
                  fontWeight: '700',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  marginBottom: '14px'
                }}
              >
                {loading ? 'Salvando...' : 'Salvar Novo Código'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsChangingCode(false);
                  setError('');
                }}
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                ← Voltar para o Login
              </button>
            </form>
          ) : (
            /* FORMULÁRIO DE LOGIN NORMAL */
            <form onSubmit={(e) => handleSubmit(e)}>
              <div style={{ marginBottom: '18px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#334155',
                  marginBottom: '6px'
                }}>
                  Seu primeiro nome
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={primeiroNome}
                    onChange={(e) => setPrimeiroNome(e.target.value)}
                    placeholder="Ex: Isabela"
                    autoFocus
                    required
                    style={{
                      width: '100%',
                      padding: '13px 16px',
                      fontSize: '15px',
                      borderRadius: '10px',
                      border: '1.5px solid #e2e8f0',
                      outline: 'none',
                      backgroundColor: '#f8fafc'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#0070f3'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#334155'
                  }}>
                    Código de 6 números
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsChangingCode(true);
                      setResetNome(primeiroNome);
                      setError('');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#0070f3',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    Trocar código?
                  </button>
                </div>

                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    maxLength={6}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={codigoAcesso}
                    onChange={(e) => setCodigoAcesso(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    required
                    style={{
                      width: '100%',
                      padding: '13px 16px',
                      fontSize: '18px',
                      letterSpacing: '4px',
                      borderRadius: '10px',
                      border: '1.5px solid #e2e8f0',
                      outline: 'none',
                      backgroundColor: '#f8fafc'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#0070f3'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                  <Lock size={18} color="#94a3b8" style={{ position: 'absolute', right: '14px', top: '15px' }} />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: '#0f2d59',
                  color: '#ffffff',
                  fontSize: '15px',
                  fontWeight: '700',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'background-color 0.2s',
                  boxShadow: '0 4px 12px rgba(15, 45, 89, 0.25)'
                }}
                onMouseOver={(e) => !loading && (e.target.style.backgroundColor = '#1b4984')}
                onMouseOut={(e) => !loading && (e.target.style.backgroundColor = '#0f2d59')}
              >
                {loading ? 'Entrando...' : 'Entrar no Sistema'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '18px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsChangingCode(true);
                    setResetNome(primeiroNome);
                    setError('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <KeyRound size={14} />
                  <span>Primeiro acesso? Clique para definir seu código</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
