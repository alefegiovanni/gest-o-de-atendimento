import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, LayoutDashboard, UserCheck, Target, 
  FileText, LogOut, Key, User, PlusCircle 
} from 'lucide-react';

import Login from './components/Login';
import SimpleSellerDashboard from './components/SimpleSellerDashboard';
import SimpleManagerDashboard from './components/SimpleManagerDashboard';
import TeamManagement from './components/TeamManagement';
import RecordsManagement from './components/RecordsManagement';
import ChangeCodeModal from './components/ChangeCodeModal';
import EditProfileModal from './components/EditProfileModal';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [changeCodeOpen, setChangeCodeOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  useEffect(() => {
    // Check local storage token
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setCurrentTab('dashboard');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#0f2d59', fontWeight: '700' }}>Carregando Gestão de Atendimento...</p>
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={(loggedUser) => setUser(loggedUser)} />;
  }

  const isManager = user.perfil === 'gerente';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      
      {/* Navbar Superior Principal */}
      <header style={{
        backgroundColor: '#0f2d59',
        color: '#ffffff',
        borderBottom: '3px solid #10b981',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{
          maxWidth: '1360px',
          margin: '0 auto',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          {/* Logo e Nome */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              borderRadius: '10px',
              padding: '8px',
              display: 'flex'
            }}>
              <ShieldCheck size={24} color="#10b981" />
            </div>
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: '800', margin: 0, letterSpacing: '-0.3px' }}>
                Gestão de Atendimento
              </h1>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                Consórcios & Produtividade Comercial
              </span>
            </div>
          </div>

          {/* Menus de Navegação (Para Gerente) */}
          {isManager && (
            <nav style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setCurrentTab('dashboard')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: currentTab === 'dashboard' ? 'rgba(255,255,255,0.18)' : 'transparent',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: currentTab === 'dashboard' ? '700' : '500',
                  cursor: 'pointer'
                }}
              >
                <LayoutDashboard size={16} />
                <span>Visão Geral</span>
              </button>

              <button
                onClick={() => setCurrentTab('equipe')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: currentTab === 'equipe' ? 'rgba(255,255,255,0.18)' : 'transparent',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: currentTab === 'equipe' ? '700' : '500',
                  cursor: 'pointer'
                }}
              >
                <UserCheck size={16} />
                <span>Funcionários</span>
              </button>

              <button
                onClick={() => setCurrentTab('registros')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: currentTab === 'registros' ? 'rgba(255,255,255,0.18)' : 'transparent',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: currentTab === 'registros' ? '700' : '500',
                  cursor: 'pointer'
                }}
              >
                <FileText size={16} />
                <span>Histórico</span>
              </button>

              <button
                onClick={() => setCurrentTab('meu_registro')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: currentTab === 'meu_registro' ? 'rgba(255,255,255,0.18)' : 'transparent',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: currentTab === 'meu_registro' ? '700' : '500',
                  cursor: 'pointer'
                }}
              >
                <PlusCircle size={16} />
                <span>Meu Lançamento</span>
              </button>
            </nav>
          )}

          {/* Dados do Usuário e Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div 
              onClick={() => isManager && setEditProfileOpen(true)}
              style={{ 
                textAlign: 'right', 
                display: 'flex', 
                flexDirection: 'column',
                cursor: isManager ? 'pointer' : 'default',
                padding: '4px 8px',
                borderRadius: '8px',
                transition: 'background-color 0.2s'
              }}
              title={isManager ? "Clique para editar seu nome" : ""}
              onMouseEnter={(e) => isManager && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)')}
              onMouseLeave={(e) => isManager && (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#ffffff' }}>
                  {user.nome_completo}
                </span>
                {isManager && (
                  <span style={{ fontSize: '11px', color: '#10b981', fontWeight: '700' }}>✎</span>
                )}
              </div>
              <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'capitalize' }}>
                {user.perfil === 'gerente' ? 'Gerente / Administrador' : 'Vendedor(a) de Consórcios'}
              </span>
            </div>

            <button
              onClick={() => setChangeCodeOpen(true)}
              title="Alterar meu código de acesso"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#cbd5e1',
                padding: '8px',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              <Key size={16} />
            </button>

            <button
              onClick={handleLogout}
              title="Sair do sistema"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                border: 'none',
                color: '#fca5a5',
                padding: '8px',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal com base no perfil e tab */}
      <main style={{ flex: 1, paddingBottom: '40px' }}>
        {isManager ? (
          <>
            {currentTab === 'dashboard' && <SimpleManagerDashboard />}
            {currentTab === 'equipe' && <TeamManagement />}
            {currentTab === 'registros' && <RecordsManagement />}
            {currentTab === 'meu_registro' && <SimpleSellerDashboard user={user} />}
          </>
        ) : (
          <SimpleSellerDashboard user={user} />
        )}
      </main>

      {/* Footer */}
      <footer style={{
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        padding: '16px 20px',
        textAlign: 'center',
        fontSize: '12px',
        color: '#64748b'
      }}>
        Gestão de Atendimento • Sistema de Produtividade em Consórcios • {new Date().getFullYear()}
      </footer>

      {/* Modal Alterar Código */}
      <ChangeCodeModal isOpen={changeCodeOpen} onClose={() => setChangeCodeOpen(false)} />

      {/* Modal Editar Nome do Gerente */}
      <EditProfileModal 
        isOpen={editProfileOpen} 
        onClose={() => setEditProfileOpen(false)} 
        user={user}
        onUserUpdated={(updated) => setUser(updated)}
      />
    </div>
  );
}

