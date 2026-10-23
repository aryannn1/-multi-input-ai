import { useState, useRef, useEffect } from 'react';
import { Send, FileText, Bot, User, Loader2, Paperclip } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Hello! I am your AI Research Assistant. Upload a PDF and ask me anything about it, or just ask a general question.' }
  ]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
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
      const response = await fetch('http://127.0.0.1:8000/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      
      if (data.error) throw new Error(data.error);
      
      setUploadedFiles(prev => [...prev, file.name]);
      setMessages(prev => [...prev, { role: 'ai', text: `Document **"${file.name}"** successfully uploaded! You can now ask questions.` }]);
    } catch (error) {
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
      const response = await fetch('http://127.0.0.1:8000/chat', {
        method: 'POST',
        body: formData,
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      let aiMessage = { role: 'ai', text: '' };
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
      setMessages(prev => [...prev, { role: 'ai', text: 'Sorry, I encountered an error.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#212121] text-gray-200 font-sans">
      
      {/* SIDEBAR */}
      <div className="w-[260px] bg-[#171717] flex flex-col border-r border-gray-800 transition-all duration-300">
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
      </div>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col relative">
        
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
                        h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-white mt-6 mb-3 border-b border-gray-700 pb-2" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-xl font-bold text-white mt-5 mb-3" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-lg font-semibold text-blue-400 mt-5 mb-2" {...props} />,
                        p: ({node, ...props}) => <p className="mb-4 leading-relaxed text-gray-300" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-5 space-y-2 text-gray-300" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-5 space-y-2 text-gray-300" {...props} />,
                        li: ({node, ...props}) => <li className="pl-1 leading-relaxed" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-bold text-white" {...props} />,
                        code: ({node, inline, ...props}: any) => 
                          inline ? (
                            <code className="bg-gray-800 text-blue-300 px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
                          ) : (
                            <pre className="bg-[#1e1e1e] p-4 rounded-lg overflow-x-auto my-4 border border-gray-700">
                              <code className="text-gray-200 text-sm font-mono" {...props} />
                            </pre>
                          ),
                        blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-400 my-4" {...props} />,
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
    </div>
  );
}

export default App;