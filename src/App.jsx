import React, { useState, useEffect, useRef } from 'react';
import { 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff, 
  Activity, 
  Cpu, 
  HardDrive, 
  Flame, 
  Terminal, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  ShieldCheck, 
  Zap, 
  Trash2, 
  Copy, 
  Check, 
  Settings, 
  X,
  Play,
  Gauge,
  Globe,
  Server,
  Layers
} from 'lucide-react';

const DEFAULT_ENDPOINT = 'https://zinia.sjlsolucoes.com.br';
const DEFAULT_MODEL = 'llama3.1:8b';
const TOTAL_VRAM_GB = 16.0;

// Hash SHA-256 da senha 'Mel30290186@@' (para não expor a senha em texto plano no bundle)
const MASTER_PASSWORD_HASH = '5dd222a547e08bc942ee50d8ffed23a1f3ea2c5bd24384d1dae509c0f8fc8226';

// Função utilitária para calcular SHA-256 no navegador usando Web Crypto API
async function computeSha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function App() {
  // Estado de Autenticação & Fachada Secreta
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('zinup_auth_token') === 'session_valid_active';
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  // Contador de cliques secretos na logo
  const clickHistoryRef = useRef([]);
  const [logoClickedAnimation, setLogoClickedAnimation] = useState(false);

  // Configurações do Servidor
  const [endpoint, setEndpoint] = useState(() => localStorage.getItem('zinup_endpoint') || DEFAULT_ENDPOINT);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Telemetria de Servidor & GPU
  const [serverStatus, setServerStatus] = useState('checking'); // 'online' | 'offline' | 'checking'
  const [serverVersion, setServerVersion] = useState('');
  const [pingMs, setPingMs] = useState(null);
  const [models, setModels] = useState([]);
  const [testModel, setTestModel] = useState(DEFAULT_MODEL);
  const [isCheckingServer, setIsCheckingServer] = useState(false);

  // Sobrecarga & VRAM
  const [activeLoadedModels, setActiveLoadedModels] = useState([]);
  const [usedVramGb, setUsedVramGb] = useState(0);
  const [vramPercentage, setVramPercentage] = useState(0);
  const [isGpuOverloaded, setIsGpuOverloaded] = useState(false);

  // Teste Rápido de IA (Não-chat)
  const [isTestingInference, setIsTestingInference] = useState(false);
  const [lastTestResult, setLastTestResult] = useState(null);

  // Logs do Sistema
  const [logs, setLogs] = useState(() => [
    { id: 1, type: 'info', text: 'NOC Zinup IA Gateway inicializado com sucesso.', time: new Date().toLocaleTimeString() }
  ]);
  const [copiedLog, setCopiedLog] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const logsEndRef = useRef(null);

  const addLog = (type, text) => {
    setLogs(prev => [
      { id: Date.now() + Math.random(), type, text, time: new Date().toLocaleTimeString() },
      ...prev.slice(0, 199)
    ]);
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutTimer > 0) {
      const timer = setTimeout(() => setLockoutTimer(t => t - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [lockoutTimer]);

  // Detector de 3 cliques rápidos na logo (dentro de 1.8 segundos)
  const handleLogoClick = () => {
    const now = Date.now();
    setLogoClickedAnimation(true);
    setTimeout(() => setLogoClickedAnimation(false), 300);

    // Adiciona timestamp do clique
    const recentClicks = [...clickHistoryRef.current, now].filter(t => now - t <= 1800);
    clickHistoryRef.current = recentClicks;

    if (recentClicks.length >= 3) {
      clickHistoryRef.current = [];
      if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
      if (isAuthenticated) {
        showToast('Painel de Controle já está ativo!');
      } else {
        setIsAuthModalOpen(true);
        setPasswordInput('');
        setAuthError('');
      }
    }
  };

  // Validação de Senha com SHA-256
  const handleAuthenticate = async (e) => {
    e.preventDefault();
    if (lockoutTimer > 0) return;

    if (!passwordInput) {
      setAuthError('Digite a senha de operador.');
      return;
    }

    try {
      const hashed = await computeSha256(passwordInput);

      if (hashed === MASTER_PASSWORD_HASH) {
        setIsAuthenticated(true);
        setIsAuthModalOpen(false);
        setPasswordInput('');
        setAuthError('');
        setFailedAttempts(0);
        addLog('success', 'Acesso de operador autenticado com sucesso.');

        if (rememberDevice) {
          localStorage.setItem('zinup_auth_token', 'session_valid_active');
        }
        showToast('Acesso concedido ao Painel Administrativo!');
      } else {
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        addLog('warn', `Tentativa de acesso não autorizada (${nextAttempts}ª falha).`);

        if (nextAttempts >= 3) {
          setLockoutTimer(60);
          setAuthError('Bloqueio de segurança temporário (60s) ativado após 3 tentativas inválidas.');
        } else {
          setAuthError(`Senha incorreta. Tentativa ${nextAttempts} de 3.`);
        }
        setPasswordInput('');
      }
    } catch (err) {
      setAuthError('Erro ao processar validação criptográfica.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('zinup_auth_token');
    setIsAuthenticated(false);
    addLog('info', 'Sessão de operador encerrada.');
    showToast('Sessão encerrada com sucesso.');
  };

  // Polling de Telemetria e GPU
  const pollTelemetry = async () => {
    if (!isAuthenticated) return;
    setIsCheckingServer(true);
    const startTime = performance.now();
    const cleanEndpoint = endpoint.replace(/\/+$/, '');

    try {
      // 1. Consulta /api/ps (VRAM e modelos ativos)
      const psRes = await fetch(`${cleanEndpoint}/api/ps`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });

      if (psRes.ok) {
        const psData = await psRes.json();
        const latency = Math.round(performance.now() - startTime);
        setPingMs(latency);
        setServerStatus('online');

        if (psData.models && Array.isArray(psData.models)) {
          setActiveLoadedModels(psData.models);
          const totalVramBytes = psData.models.reduce((acc, m) => acc + (m.size_vram || m.size || 0), 0);
          const gb = parseFloat((totalVramBytes / (1024 * 1024 * 1024)).toFixed(2));
          setUsedVramGb(gb);

          const pct = Math.min(100, Math.round((gb / TOTAL_VRAM_GB) * 100));
          setVramPercentage(pct);

          const overloaded = pct >= 85;
          setIsGpuOverloaded(overloaded);
        } else {
          setActiveLoadedModels([]);
          setUsedVramGb(0);
          setVramPercentage(0);
          setIsGpuOverloaded(false);
        }
      } else {
        setServerStatus('offline');
        setPingMs(null);
      }

      // 2. Consulta /api/version
      const vRes = await fetch(`${cleanEndpoint}/api/version`, { signal: AbortSignal.timeout(4000) });
      if (vRes.ok) {
        const vData = await vRes.json();
        setServerVersion(vData.version || '0.40.1');
      }

      // 3. Consulta /api/tags (lista de modelos disponíveis)
      if (models.length === 0) {
        const tagsRes = await fetch(`${cleanEndpoint}/api/tags`, { signal: AbortSignal.timeout(4000) });
        if (tagsRes.ok) {
          const tagsData = await tagsRes.json();
          if (tagsData.models && Array.isArray(tagsData.models)) {
            const list = tagsData.models.map(m => ({
              name: m.name,
              size: m.size ? (m.size / (1024 * 1024 * 1024)).toFixed(1) + ' GB' : ''
            }));
            setModels(list);
            if (!list.some(m => m.name === testModel)) {
              setTestModel(list[0].name);
            }
          }
        }
      }

    } catch (err) {
      setServerStatus('offline');
      setPingMs(null);
    } finally {
      setIsCheckingServer(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      pollTelemetry();
      const interval = setInterval(pollTelemetry, 3500);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, endpoint, models.length]);

  // Descarregar VRAM da GPU
  const handleUnloadVRAM = async () => {
    try {
      showToast('Descarregando modelo da VRAM...');
      addLog('info', 'Comando enviado: liberar VRAM da GPU (keep_alive: 0)...');
      const cleanEndpoint = endpoint.replace(/\/+$/, '');
      const targetModel = activeLoadedModels.length > 0 ? activeLoadedModels[0].name : testModel;

      await fetch(`${cleanEndpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: targetModel, keep_alive: 0 })
      });

      showToast('VRAM da RTX 5060 Ti liberada com sucesso!');
      addLog('success', `VRAM liberada. Modelo ${targetModel} descarregado.`);
      pollTelemetry();
    } catch (err) {
      showToast('Erro ao liberar VRAM.');
      addLog('error', `Falha ao liberar VRAM: ${err.message}`);
    }
  };

  // Teste Rápido de Inferência da IA (Não-chat)
  const handleRunInferenceTest = async () => {
    if (isTestingInference) return;
    setIsTestingInference(true);
    setLastTestResult(null);
    addLog('info', `Iniciando teste de inferência no modelo '${testModel}'...`);

    const startTime = performance.now();
    try {
      const cleanEndpoint = endpoint.replace(/\/+$/, '');
      const res = await fetch(`${cleanEndpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: testModel,
          prompt: 'Responda com exatamente uma palavra: OK.',
          stream: false,
          options: { temperature: 0.1 }
        })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

      const data = await res.json();
      const totalSeconds = ((performance.now() - startTime) / 1000).toFixed(2);
      const evalCount = data.eval_count || 1;
      const tps = data.eval_duration ? ((evalCount / (data.eval_duration / 1e9))).toFixed(1) : (evalCount / parseFloat(totalSeconds)).toFixed(1);

      const result = {
        success: true,
        model: testModel,
        timeSec: totalSeconds,
        tokensPerSec: tps,
        response: (data.response || '').trim(),
        timestamp: new Date().toLocaleTimeString()
      };

      setLastTestResult(result);
      addLog('success', `Teste de inferência aprovado: ${testModel} respondeu em ${totalSeconds}s (${tps} t/s).`);
      showToast(`Inferência no ${testModel} 100% aprovada!`);
      pollTelemetry();
    } catch (err) {
      setLastTestResult({
        success: false,
        error: err.message,
        timestamp: new Date().toLocaleTimeString()
      });
      addLog('error', `Falha no teste de inferência: ${err.message}`);
      showToast('Falha no teste de inferência.');
    } finally {
      setIsTestingInference(false);
    }
  };

  // =========================================================================
  // RENDERIZAÇÃO: FACHADA PÚBLICA (DECOY STEALTH VIEW)
  // =========================================================================
  if (!isAuthenticated) {
    return (
      <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        {/* Toast */}
        {toastMessage && (
          <div style={{
            position: 'fixed',
            top: '20px',
            zIndex: 300,
            background: 'rgba(0, 240, 255, 0.95)',
            color: '#030712',
            fontWeight: 700,
            padding: '10px 22px',
            borderRadius: 'var(--radius-full)',
            boxShadow: '0 8px 25px rgba(0, 240, 255, 0.4)',
            fontSize: '0.85rem',
            animation: 'fadeIn 0.2s ease'
          }}>
            {toastMessage}
          </div>
        )}

        {/* Fachada Institucional Decoy */}
        <div style={{
          width: '100%',
          maxWidth: '560px',
          background: 'var(--bg-glass-card)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--border-dim)',
          borderRadius: 'var(--radius-lg)',
          padding: '40px 32px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          textAlign: 'center',
          animation: 'fadeIn 0.4s ease'
        }}>
          {/* LOGO OFICIAL COM GESTO SECRETO DE 3 CLIQUES */}
          <div 
            onClick={handleLogoClick}
            className={logoClickedAnimation ? 'logo-click-anim' : ''}
            style={{
              width: '92px',
              height: '92px',
              margin: '0 auto 24px auto',
              borderRadius: '24px',
              padding: '6px',
              background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.15), rgba(139, 92, 246, 0.15))',
              border: '1px solid rgba(0, 240, 255, 0.3)',
              cursor: 'pointer',
              userSelect: 'none',
              transition: 'transform 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="SJL Soluções Gateway"
          >
            <img 
              src="/favicon.png" 
              alt="Logo" 
              style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '18px' }} 
            />
          </div>

          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '8px' }}>
            SJL Soluções
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '32px' }}>
            Gateway Operacional & Monitor de Infraestrutura Cloud
          </p>

          {/* Cards de Status Institucionais */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', textAlign: 'left', marginBottom: '30px' }}>
            <div style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-dim)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--emerald-success)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                <CheckCircle2 size={16} />
                SERVIÇOS DE REDE
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>100% Operacional</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: '4px' }}>Roteamento Cloudflare ativo</div>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-dim)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--cyan-primary)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                <ShieldCheck size={16} />
                SEGURANÇA EDGE
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>Criptografia TLS 1.3</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: '4px' }}>Túnel de ponta a ponta ativo</div>
            </div>
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', borderTop: '1px solid var(--border-dim)', paddingTop: '18px' }}>
            © 2026 SJL Soluções. Todos os sistemas monitorados 24/7.
          </div>
        </div>

        {/* MODAL SECRETO DE AUTENTICAÇÃO (ATIVADO APENAS PELOS 3 CLIQUES) */}
        {isAuthModalOpen && (
          <div className="modal-overlay" onClick={() => setIsAuthModalOpen(false)}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                margin: '0 auto 16px auto',
                background: 'rgba(0, 240, 255, 0.15)',
                border: '1px solid rgba(0, 240, 255, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Lock size={26} color="#00f0ff" />
              </div>

              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '6px' }}>
                Acesso de Operador
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '22px' }}>
                Digite a credencial mestra para abrir o console de monitoramento.
              </p>

              {lockoutTimer > 0 ? (
                <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '16px', color: '#fb7185', fontSize: '0.85rem' }}>
                  <AlertTriangle size={20} style={{ margin: '0 auto 8px auto', display: 'block' }} />
                  Bloqueio temporário por segurança. Tente novamente em <strong>{lockoutTimer}s</strong>.
                </div>
              ) : (
                <form onSubmit={handleAuthenticate}>
                  <div style={{ position: 'relative', marginBottom: '14px' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordInput}
                      onChange={e => setPasswordInput(e.target.value)}
                      placeholder="Senha de Segurança"
                      autoFocus
                      style={{
                        width: '100%',
                        padding: '12px 42px 12px 14px',
                        background: '#090d16',
                        border: authError ? '1px solid var(--rose-danger)' : '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: 'var(--radius-md)',
                        color: '#fff',
                        fontSize: '0.95rem',
                        outline: 'none',
                        letterSpacing: showPassword ? 'normal' : '0.15em'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {authError && (
                    <div style={{ color: 'var(--rose-danger)', fontSize: '0.8rem', marginBottom: '14px', textAlign: 'left' }}>
                      {authError}
                    </div>
                  )}

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '20px', cursor: 'pointer', justifyContent: 'flex-start' }}>
                    <input
                      type="checkbox"
                      checked={rememberDevice}
                      onChange={e => setRememberDevice(e.target.checked)}
                      style={{ accentColor: 'var(--cyan-primary)' }}
                    />
                    Manter autenticado neste dispositivo
                  </label>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setIsAuthModalOpen(false)}
                      className="btn-secondary"
                      style={{ flex: 1 }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      style={{ flex: 1 }}
                    >
                      <Unlock size={16} />
                      Desbloquear
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // RENDERIZAÇÃO: PAINEL PROFISSIONAL DE MONITORAMENTO (NOC DASHBOARD)
  // =========================================================================
  return (
    <div className="app-container" style={{ padding: '0 0 40px 0' }}>
      {/* Toast */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 300,
          background: 'rgba(0, 240, 255, 0.95)',
          color: '#030712',
          fontWeight: 700,
          padding: '10px 24px',
          borderRadius: 'var(--radius-full)',
          boxShadow: '0 8px 25px rgba(0, 240, 255, 0.4)',
          fontSize: '0.85rem',
          animation: 'fadeIn 0.2s ease'
        }}>
          {toastMessage}
        </div>
      )}

      {/* Header Executivo do NOC */}
      <header className="glass-panel" style={{
        padding: '14px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-dim)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img 
            src="/favicon.png" 
            alt="Logo" 
            style={{ width: '38px', height: '38px', borderRadius: '10px', objectFit: 'contain' }} 
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                ZINUP NOC • MONITOR DE INFRAESTRUTURA
              </h1>
              <span className="badge badge-gpu" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                RTX 5060 Ti 16GB
              </span>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>
              Túnel Oficial: {endpoint.replace('https://', '')}
            </span>
          </div>
        </div>

        {/* Status & Controles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div 
            onClick={pollTelemetry}
            className={`badge ${serverStatus === 'online' ? 'badge-online' : 'badge-offline'}`}
            style={{ cursor: 'pointer', padding: '6px 12px' }}
            title="Clique para atualizar telemetria"
          >
            <span className={`status-dot ${serverStatus === 'online' ? 'online' : 'offline'}`} />
            <span>{serverStatus === 'online' ? `Online (${pingMs}ms)` : 'Offline'}</span>
            <RefreshCw size={12} style={{ animation: isCheckingServer ? 'spinSlow 1s linear infinite' : 'none' }} />
          </div>

          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="btn-icon" 
            title="Configurações de Rede"
          >
            <Settings size={18} />
          </button>

          <button 
            onClick={handleLogout}
            className="btn-secondary" 
            style={{ gap: '6px', fontSize: '0.78rem' }}
            title="Bloquear painel e retornar à fachada pública"
          >
            <Lock size={14} />
            Bloquear
          </button>
        </div>
      </header>

      {/* Conteúdo Principal do Painel */}
      <div style={{ maxWidth: '1080px', width: '100%', margin: '24px auto', padding: '0 20px' }}>
        
        {/* ALERTA DE SOBRECARGA DA GPU (CASO ATINGIDO) */}
        {isGpuOverloaded && (
          <div style={{
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid var(--rose-danger)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 18px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            animation: 'fadeIn 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fb7185' }}>
              <AlertTriangle size={22} />
              <div>
                <strong style={{ fontSize: '0.9rem' }}>ALERTA: SOBRECARGA DE VRAM DETECTADA ({vramPercentage}%)</strong>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                  A memória de vídeo da RTX 5060 Ti está em {usedVramGb} GB / 16.0 GB. Novas inferências podem sofrer lentidão.
                </p>
              </div>
            </div>
            <button onClick={handleUnloadVRAM} className="btn-primary" style={{ background: 'var(--rose-danger)', padding: '6px 12px', fontSize: '0.78rem' }}>
              Descarregar VRAM
            </button>
          </div>
        )}

        {/* GRID DE 4 CARDS PRINCIPAIS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          
          {/* CARD 1: VRAM & SOBRECARGA */}
          <div className="noc-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 700, marginBottom: '8px' }}>
              <span>MEMÓRIA VRAM (RTX 5060 Ti)</span>
              <HardDrive size={16} color="#00f0ff" />
            </div>
            <div style={{ fontSize: '1.7rem', fontWeight: 800, color: isGpuOverloaded ? 'var(--rose-danger)' : 'var(--cyan-primary)' }}>
              {usedVramGb} <span style={{ fontSize: '0.95rem', color: 'var(--text-subtle)' }}>/ 16.0 GB</span>
            </div>
            {/* Barra Gráfica */}
            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', marginTop: '12px', overflow: 'hidden' }}>
              <div style={{
                width: `${vramPercentage}%`,
                height: '100%',
                background: isGpuOverloaded ? 'linear-gradient(90deg, #f59e0b, #f43f5e)' : 'linear-gradient(90deg, #00f0ff, #8b5cf6)',
                borderRadius: '999px',
                transition: 'width 0.4s ease'
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-subtle)', marginTop: '8px' }}>
              <span>{vramPercentage}% Ocupado</span>
              <span>{(TOTAL_VRAM_GB - usedVramGb).toFixed(2)} GB Livres</span>
            </div>
          </div>

          {/* CARD 2: MODELO ATIVO NA PLACA */}
          <div className="noc-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 700, marginBottom: '8px' }}>
              <span>PROCESSO ATIVO NA GPU</span>
              <Flame size={16} color={activeLoadedModels.length > 0 ? '#38bdf8' : '#10b981'} />
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: activeLoadedModels.length > 0 ? '#38bdf8' : 'var(--emerald-success)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeLoadedModels.length > 0 ? activeLoadedModels[0].name : 'OCIOSA / LIVRE'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
              {activeLoadedModels.length > 0 ? (
                <>Contexto: {activeLoadedModels[0].context_length || 4096} tokens • {((activeLoadedModels[0].size_vram || activeLoadedModels[0].size) / (1024**3)).toFixed(1)} GB</>
              ) : (
                '0% de uso. GPU fria e pronta para requisições.'
              )}
            </div>
            {activeLoadedModels.length > 0 && (
              <button 
                onClick={handleUnloadVRAM} 
                className="btn-secondary" 
                style={{ marginTop: '12px', width: '100%', padding: '6px', fontSize: '0.72rem', gap: '4px' }}
              >
                <HardDrive size={12} color="#00f0ff" />
                Liberar Memória da Placa
              </button>
            )}
          </div>

          {/* CARD 3: TÚNEL & ROTEAMENTO */}
          <div className="noc-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 700, marginBottom: '8px' }}>
              <span>ROTEAMENTO CLOUDFLARE</span>
              <Globe size={16} color="#10b981" />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: serverStatus === 'online' ? 'var(--emerald-success)' : 'var(--rose-danger)' }}>
              {serverStatus === 'online' ? `${pingMs} ms` : 'DESCONECTADO'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
              Versão: Ollama {serverVersion || 'v0.40.1'} • HTTP/2
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', marginTop: '4px' }}>
              Protocolo TLS seguro via túnel persistente.
            </div>
          </div>

          {/* CARD 4: MODELOS INSTALADOS */}
          <div className="noc-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 700, marginBottom: '8px' }}>
              <span>CATÁLOGO LOCAL DE IA</span>
              <Layers size={16} color="#8b5cf6" />
            </div>
            <div style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--violet-primary)' }}>
              {models.length} <span style={{ fontSize: '0.9rem', color: 'var(--text-subtle)' }}>modelos</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {models.map(m => m.name).slice(0, 3).join(', ')}{models.length > 3 ? '...' : ''}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', marginTop: '4px' }}>
              Armazenados localmente no SSD.
            </div>
          </div>
        </div>

        {/* SEÇÃO: TESTE RÁPIDO DE INFERÊNCIA DA IA (PING DE IA - NÃO-CHAT) */}
        <div className="noc-card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={18} color="#00f0ff" />
                Diagnóstico de Inferência da IA (Ping de Operação)
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Dispara um teste rápido para validar se o motor e os núcleos CUDA da RTX 5060 Ti estão respondendo normalmente.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <select
                value={testModel}
                onChange={e => setTestModel(e.target.value)}
                style={{
                  background: 'var(--bg-main)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-dim)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 12px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {models.map(m => (
                  <option key={m.name} value={m.name}>{m.name} ({m.size})</option>
                ))}
              </select>

              <button
                onClick={handleRunInferenceTest}
                disabled={isTestingInference || serverStatus !== 'online'}
                className="btn-primary"
                style={{ padding: '8px 16px', fontSize: '0.82rem', gap: '6px' }}
              >
                {isTestingInference ? (
                  <>
                    <RefreshCw size={14} style={{ animation: 'spinSlow 1s linear infinite' }} />
                    Testando...
                  </>
                ) : (
                  <>
                    <Play size={14} />
                    Disparar Teste
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Resultado do Teste de Inferência */}
          {lastTestResult && (
            <div style={{
              background: lastTestResult.success ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.08)',
              border: `1px solid ${lastTestResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
              borderRadius: 'var(--radius-md)',
              padding: '14px 18px',
              animation: 'fadeIn 0.2s ease'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: lastTestResult.success ? '#34d399' : '#fb7185' }}>
                  {lastTestResult.success ? '✓ INFERÊNCIA CONCLUÍDA COM SUCESSO' : '✗ FALHA NA INFERÊNCIA'}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>
                  {lastTestResult.timestamp}
                </span>
              </div>

              {lastTestResult.success ? (
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '0.82rem' }}>
                  <div><strong>Modelo:</strong> {lastTestResult.model}</div>
                  <div><strong>Tempo de Resposta:</strong> {lastTestResult.timeSec}s</div>
                  <div><strong>Taxa de Geração:</strong> {lastTestResult.tokensPerSec} tokens/s</div>
                  <div><strong>Saída da GPU:</strong> <code style={{ color: 'var(--cyan-primary)' }}>{lastTestResult.response}</code></div>
                </div>
              ) : (
                <div style={{ color: 'var(--rose-danger)', fontSize: '0.82rem' }}>
                  Erro reportado: {lastTestResult.error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* SEÇÃO: TERMINAL DE LOGS DE AUDITORIA EM TEMPO REAL */}
        <div className="noc-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Terminal size={18} color="#00f0ff" />
                Console de Logs de Auditoria & Eventos
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                Histórico detalhado de conexões, requisições, liberação de memória e pings.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => setLogs([])} 
                className="btn-secondary" 
                style={{ padding: '6px 12px', fontSize: '0.75rem', gap: '4px' }}
              >
                <Trash2 size={13} />
                Limpar
              </button>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(logs.map(l => `[${l.time}] [${l.type.toUpperCase()}] ${l.text}`).join('\n'));
                  setCopiedLog(true);
                  setTimeout(() => setCopiedLog(false), 2000);
                }} 
                className="btn-secondary" 
                style={{ padding: '6px 12px', fontSize: '0.75rem', gap: '4px' }}
              >
                {copiedLog ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                {copiedLog ? 'Copiado' : 'Copiar Logs'}
              </button>
            </div>
          </div>

          {/* Terminal Box */}
          <div className="terminal-window" style={{ maxHeight: '280px' }}>
            {logs.map(log => {
              let color = '#94a3b8';
              if (log.type === 'success') color = '#34d399';
              if (log.type === 'warn') color = '#fbbf24';
              if (log.type === 'error') color = '#fb7185';

              return (
                <div key={log.id} style={{ display: 'flex', gap: '10px', marginBottom: '6px', lineHeight: 1.4 }}>
                  <span style={{ color: '#475569', flexShrink: 0 }}>[{log.time}]</span>
                  <span style={{ color, wordBreak: 'break-word' }}>{log.text}</span>
                </div>
              );
            })}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>

      {/* MODAL DE CONFIGURAÇÕES DE REDE */}
      {isSettingsOpen && (
        <div className="modal-overlay" onClick={() => setIsSettingsOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '440px', textAlign: 'left' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Configurações do Servidor</h3>
              <button onClick={() => setIsSettingsOpen(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                URL do Túnel Cloudflare (Endpoint)
              </label>
              <input
                type="text"
                value={endpoint}
                onChange={e => setEndpoint(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: '#090d16',
                  border: '1px solid var(--border-dim)',
                  color: '#fff',
                  fontSize: '0.85rem'
                }}
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', marginTop: '4px', display: 'block' }}>
                Padrão oficial: {DEFAULT_ENDPOINT}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setIsSettingsOpen(false)} className="btn-primary">
                Salvar & Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
