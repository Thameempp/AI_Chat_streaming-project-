import { useState } from "react";
import "./App.css";

function App() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const handleSend = async () => {
    if (!prompt.trim()) return;

    setResponse("");
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
        setResponse((prev) => prev + chunk);
      }
    } catch (error) {
      console.error("Error:", error);
      setResponse("⚠️ Something went wrong. Check console for details.");
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="app">
      <h1>💬 Groq Streaming Chat</h1>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Type your message here..."
      />
      <button onClick={handleSend} disabled={isStreaming}>
        {isStreaming ? "Streaming..." : "Send"}
      </button>

      <div className="response-box">
        <h3>🧠 AI Response:</h3>
        <pre>{response}</pre>
      </div>
    </div>
  );
}

export default App;
