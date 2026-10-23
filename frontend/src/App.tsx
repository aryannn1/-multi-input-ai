import { useState, useRef, useEffect } from 'react';
import { Send, FileText, Bot, User, Loader2, Paperclip, X, Menu, Sparkles, ChevronRight, Mic, MicOff, LogOut } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import Auth from './Auth';

type Message = {
  role: 'user' | 'ai';
  text: string;
};

function App() {
  const [user, setUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: '### Welcome to AI Research Assistant ✨\n\nI am your intelligent research companion. Upload a PDF document to extract insights, or simply ask me anything from general knowledge to complex coding queries.' }
  ]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Firebase Auth Check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => { scrollToBottom(); }, [messages]);

  // Voice Input Logic
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setInput(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (!recognitionRef.current) {
        alert("Your browser does not support voice input. Please use Chrome or Edge.");
        return;
      }
      setInput(''); 
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  // 🔥 NAYA: Logout Function (Chat Clear ke liye)
  const handleLogout = async () => {
    await signOut(auth);
    // Saara local data reset karo
    setMessages([{ role: 'ai', text: '### Welcome to AI Research Assistant ✨\n\nI am your intelligent research companion. Upload a PDF document to extract insights, or simply ask me anything from general knowledge to complex coding queries.' }]);
    setUploadedFiles([]);
    setInput('');
    setIsAboutOpen(false);
    setIsMobileMenuOpen(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('user_id', user.uid); 
    formData.append('file', file);

    try {
      const response = await fetch('https://ai-research-backend-hqh1.onrender.com/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      
      if (data.error) throw new Error(data.error);
      
      setUploadedFiles(prev => [...prev, file.name]);
      setMessages(prev => [...prev, { role: 'ai', text: `✅ Document **"${file.name}"** has been successfully analyzed. You may now ask questions related to its content.` }]);
      setIsMobileMenuOpen(false);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'ai', text: `❌ Error uploading file. Please ensure the backend is running.` }]);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !user) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    const formData = new FormData();
    formData.append('user_id', user.uid); 
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
      setMessages(prev => [...prev, { role: 'ai', text: 'Sorry, I encountered an error while processing your request.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Loading State
  if (isAuthLoading) {
    return (
      <div className="h-screen bg-[#030014] flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
        <p className="text-lg font-medium tracking-widest">LOADING NEXUS AI...</p>
      </div>
    );
  }

  // Auth Check
  if (!user) {
    return <Auth onLogin={() => {}} />;
  }

  return (
    <div className="flex h-screen bg-[#030014] text-gray-200 font-sans relative overflow-hidden selection:bg-indigo-500/30">
      
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none z-0"></div>

      {/* MOBILE HEADER */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#030014]/80 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-tr from-indigo-500 to-purple-500 p-1.5 rounded-lg">
            <Bot className="text-white w-5 h-5" />
          </div>
          <h1 className="text-lg font-bold text-white tracking-tight">Nexus AI</h1>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-300 hover:text-white bg-white/5 rounded-lg border border-white/10">
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* SIDEBAR */}
      <div className={`
        fixed md:static inset-y-0 left-0 z-50 w-[280px] bg-[#030014]/95 md:bg-[#030014]/40 backdrop-blur-2xl border-r border-white/10 flex flex-col transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-indigo-500 to-purple-500 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
              <Bot className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Nexus AI</h1>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Info */}
        <div className="px-6 mb-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">
            {user.email?.[0].toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user.displayName || user.email?.split('@')[0]}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
        </div>

        <div className="px-4 mb-6">
          <label className={`group relative w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-3 px-4 rounded-xl transition-all cursor-pointer text-sm font-medium shadow-sm ${isUploading ? 'opacity-50' : ''}`}>
            {isUploading ? <Loader2 className="w-5 h-5 animate-spin text-indigo-400" /> : <Paperclip className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />}
            {isUploading ? 'Analyzing...' : 'Upload Document'}
            <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
          </label>
        </div>

        <div className="flex-1 overflow-y-auto px-4 space-y-2">
          <h2 className="text-xs font-bold text-gray-500 mb-3 px-2 uppercase tracking-widest flex items-center gap-2">
            <Sparkles className="w-3 h-3" /> Your Sources
          </h2>
          {uploadedFiles.length === 0 && <p className="text-sm text-gray-600 px-2 italic">No documents uploaded yet.</p>}
          {uploadedFiles.map((file, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-indigo-500/30 hover:bg-white/10 cursor-pointer transition-all group">
              <FileText className="w-4 h-4 text-gray-400 group-hover:text-indigo-400 transition-colors" />
              <span className="text-sm text-gray-300 group-hover:text-white truncate flex-1">{file}</span>
              <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all" />
            </div>
          ))}
        </div>

        <div className="p-4 mt-auto space-y-2">
          {/* 🔥 NAYA: Logout Button update kiya gaya hai */}
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 py-3 px-4 rounded-xl transition-all text-sm font-medium">
            <LogOut className="w-4 h-4" /> Logout
          </button>

          {/* About Button */}
          <button onClick={() => { setIsAboutOpen(true); setIsMobileMenuOpen(false); }} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 hover:from-indigo-500/20 hover:to-purple-500/20 border border-indigo-500/20 text-white py-3 px-4 rounded-xl transition-all text-sm font-medium">
            <User className="w-4 h-4 text-indigo-400" /> About Developer
          </button>
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col relative z-10 pt-16 md:pt-0 overflow-hidden">
        
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[10%] left-[20%] w-72 h-72 bg-indigo-500/15 rounded-full blur-[80px] animate-blob"></div>
          <div className="absolute bottom-[20%] right-[10%] w-96 h-96 bg-purple-500/15 rounded-full blur-[100px] animate-blob" style={{ animationDelay: '-5s' }}></div>
          <div className="absolute top-[40%] left-[50%] w-64 h-64 bg-blue-500/15 rounded-full blur-[60px] animate-blob" style={{ animationDelay: '-10s' }}></div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8 relative z-10">
          <div className="max-w-4xl mx-auto space-y-8">
            {messages.map((msg, index) => (
              <div key={index} className={`flex gap-4 sm:gap-6 animate-fade-in ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                  msg.role === 'user' 
                    ? 'bg-white/10 border border-white/10' 
                    : 'bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-indigo-500/20'
                }`}>
                  {msg.role === 'user' ? <User className="w-5 h-5 text-gray-300" /> : <Bot className="w-5 h-5 text-white" />}
                </div>

                <div className={`px-5 py-4 rounded-2xl max-w-[85%] text-[15px] sm:text-base leading-relaxed shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-sm' 
                    : 'bg-white/5 border border-white/10 text-gray-200 rounded-tl-sm backdrop-blur-sm'
                }`}>
                  {msg.role === 'ai' ? (
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: (props) => <h1 className="text-xl sm:text-2xl font-bold text-white mt-6 mb-4 pb-2 border-b border-white/10" {...props} />,
                        h2: (props) => <h2 className="text-lg sm:text-xl font-bold text-white mt-5 mb-3" {...props} />,
                        h3: (props) => <h3 className="text-md sm:text-lg font-semibold text-indigo-400 mt-4 mb-2" {...props} />,
                        p: (props) => <p className="mb-4 leading-relaxed" {...props} />,
                        ul: (props) => <ul className="list-disc pl-5 mb-4 space-y-2" {...props} />,
                        ol: (props) => <ol className="list-decimal pl-5 mb-4 space-y-2" {...props} />,
                        li: (props) => <li className="pl-1" {...props} />,
                        strong: (props) => <strong className="font-bold text-white" {...props} />,
                        blockquote: (props) => <blockquote className="border-l-4 border-indigo-500 pl-4 italic text-gray-400 my-4 bg-white/5 py-2 rounded-r-lg" {...props} />,
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
              <div className="flex gap-4 sm:gap-6 animate-fade-in">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="px-5 py-4 rounded-2xl bg-white/5 border border-white/10 rounded-tl-sm flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                  <span className="text-gray-400 font-medium">Analyzing data...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 sm:p-6 bg-gradient-to-t from-[#030014] via-[#030014]/80 to-transparent relative z-10">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSendMessage} className="relative flex items-center bg-white/5 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 focus-within:border-indigo-500/50 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all overflow-hidden">
              
              <button 
                type="button"
                onClick={toggleListening}
                className={`p-3 ml-2 rounded-xl transition-all ${isListening ? 'bg-red-500/20 text-red-500 animate-pulse' : 'text-gray-400 hover:text-indigo-400 hover:bg-white/10'}`}
                title={isListening ? "Stop Listening" : "Speak"}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? "Listening..." : "Ask anything about your documents..."} 
                className="w-full bg-transparent text-white py-4 px-2 pr-16 focus:outline-none placeholder-gray-500 text-sm sm:text-base"
                disabled={isLoading}
              />
              
              <button 
                type="submit" 
                disabled={isLoading || !input.trim()}
                className="absolute right-3 p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-white/5 disabled:text-gray-600 rounded-xl text-white transition-all shadow-lg hover:shadow-indigo-500/25 active:scale-95"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
            <p className="text-center text-xs text-gray-500 mt-3 font-medium">
              Nexus AI can make mistakes. Consider verifying important information.
            </p>
          </div>
        </div>
      </div>

      {/* PREMIUM ABOUT MODAL */}
      {isAboutOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4 transition-all animate-fade-in">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 max-w-sm w-full relative shadow-[0_0_80px_-20px_rgba(99,102,241,0.5)]">
            
            <button 
              onClick={() => setIsAboutOpen(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center mt-2">
              
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full blur-xl opacity-60 animate-pulse"></div>
                <img 
                  src="/profile.jpg" 
                  alt="Aryan" 
                  className="relative w-32 h-32 rounded-full object-cover border-4 border-[#0a0a0a] shadow-2xl"
                  onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                    e.currentTarget.src = "https://ui-avatars.com/api/?name=Aryan&background=6366f1&color=fff&size=150&font-size=0.4";
                  }}
                />
              </div>
              
              <h2 className="text-2xl font-bold text-white tracking-tight">Aryan</h2>
              <div className="inline-block bg-indigo-500/10 text-indigo-400 text-xs font-bold px-4 py-1.5 rounded-full mt-3 mb-6 border border-indigo-500/20 uppercase tracking-wide">
                Full-Stack AI Developer
              </div>
              
              <p className="text-gray-400 text-sm leading-relaxed px-2 mb-8">
                Creator of Nexus AI. I specialize in building intelligent web applications using <span className="text-gray-200 font-semibold">RAG Architecture, FastAPI, React, and Cloud AI services.</span> This project demonstrates production-ready AI integration.
              </p>

              <div className="flex gap-3 w-full">
                <a href="https://github.com/aryannn1" target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-3 rounded-xl text-sm font-medium text-white transition-all hover:-translate-y-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg> GitHub
                </a>
                <a href="https://www.linkedin.com/in/aryan-sharma-66424b288" target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-2 bg-[#0077b5]/10 hover:bg-[#0077b5]/20 border border-[#0077b5]/30 px-4 py-3 rounded-xl text-sm font-medium text-[#0077b5] transition-all hover:-translate-y-0.5">
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