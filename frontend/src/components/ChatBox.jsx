import { useState, useRef, useEffect } from 'react';
import './ChatBox.css';

export default function ChatBox() {
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const responseEndRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    responseEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, activeConvId]);

  // Get active conversation
  const activeConv = conversations.find(c => c.id === activeConvId);

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim() || isStreaming) return;

    let convId = activeConvId;

    // Create new conversation if none active
    if (!convId) {
      const newConv = {
        id: Date.now(),
        prompt: prompt,
        response: '',
        timestamp: new Date().toISOString()
      };
      setConversations([newConv, ...conversations]);
      convId = newConv.id;
      setActiveConvId(convId);
    } else {
      // Update existing conversation prompt
      setConversations(prev =>
        prev.map(c =>
          c.id === convId ? { ...c, prompt: prompt, response: '' } : c
        )
      );
    }

    setIsStreaming(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.body) {
        throw new Error("No response stream found");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        
        // Update conversation with streaming response
        setConversations(prev =>
          prev.map(c =>
            c.id === convId ? { ...c, response: (c.response || '') + chunk } : c
          )
        );
      }
    } catch (error) {
      console.error('Error:', error);
      setConversations(prev =>
        prev.map(c =>
          c.id === convId 
            ? { ...c, response: '⚠️ Something went wrong. Check console for details.' } 
            : c
        )
      );
    } finally {
      setIsStreaming(false);
      setPrompt('');
    }
  };

  // Create new chat
  const newChat = () => {
    setActiveConvId(null);
    setPrompt('');
  };

  // Get preview text
  const getPreview = (conv) => {
    if (!conv.prompt) return 'New conversation';
    return conv.prompt.length > 45 
      ? conv.prompt.substring(0, 45) + '...' 
      : conv.prompt;
  };

  // Format time
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 86400000) { // Less than 24 hours
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="chat-container">
      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <button onClick={newChat} className="new-chat-btn">
            <span className="icon">+</span>
            New Chat
          </button>
        </div>

        <div className="history-list">
          <h3 className="history-title">RECENT CHATS</h3>
          {conversations.length === 0 ? (
            <div className="empty-history">
              <p>No conversations yet</p>
            </div>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.id}
                className={`history-item ${conv.id === activeConvId ? 'active' : ''}`}
                onClick={() => setActiveConvId(conv.id)}
              >
                <div className="history-preview">{getPreview(conv)}</div>
                <div className="history-time">{formatTime(conv.timestamp)}</div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="main-chat">
        {/* Toggle Button */}
        <button
          className="toggle-sidebar"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          title={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          <span>{isSidebarOpen ? '◀' : '▶'}</span>
        </button>

        {/* Messages */}
        <div className="messages-area">
          {activeConv ? (
            <>
              {activeConv.prompt && (
                <div className="message-bubble user-bubble">
                  <div className="bubble-content">{activeConv.prompt}</div>
                </div>
              )}

              {activeConv.response && (
                <div className="message-bubble ai-bubble">
                  <div className="bubble-content">
                    <pre className="response-text">{activeConv.response}</pre>
                  </div>
                </div>
              )}

              {isStreaming && activeConv.id === activeConvId && (
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              )}
            </>
          ) : (
            <div className="welcome-screen">
              <div className="welcome-icon">💬</div>
              <h1>Groq Streaming Chat</h1>
              <p>Start a conversation by typing your question below</p>
            </div>
          )}
          <div ref={responseEndRef} />
        </div>

        {/* Input Form */}
        <div className="input-area">
          <form onSubmit={handleSubmit} className="input-form">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Type your message here..."
              className="prompt-input"
              disabled={isStreaming}
            />
            <button
              type="submit"
              disabled={isStreaming}
              className="submit-btn"
            >
              {isStreaming ? "Streaming..." : "Send"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
