import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import './ChatBox.css';

function CopyIcon({ copied }) {
  return copied ? (
    <svg width="14" height="14" fill="none" stroke="#77f8c9" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ) : (
    <svg width="14" height="14" fill="none" stroke="#a0bfff" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function ThemeToggle({ theme, toggleTheme }) {
  return (
    <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
      {theme === 'dark' ? (
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

export default function ChatBox() {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [copiedCode, setCopiedCode] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [theme, setTheme] = useState('dark');
  const responseEndRef = useRef(null);
  const hasLoadedSessions = useRef(false);

  useEffect(() => {
    if (!hasLoadedSessions.current) {
      fetchSessions();
      hasLoadedSessions.current = true;
    }
  }, []);

  useEffect(() => {
    if (activeSessionId) {
      fetchMessages(activeSessionId);
    } else {
      setMessages([]);
    }
  }, [activeSessionId]);

  useEffect(() => {
    responseEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleClickOutside = () => setMenuOpenId(null);
    if (menuOpenId !== null) {
      window.addEventListener('click', handleClickOutside);
      return () => window.removeEventListener('click', handleClickOutside);
    }
  }, [menuOpenId]);

  async function fetchSessions() {
    try {
      setIsLoading(true);
      const res = await fetch('http://127.0.0.1:8000/chat/session/');
      if (res.ok) {
        const data = await res.json();
        
        // Fetch last message for each session
        const sessionsWithPreviews = await Promise.all(
          data.map(async (session) => {
            try {
              const msgRes = await fetch(`http://127.0.0.1:8000/chat/session/${session.id}/messages/`);
              if (msgRes.ok) {
                const msgs = await msgRes.json();
                const lastPrompt = msgs.length > 0 ? msgs[msgs.length - 1].prompt : '';
                const lastUpdated = msgs.length > 0 ? msgs[msgs.length - 1].created_at : session.created_at;
                return { ...session, lastPrompt, lastUpdated };
              }
            } catch (error) {
              console.error(`Error fetching messages for session ${session.id}:`, error);
            }
            return { ...session, lastPrompt: '', lastUpdated: session.created_at };
          })
        );
        
        sessionsWithPreviews.sort((a, b) => new Date(b.lastUpdated || b.created_at) - new Date(a.lastUpdated || a.created_at));
        setSessions(sessionsWithPreviews);
        
        if (sessionsWithPreviews.length > 0 && !activeSessionId) {
          setActiveSessionId(sessionsWithPreviews[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchMessages(sessionId) {
    try {
      const res = await fetch(`http://127.0.0.1:8000/chat/session/${sessionId}/messages/`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }

  async function createSession() {
    try {
      const res = await fetch('http://127.0.0.1:8000/chat/session/', { method: 'POST' });
      if (res.ok) {
        const session = await res.json();
        const newSession = { 
          id: session.session_id, 
          created_at: session.created_at,
          lastPrompt: '',
          lastUpdated: session.created_at
        };
        setSessions([newSession, ...sessions]);
        setActiveSessionId(newSession.id);
        setMessages([]);
        setPrompt('');
      }
    } catch (error) {
      console.error('Error creating session:', error);
    }
  }

  async function deleteSession(sessionId) {
    try {
      const res = await fetch(`http://127.0.0.1:8000/chat/session/${sessionId}`, { method: 'DELETE' });
      if (res.ok) {
        const updatedSessions = sessions.filter(s => s.id !== sessionId);
        setSessions(updatedSessions);
        if (activeSessionId === sessionId) {
          if (updatedSessions.length > 0) {
            setActiveSessionId(updatedSessions[0].id);
          } else {
            setActiveSessionId(null);
            setMessages([]);
          }
        }
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!prompt.trim() || isStreaming || !activeSessionId) return;
    const userPrompt = prompt;
    setPrompt('');
    setIsStreaming(true);
    setMessages(prevMessages => [...prevMessages, { prompt: userPrompt, response: '' }]);

    // Update session preview immediately
    const now = new Date().toISOString();
    setSessions(prevSessions =>
      prevSessions.map(s =>
        s.id === activeSessionId ? { ...s, lastPrompt: userPrompt, lastUpdated: now } : s
      )
    );

    try {
      const res = await fetch(`http://127.0.0.1:8000/chat/session/${activeSessionId}/message/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userPrompt })
      });
      if (!res.body) throw new Error('No response stream found');
      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullResponse += chunk;
        setMessages(prevMessages => {
          const newMessages = [...prevMessages];
          if (newMessages.length > 0) {
            newMessages[newMessages.length - 1] = {
              ...newMessages[newMessages.length - 1],
              response: fullResponse
            };
          }
          return newMessages;
        });
      }
    } catch (error) {
      console.error('Error streaming response:', error);
      setMessages(prevMessages => {
        const newMessages = [...prevMessages];
        if (newMessages.length > 0) {
          newMessages[newMessages.length - 1] = {
            ...newMessages[newMessages.length - 1],
            response: '⚠️ Something went wrong. Please try again.'
          };
        }
        return newMessages;
      });
    } finally {
      setIsStreaming(false);
    }
  }

  function getSessionPreview(session) {
    const preview = session.lastPrompt || 'New conversation';
    return preview.length > 45 ? preview.substring(0, 45) + '...' : preview;
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return '';
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      
      // Check if today
      if (messageDate.getTime() === today.getTime()) {
        return 'Today ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      }
      
      // Check if yesterday
      if (messageDate.getTime() === yesterday.getTime()) {
        return 'Yesterday ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      }
      
      // Otherwise show date and time
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + 
             date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const copyCode = async (code, idx) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(idx);
      setTimeout(() => setCopiedCode(null), 1200);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  const toggleMenu = (e, id) => {
    e.stopPropagation();
    setMenuOpenId(menuOpenId === id ? null : id);
  };

  const renderers = {
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      const codeText = String(children).replace(/\n$/, '');
      const idx = node?.position?.start?.offset || Math.random();
      return !inline ? (
        <div className="code-block-container">
          <SyntaxHighlighter
            language={language}
            style={theme === 'dark' ? vscDarkPlus : prism}
            customStyle={{
              background: theme === 'dark' ? '#172238' : '#f5f7fa',
              borderRadius: '10px',
              fontSize: '15px',
              margin: 0,
              color: theme === 'dark' ? '#b2e5ff' : '#1a202c',
              border: theme === 'dark' ? '1px solid #223657' : '1px solid #e2e8f0',
              boxShadow: '0 1px 6px #1d294328'
            }}
          >
            {codeText}
          </SyntaxHighlighter>
          <button className="copy-code-btn" onClick={() => copyCode(codeText, idx)} aria-label="Copy code">
            <CopyIcon copied={copiedCode === idx} />
          </button>
        </div>
      ) : (
        <code className={className} {...props}>{children}</code>
      );
    }
  };

  if (isLoading) {
    return (
      <div className="chat-container">
        <div className="loading-screen">
          <div className="loading-spinner" />
          <p>Loading sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <ThemeToggle theme={theme} toggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />
      <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <button onClick={createSession} className="new-chat-btn">
            <span className="icon">+</span>
            New Chat
          </button>
        </div>
        <div className="history-list">
          <h3 className="history-title">RECENT CHATS</h3>
          {sessions.length === 0 ? (
            <div className="empty-history"><p>No conversations yet</p></div>
          ) : (
            sessions.map(sess => (
              <div key={sess.id} className={`history-item ${sess.id === activeSessionId ? 'active' : ''}`} onClick={() => setActiveSessionId(sess.id)}>
                <div className="history-content">
                  <div className="history-preview">{getSessionPreview(sess)}</div>
                  <div className="history-time">{formatTime(sess.lastUpdated || sess.created_at)}</div>
                </div>
                <div className="menu-wrapper">
                  <button className="menu-trigger" onClick={(e) => toggleMenu(e, sess.id)}>⋮</button>
                  {menuOpenId === sess.id && (
                    <div className="dropdown-menu" onClick={e => e.stopPropagation()}>
                      <button className="menu-item delete" onClick={() => deleteSession(sess.id)}>Delete</button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
      <main className="main-chat">
        <button className="toggle-sidebar" onClick={() => setIsSidebarOpen(!isSidebarOpen)} title={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}>
          <span>{isSidebarOpen ? '◀' : '▶'}</span>
        </button>
        <div className="messages-area">
          {messages.length === 0 ? (
            <div className="welcome-screen">
              <div className="welcome-icon">💬</div>
              <h1>AskAI</h1>
              <p>Start a conversation by typing your question below</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx}>
                {msg.prompt && (
                  <div className="message-bubble user-bubble">
                    <div className="bubble-content">{msg.prompt}</div>
                  </div>
                )}
                {msg.response && (
                  <div className="message-bubble ai-bubble">
                    <div className="bubble-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={renderers}>
                        {msg.response}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
          {isStreaming && (
            <div className="typing-indicator">
              <span></span><span></span><span></span>
            </div>
          )}
          <div ref={responseEndRef} />
        </div>
        <div className="input-area">
          <form onSubmit={handleSubmit} className="input-form">
            <input type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Type your message here..." className="prompt-input" disabled={isStreaming || !activeSessionId} />
            <button type="submit" disabled={isStreaming || !activeSessionId || !prompt.trim()} className="submit-btn">
              {isStreaming ? 'Streaming...' : 'Send'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
