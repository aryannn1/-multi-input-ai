import { useState, useRef, useEffect } from 'react';
import { Send, FileText, Bot, User, Loader2, Paperclip, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Message = {
  role: 'user' | 'ai';
  text: string;
};

function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: 'Hello! I am your AI Research Assistant. Upload a PDF and ask me anything about it, or just ask a general question.' }
  ]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(() => { scrollToBottom(); }, [messages]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('https://ai-research-backend-hqh1.onrender.com/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      
      if (data.error) throw new Error(data.error);
      
      setUploadedFiles(prev => [...prev, file.name]);
      setMessages(prev => [...prev, { role: 'ai', text: `Document **"${file.name}"** successfully uploaded! You can now ask questions.` }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'ai', text: `Error uploading file.` }]);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    const formData = new FormData();
    formData.append('question', userMessage);

    try {
      const response = await fetch('https://ai-research-backend-hqh1.onrender.com/chat', {
        method: 'POST',
        body: formData,
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      let aiMessage: Message = { role: 'ai', text: '' };
      setMessages(prev => [...prev, aiMessage]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        aiMessage.text += chunk;
        
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { ...aiMessage };
          return newMessages;
        });
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'ai', text: 'Sorry, I encountered an error.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#212121] text-gray-200 font-sans relative overflow-hidden">
      
      {/* SIDEBAR */}
      <div className="w-[260px] bg-[#171717] flex flex-col border-r border-gray-800 transition-all duration-300 z-10">
        <div className="p-4 flex items-center gap-2">
          <Bot className="text-blue-500 w-6 h-6" />
          <h1 className="text-lg font-semibold text-white tracking-wide">AI Research</h1>
        </div>

        <div className="p-3">
          <label className={`w-full flex items-center justify-center gap-2 bg-[#212121] hover:bg-[#2f2f2f] border border-gray-700 text-white py-2.5 px-4 rounded-lg transition-all cursor-pointer text-sm font-medium ${isUploading ? 'opacity-50' : ''}`}>
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
            {isUploading ? 'Uploading...' : 'Upload Document'}
            <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
          </label>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2">
          <h2 className="text-xs font-semibold text-gray-500 mb-2 px-2 uppercase tracking-wider">Uploaded Files</h2>
          {uploadedFiles.length === 0 && <p className="text-sm text-gray-600 px-2 italic">No files yet.</p>}
          {uploadedFiles.map((file, idx) => (
            <div key={idx} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[#2f2f2f] cursor-pointer transition-colors group">
              <FileText className="w-4 h-4 text-gray-400 group-hover:text-white" />
              <span className="text-sm text-gray-300 group-hover:text-white truncate">{file}</span>
            </div>
          ))}
        </div>

        {/* PREMIUM ABOUT BUTTON */}
        <div className="p-4 border-t border-gray-800 bg-[#171717]">
          <button 
            onClick={() => setIsAboutOpen(true)}
            className="w-full flex items-center justify-center gap-2 bg-[#212121] hover:bg-[#2f2f2f] border border-gray-700 text-white py-2.5 px-4 rounded-lg transition-all text-sm font-medium"
          >
            <User className="w-4 h-4 text-blue-500" />
            About Developer
          </button>
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col relative z-10">
        
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg, index) => (
              <div key={index} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${msg.role === 'user' ? 'bg-gray-600' : 'bg-blue-600'}`}>
                  {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
                </div>
                <div className={`px-4 py-3 rounded-2xl max-w-[85%] text-[15px] ${
                  msg.role === 'user' 
                    ? 'bg-[#2f2f2f] text-white rounded-tr-sm' 
                    : 'text-gray-200'
                }`}>
                  {msg.role === 'ai' ? (
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: (props) => <h1 className="text-2xl font-bold text-white mt-6 mb-3 border-b border-gray-700 pb-2" {...props} />,
                        h2: (props) => <h2 className="text-xl font-bold text-white mt-5 mb-3" {...props} />,
                        h3: (props) => <h3 className="text-lg font-semibold text-blue-400 mt-5 mb-2" {...props} />,
                        p: (props) => <p className="mb-4 leading-relaxed text-gray-300" {...props} />,
                        ul: (props) => <ul className="list-disc pl-6 mb-5 space-y-2 text-gray-300" {...props} />,
                        ol: (props) => <ol className="list-decimal pl-6 mb-5 space-y-2 text-gray-300" {...props} />,
                        li: (props) => <li className="pl-1 leading-relaxed" {...props} />,
                        strong: (props) => <strong className="font-bold text-white" {...props} />,
                        blockquote: (props) => <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-400 my-4" {...props} />,
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  ) : (
                    msg.text
                  )}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1].role !== 'ai' && (
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="text-gray-400 flex items-center gap-2 text-sm mt-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-[#212121] border-t border-gray-800 p-4">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSendMessage} className="relative flex items-center bg-[#2f2f2f] rounded-2xl shadow-lg border border-gray-700 focus-within:border-gray-500 transition-all">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message AI Research Assistant..." 
                className="w-full bg-transparent text-white py-4 pl-5 pr-16 focus:outline-none placeholder-gray-400"
                disabled={isLoading}
              />
              <button 
                type="submit" 
                disabled={isLoading || !input.trim()}
                className="absolute right-3 p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-[#3f3f3f] disabled:text-gray-500 rounded-xl text-white transition-all"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
            <p className="text-center text-xs text-gray-500 mt-3">
              AI can make mistakes. Consider verifying important information.
            </p>
          </div>
        </div>

      </div>

      {/* PREMIUM ABOUT MODAL */}
      {isAboutOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-[#1e1e1e]/90 border border-gray-700/50 rounded-3xl p-6 max-w-sm w-full relative shadow-[0_0_50px_-12px_rgba(37,99,235,0.3)]">
            
            <button 
              onClick={() => setIsAboutOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-700 p-2 rounded-full transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center text-center mt-2">
              
              <div className="relative mb-4">
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-full blur-md opacity-50"></div>
                <img 
                  src="/profile.jpg" 
                  alt="Aryan" 
                  className="relative w-28 h-28 rounded-full object-cover border-4 border-[#1e1e1e] shadow-xl"
                  onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                    e.currentTarget.src = "https://ui-avatars.com/api/?name=Aryan&background=2563eb&color=fff&size=150&font-size=0.4";
                  }}
                />
              </div>
              
              <h2 className="text-2xl font-bold text-white tracking-tight">Aryan</h2>
              <div className="inline-block bg-blue-500/10 text-blue-400 text-xs font-semibold px-3 py-1 rounded-full mt-2 mb-5 border border-blue-500/20">
                Full-Stack AI Developer
              </div>
              
              <p className="text-gray-400 text-sm leading-relaxed px-2 mb-6">
                I built this Multi-Input AI Research Assistant to demonstrate advanced <span className="text-gray-200 font-medium">RAG (Retrieval-Augmented Generation)</span> architecture. It features a high-performance FastAPI backend, cloud vector search with Neon DB, and an elegant React interface.
              </p>

              <div className="flex gap-3 w-full">
                <a href="https://github.com/aryannn1" target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-2 bg-[#2a2a2a] hover:bg-[#333] border border-gray-700/50 px-4 py-2.5 rounded-xl text-sm text-gray-200 transition-all hover:-translate-y-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg> GitHub
                </a>
                <a href="https://www.linkedin.com/in/aryan-sharma-66424b288" target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-2 bg-[#0077b5]/10 hover:bg-[#0077b5]/20 border border-[#0077b5]/30 px-4 py-2.5 rounded-xl text-sm text-[#0077b5] transition-all hover:-translate-y-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg> LinkedIn
                </a>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;