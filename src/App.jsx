import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Send, 
  Square, 
  Lock, 
  Unlock, 
  Settings, 
  Trash2, 
  Copy, 
  Check, 
  RefreshCw, 
  Menu, 
  X, 
  Cpu, 
  ShieldCheck, 
  Zap, 
  PlusCircle, 
  HelpCircle,
  HardDrive
} from 'lucide-react';

const DEFAULT_ENDPOINT = 'https://zinia.sjlsolucoes.com.br';
const DEFAULT_MODEL = 'llama3.1:8b';

export default function App() {
  // Config & Security States
  const [pin, setPin] = useState(() => localStorage.getItem('zinup_pin') || '1234');
  const [enteredPin, setEnteredPin] = useState('');
  const [isLocked, setIsLocked] = useState(() => {
    const remember = localStorage.getItem('zinup_remember_unlock');
    return remember === 'true' ? false : true;
  });
  const [rememberDevice, setRememberDevice] = useState(false);
  const [pinError, setPinError] = useState(false);

  // Endpoint & Settings States
  const [endpoint, setEndpoint] = useState(() => localStorage.getItem('zinup_endpoint') || DEFAULT_ENDPOINT);
  const [systemPrompt, setSystemPrompt] = useState(() => localStorage.getItem('zinup_system_prompt') || 'Você é a IA Zinup, um assistente inteligente, prestativo e especialista.');
  const [temperature, setTemperature] = useState(() => parseFloat(localStorage.getItem('zinup_temperature') || '0.7'));
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Server & Models States
  const [serverStatus, setServerStatus] = useState('checking'); // 'online' | 'offline' | 'checking'
  const [pingMs, setPingMs] = useState(null);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [isCheckingServer, setIsCheckingServer] = useState(false);

  // Chat & UI States
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState(() => {
    try {
      const saved = localStorage.getItem('zinup_conversations');
      return saved ? JSON.parse(saved) : [{ id: 'default', title: 'Conversa Inicial', messages: [] }];
    } catch {
      return [{ id: 'default', title: 'Conversa Inicial', messages: [] }];
    }
  });
  const [activeConvId, setActiveConvId] = useState('default');
  const [inputMessage, setInputMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [vramNotification, setVramNotification] = useState('');

  const abortControllerRef = useRef(null);
  const messagesEndRef = useRef(null);

  const activeConversation = conversations.find(c => c.id === activeConvId) || conversations[0];

  // Save conversations to localStorage
  useEffect(() => {
    localStorage.setItem('zinup_conversations', JSON.stringify(conversations));
  }, [conversations]);

  // Save settings
  useEffect(() => {
    localStorage.setItem('zinup_endpoint', endpoint);
    localStorage.setItem('zinup_system_prompt', systemPrompt);
    localStorage.setItem('zinup_temperature', temperature.toString());
  }, [endpoint, systemPrompt, temperature]);

  // Check server health & fetch models
  const checkServerHealth = async () => {
    setIsCheckingServer(true);
    setServerStatus('checking');
    const startTime = performance.now();
    try {
      const cleanEndpoint = endpoint.replace(/\/+$/, '');
      const res = await fetch(`${cleanEndpoint}/api/tags`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(6000)
      });

      if (res.ok) {
        const data = await res.json();
        const latency = Math.round(performance.now() - startTime);
        setPingMs(latency);
        setServerStatus('online');

        if (data.models && Array.isArray(data.models) && data.models.length > 0) {
          const modelList = data.models.map(m => ({
            name: m.name,
            size: m.size ? (m.size / (1024 * 1024 * 1024)).toFixed(1) + ' GB' : ''
          }));
          setModels(modelList);
          if (!modelList.some(m => m.name === selectedModel)) {
            setSelectedModel(modelList[0].name);
          }
        }
      } else {
        setServerStatus('offline');
        setPingMs(null);
      }
    } catch (err) {
      console.warn('Erro ao conectar ao servidor Ollama:', err);
      setServerStatus('offline');
      setPingMs(null);
    } finally {
      setIsCheckingServer(false);
    }
  };

  useEffect(() => {
    if (!isLocked) {
      checkServerHealth();
      const interval = setInterval(checkServerHealth, 20000);
      return () => clearInterval(interval);
    }
  }, [isLocked, endpoint]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages]);

  // Unlock handler
  const handleUnlock = (e) => {
    e.preventDefault();
    if (enteredPin === pin) {
      setIsLocked(false);
      setPinError(false);
      if (rememberDevice) {
        localStorage.setItem('zinup_remember_unlock', 'true');
      }
    } else {
      setPinError(true);
      setEnteredPin('');
      setTimeout(() => setPinError(false), 2000);
    }
  };

  const handleLock = () => {
    localStorage.removeItem('zinup_remember_unlock');
    setIsLocked(true);
    setEnteredPin('');
  };

  // Change PIN handler
  const handleChangePin = (newPin) => {
    if (newPin && newPin.length >= 4) {
      setPin(newPin);
      localStorage.setItem('zinup_pin', newPin);
      alert('PIN de segurança atualizado com sucesso!');
    }
  };

  // Free GPU VRAM
  const handleUnloadVRAM = async () => {
    try {
      setVramNotification('Liberando memória VRAM da GPU...');
      const cleanEndpoint = endpoint.replace(/\/+$/, '');
      await fetch(`${cleanEndpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: selectedModel, keep_alive: 0 })
      });
      setVramNotification('VRAM da RTX 5060 Ti descarregada com sucesso! (0 MB em uso)');
      setTimeout(() => setVramNotification(''), 4000);
    } catch {
      setVramNotification('Erro ao descarregar VRAM da GPU.');
      setTimeout(() => setVramNotification(''), 4000);
    }
  };

  // Send message with streaming
  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isGenerating) return;

    setInputMessage('');

    const userMsg = { role: 'user', content: text, timestamp: new Date().toLocaleTimeString() };
    const updatedMessages = [...activeConversation.messages, userMsg];

    // Update conversation title if first message
    let updatedTitle = activeConversation.title;
    if (activeConversation.messages.length === 0) {
      updatedTitle = text.slice(0, 28) + (text.length > 28 ? '...' : '');
    }

    setConversations(prev => prev.map(c => 
      c.id === activeConvId ? { ...c, title: updatedTitle, messages: updatedMessages } : c
    ));

    // Prepare assistant message
    const assistantMsgIndex = updatedMessages.length;
    const initialAssistantMsg = { 
      role: 'assistant', 
      content: '', 
      timestamp: new Date().toLocaleTimeString(),
      model: selectedModel,
      isStreaming: true 
    };

    setConversations(prev => prev.map(c => 
      c.id === activeConvId ? { ...c, messages: [...updatedMessages, initialAssistantMsg] } : c
    ));

    setIsGenerating(true);
    abortControllerRef.current = new AbortController();

    const startTime = performance.now();
    let tokenCount = 0;

    try {
      const cleanEndpoint = endpoint.replace(/\/+$/, '');
      const payloadMessages = [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        ...updatedMessages.map(m => ({ role: m.role, content: m.content }))
      ];

      const response = await fetch(`${cleanEndpoint}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          messages: payloadMessages,
          stream: true,
          options: { temperature: temperature }
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`Erro do servidor (${response.status}): ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.message?.content) {
              fullContent += parsed.message.content;
              tokenCount++;

              setConversations(prev => prev.map(c => {
                if (c.id !== activeConvId) return c;
                const msgs = [...c.messages];
                if (msgs[assistantMsgIndex]) {
                  msgs[assistantMsgIndex] = {
                    ...msgs[assistantMsgIndex],
                    content: fullContent
                  };
                }
                return { ...c, messages: msgs };
              }));
            }
          } catch {
            // Ignore partial JSON chunks
          }
        }
      }

      const totalSeconds = ((performance.now() - startTime) / 1000).toFixed(1);
      const tokensPerSec = totalSeconds > 0 ? (tokenCount / totalSeconds).toFixed(1) : '0';

      setConversations(prev => prev.map(c => {
        if (c.id !== activeConvId) return c;
        const msgs = [...c.messages];
        if (msgs[assistantMsgIndex]) {
          msgs[assistantMsgIndex] = {
            ...msgs[assistantMsgIndex],
            content: fullContent,
            isStreaming: false,
            stats: `${tokenCount} tokens • ${totalSeconds}s (${tokensPerSec} t/s)`
          };
        }
        return { ...c, messages: msgs };
      }));

    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Geração cancelada pelo usuário.');
      } else {
        setConversations(prev => prev.map(c => {
          if (c.id !== activeConvId) return c;
          const msgs = [...c.messages];
          if (msgs[assistantMsgIndex]) {
            msgs[assistantMsgIndex] = {
              ...msgs[assistantMsgIndex],
              content: `⚠️ Não foi possível obter resposta: ${err.message}. Verifique se o servidor zinia está online e com o túnel ativo.`,
              isStreaming: false,
              isError: true
            };
          }
          return { ...c, messages: msgs };
        }));
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
    }
  };

  const handleNewConversation = () => {
    const newId = 'conv_' + Date.now();
    const newConv = { id: newId, title: 'Nova Conversa', messages: [] };
    setConversations(prev => [newConv, ...prev]);
    setActiveConvId(newId);
    setSidebarOpen(false);
  };

  const handleDeleteConversation = (id, e) => {
    e.stopPropagation();
    if (conversations.length <= 1) {
      setConversations([{ id: 'default', title: 'Conversa Inicial', messages: [] }]);
      setActiveConvId('default');
      return;
    }
    const filtered = conversations.filter(c => c.id !== id);
    setConversations(filtered);
    if (activeConvId === id) {
      setActiveConvId(filtered[0].id);
    }
  };

  const handleCopyText = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Format simple markdown into JSX
  const renderMessageContent = (content) => {
    if (!content) return null;
    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, i) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const lines = part.slice(3, -3).trim().split('\n');
        const lang = lines[0].match(/^[a-zA-Z0-9_-]+$/) ? lines[0] : '';
        const code = lang ? lines.slice(1).join('\n') : lines.join('\n');

        return (
          <div key={i} style={{ position: 'relative', margin: '12px 0' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#090d16',
              borderTopLeftRadius: '10px',
              borderTopRightRadius: '10px',
              padding: '6px 12px',
              fontSize: '0.75rem',
              color: '#94a3b8',
              border: '1px solid rgba(255,255,255,0.08)',
              borderBottom: 'none'
            }}>
              <span>{lang || 'código'}</span>
              <button 
                onClick={() => handleCopyText(code, `code_${i}`)}
                className="btn-secondary"
                style={{ padding: '2px 8px', fontSize: '0.75rem', height: '24px' }}
              >
                {copiedIndex === `code_${i}` ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                {copiedIndex === `code_${i}` ? 'Copiado' : 'Copiar'}
              </button>
            </div>
            <pre style={{ margin: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
              <code>{code}</code>
            </pre>
          </div>
        );
      }
      return <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{part}</span>;
    });
  };

  // If locked, render Lock Screen
  if (isLocked) {
    return (
      <div className="lock-overlay">
        <div className="lock-card">
          <div style={{
            width: '64px',
            height: '64px',
            margin: '0 auto 20px auto',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2), rgba(139, 92, 246, 0.2))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(0, 240, 255, 0.4)',
            boxShadow: '0 0 20px rgba(0, 240, 255, 0.25)'
          }}>
            <Lock size={30} color="#00f0ff" />
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '6px', letterSpacing: '-0.02em' }}>
            ZINUP IA REMOTO
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '24px' }}>
            Painel Privado de Controle da RTX 5060 Ti
          </p>

          <form onSubmit={handleUnlock}>
            <div style={{ marginBottom: '20px' }}>
              <input
                id="pin-input"
                type="password"
                maxLength={8}
                value={enteredPin}
                onChange={(e) => setEnteredPin(e.target.value)}
                placeholder="Digite o PIN de Acesso"
                autoFocus
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  background: '#090d16',
                  border: pinError ? '1px solid var(--rose-danger)' : '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  fontSize: '1.2rem',
                  textAlign: 'center',
                  letterSpacing: '0.3em',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  boxShadow: pinError ? '0 0 15px rgba(244, 63, 94, 0.4)' : 'none'
                }}
              />
              {pinError && (
                <p style={{ color: 'var(--rose-danger)', fontSize: '0.8rem', marginTop: '8px' }}>
                  PIN incorreto. Tente novamente.
                </p>
              )}
            </div>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '0.82rem',
              color: 'var(--text-muted)',
              marginBottom: '24px',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={rememberDevice}
                onChange={(e) => setRememberDevice(e.target.checked)}
                style={{ accentColor: 'var(--cyan-primary)' }}
              />
              Lembrar deste dispositivo
            </label>

            <button type="submit" className="btn-primary" style={{ width: '100%', padding: '14px' }}>
              <Unlock size={18} />
              Desbloquear Painel
            </button>
          </form>

          <p style={{ marginTop: '20px', fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
            PIN padrão inicial: <strong>1234</strong> (alterável nas configurações)
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* VRAM Notification Banner */}
      {vramNotification && (
        <div style={{
          position: 'fixed',
          top: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 200,
          background: 'rgba(16, 185, 129, 0.95)',
          color: '#030712',
          fontWeight: 700,
          padding: '10px 20px',
          borderRadius: 'var(--radius-full)',
          boxShadow: '0 8px 25px rgba(16, 185, 129, 0.4)',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'fadeIn 0.2s ease'
        }}>
          <Zap size={16} />
          {vramNotification}
        </div>
      )}

      {/* Sidebar for Conversations */}
      <aside 
        className={`sidebar glass-panel ${sidebarOpen ? 'open' : ''}`}
        style={{
          width: '280px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid var(--border-dim)',
          background: 'var(--bg-secondary)',
          zIndex: 100
        }}
      >
        <div style={{
          padding: '18px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-dim)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, var(--cyan-primary), var(--violet-primary))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Cpu size={18} color="#030712" />
            </div>
            <div>
              <h1 style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                ZINUP IA
              </h1>
              <span style={{ fontSize: '0.68rem', color: 'var(--cyan-primary)', fontWeight: 600 }}>
                RTX 5060 Ti 16GB
              </span>
            </div>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="btn-icon" 
            style={{ display: window.innerWidth <= 768 ? 'flex' : 'none' }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '14px 16px' }}>
          <button 
            id="new-chat-btn"
            onClick={handleNewConversation}
            className="btn-primary" 
            style={{ width: '100%', padding: '10px' }}
          >
            <PlusCircle size={18} />
            Nova Conversa
          </button>
        </div>

        {/* Conversations List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', fontWeight: 700, padding: '6px 8px', textTransform: 'uppercase' }}>
            Histórico Recente
          </span>
          {conversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => { setActiveConvId(conv.id); setSidebarOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                background: conv.id === activeConvId ? 'var(--bg-surface)' : 'transparent',
                border: conv.id === activeConvId ? '1px solid rgba(0, 240, 255, 0.3)' : '1px solid transparent',
                color: conv.id === activeConvId ? 'var(--cyan-primary)' : 'var(--text-muted)',
                transition: 'all 0.15s ease'
              }}
            >
              <span style={{ fontSize: '0.85rem', fontWeight: conv.id === activeConvId ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}>
                {conv.title}
              </span>
              <button
                onClick={(e) => handleDeleteConversation(conv.id, e)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-subtle)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* Sidebar Footer */}
        <div style={{
          padding: '14px 16px',
          borderTop: '1px solid var(--border-dim)',
          display: 'flex',
          gap: '8px'
        }}>
          <button 
            id="vram-release-btn"
            onClick={handleUnloadVRAM}
            className="btn-secondary" 
            style={{ flex: 1, padding: '8px', fontSize: '0.75rem', gap: '6px' }}
            title="Descarrega o modelo da memória VRAM da RTX 5060 Ti"
          >
            <HardDrive size={14} color="#00f0ff" />
            Liberar VRAM
          </button>
          <button 
            id="lock-btn"
            onClick={handleLock}
            className="btn-icon" 
            title="Bloquear painel"
          >
            <Lock size={16} />
          </button>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="main-chat-area">
        {/* Top Navigation Bar */}
        <header className="glass-panel" style={{
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-dim)',
          zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              id="menu-toggle-btn"
              onClick={() => setSidebarOpen(true)}
              className="btn-icon"
              style={{ display: window.innerWidth <= 768 ? 'flex' : 'none' }}
            >
              <Menu size={18} />
            </button>

            {/* Model Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <select
                id="model-selector"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                style={{
                  background: 'var(--bg-surface)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-dim)',
                  borderRadius: 'var(--radius-md)',
                  padding: '7px 12px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {models.length > 0 ? (
                  models.map(m => (
                    <option key={m.name} value={m.name}>
                      {m.name} ({m.size})
                    </option>
                  ))
                ) : (
                  <option value={DEFAULT_MODEL}>{DEFAULT_MODEL} (Padrão)</option>
                )}
              </select>
            </div>
          </div>

          {/* Telemetry and Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Status Badge */}
            <div 
              onClick={checkServerHealth}
              className={`badge ${serverStatus === 'online' ? 'badge-online' : 'badge-offline'}`}
              style={{ cursor: 'pointer' }}
              title="Clique para testar conexão novamente"
            >
              <span className={`status-dot ${serverStatus === 'online' ? 'online' : 'offline'}`} />
              <span>
                {serverStatus === 'online' 
                  ? `Online ${pingMs ? `(${pingMs}ms)` : ''}` 
                  : serverStatus === 'checking' ? 'Testando...' : 'Offline'}
              </span>
              <RefreshCw size={11} style={{ animation: isCheckingServer ? 'spinSlow 1s linear infinite' : 'none' }} />
            </div>

            <button 
              id="settings-btn"
              onClick={() => setIsSettingsOpen(true)}
              className="btn-icon"
              title="Configurações do Servidor"
            >
              <Settings size={18} />
            </button>
          </div>
        </header>

        {/* Messages List Area */}
        <div className="messages-container">
          {activeConversation.messages.length === 0 ? (
            /* Empty State Hero */
            <div style={{
              margin: 'auto',
              maxWidth: '520px',
              textAlign: 'center',
              padding: '30px 20px',
              animation: 'fadeIn 0.3s ease'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '20px',
                margin: '0 auto 20px auto',
                background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2), rgba(139, 92, 246, 0.2))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(0, 240, 255, 0.4)',
                boxShadow: '0 0 30px rgba(0, 240, 255, 0.2)'
              }}>
                <Sparkles size={32} color="#00f0ff" />
              </div>

              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.02em' }}>
                Servidor ZINUP IA Ativo
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px', lineHeight: 1.5 }}>
                Conectado diretamente à sua máquina local via túnel seguro Cloudflare. Modelo atual: <strong>{selectedModel}</strong> na RTX 5060 Ti 16GB.
              </p>

              {/* Quick Prompt Pills */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', textAlign: 'left' }}>
                {[
                  { title: 'Resumo e Análise', prompt: 'Resuma os pontos principais de um projeto de inteligência artificial autônomo.' },
                  { title: 'Criação de Código', prompt: 'Escreva um script em Python para consumir a API local do Ollama com streaming.' },
                  { title: 'Segurança & Túneis', prompt: 'Explique como proteger uma rota pública do Cloudflare Zero Trust com Bearer Token.' },
                  { title: 'Otimização de GPU', prompt: 'Quais parâmetros posso ajustar no Ollama para extrair a máxima velocidade da RTX 5060 Ti?' }
                ].map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSendMessage(item.prompt)}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-dim)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-focus)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-dim)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--cyan-primary)', marginBottom: '4px' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                      {item.prompt}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Render Messages */
            activeConversation.messages.map((msg, idx) => (
              <div key={idx} className={`message-row ${msg.role}`}>
                {msg.role === 'assistant' && (
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, var(--cyan-primary), #0284c7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Cpu size={16} color="#030712" />
                  </div>
                )}

                <div className="message-bubble">
                  {renderMessageContent(msg.content)}

                  {/* Message stats and copy button */}
                  {msg.role === 'assistant' && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: '10px',
                      paddingTop: '8px',
                      borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                      fontSize: '0.72rem',
                      color: 'var(--text-subtle)'
                    }}>
                      <span>{msg.stats || (msg.isStreaming ? 'Gerando tokens na RTX 5060 Ti...' : '')}</span>
                      <button
                        onClick={() => handleCopyText(msg.content, idx)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: copiedIndex === idx ? '#10b981' : 'var(--text-subtle)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.72rem'
                        }}
                      >
                        {copiedIndex === idx ? <Check size={12} /> : <Copy size={12} />}
                        {copiedIndex === idx ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Input Area */}
        <div className="chat-input-wrapper">
          <div className="chat-input-bar">
            <textarea
              id="chat-input-textarea"
              className="chat-textarea"
              placeholder={serverStatus === 'offline' ? 'Servidor desconectado. Verifique o servidor...' : `Converse com ${selectedModel}... (Shift+Enter para linha nova)`}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              rows={1}
            />

            {isGenerating ? (
              <button 
                id="stop-generation-btn"
                onClick={handleStopGeneration}
                className="btn-primary" 
                style={{ background: 'var(--rose-danger)', padding: '10px 14px' }}
                title="Parar resposta"
              >
                <Square size={16} />
              </button>
            ) : (
              <button 
                id="send-message-btn"
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim() || isGenerating}
                className="btn-primary"
                style={{ padding: '10px 14px' }}
                title="Enviar mensagem"
              >
                <Send size={16} />
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="lock-overlay" onClick={() => setIsSettingsOpen(false)}>
          <div className="lock-card" style={{ maxWidth: '480px', textAlign: 'left' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Configurações do Servidor</h3>
              <button onClick={() => setIsSettingsOpen(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Endpoint URL */}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  URL do Túnel Cloudflare (Endpoint)
                </label>
                <input
                  type="text"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
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
              </div>

              {/* System Prompt */}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Instruções da IA (System Prompt)
                </label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: '#090d16',
                    border: '1px solid var(--border-dim)',
                    color: '#fff',
                    fontSize: '0.85rem',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Temperature */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Temperatura (Criatividade)
                  </label>
                  <span style={{ fontSize: '0.8rem', color: 'var(--cyan-primary)', fontWeight: 700 }}>
                    {temperature}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--cyan-primary)' }}
                />
              </div>

              {/* Change PIN */}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  PIN de Segurança Atual
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="password"
                    maxLength={8}
                    defaultValue={pin}
                    id="new-pin-input"
                    placeholder="Novo PIN"
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: '#090d16',
                      border: '1px solid var(--border-dim)',
                      color: '#fff',
                      fontSize: '0.85rem'
                    }}
                  />
                  <button 
                    onClick={() => {
                      const input = document.getElementById('new-pin-input');
                      if (input) handleChangePin(input.value);
                    }}
                    className="btn-secondary"
                  >
                    Salvar PIN
                  </button>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setIsSettingsOpen(false)} className="btn-primary" style={{ padding: '10px 20px' }}>
                Concluído
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
