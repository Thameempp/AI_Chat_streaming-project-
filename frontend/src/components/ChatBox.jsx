import { useState } from "react";

export default function ChatBox() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setResponse("");
    setIsLoading(true);

    const apiUrl = "http://127.0.0.1:8000/chat/stream"; // FastAPI backend URL

    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ prompt }),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value);
        setResponse((prev) => prev + chunkValue);
      }
    } catch (err) {
      console.error(err);
      setResponse("Error connecting to API");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-2xl">
      <form onSubmit={handleSubmit} className="flex mb-4">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask me anything..."
          className="flex-1 border rounded-l-lg p-3 focus:outline-none"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="bg-blue-600 text-white px-5 py-3 rounded-r-lg hover:bg-blue-700"
        >
          {isLoading ? "Thinking..." : "Send"}
        </button>
      </form>

      <div className="border rounded-lg p-4 bg-gray-50 min-h-[200px] whitespace-pre-wrap">
        {response || "💬 The AI’s response will appear here..."}
      </div>
    </div>
  );
}
