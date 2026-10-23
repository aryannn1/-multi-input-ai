import { useState, useEffect, useRef } from 'react';
import { auth, googleProvider } from './firebase';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { Bot, Mail, Lock, Loader2 } from 'lucide-react';

// Matrix Rain Component
const MatrixRain = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()*&^%'.split('');
    const fontSize = 16;
    const columns = canvas.width / fontSize;
    const drops: number[] = [];

    for (let x = 0; x < columns; x++) {
      drops[x] = 1;
    }

    const draw = () => {
      ctx.fillStyle = 'rgba(3, 0, 20, 0.1)'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#0F0'; 
      ctx.font = fontSize + 'px monospace';

      for (let i = 0; i < drops.length; i++) {
        const text = characters[Math.floor(Math.random() * characters.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 50);

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-20 pointer-events-none" />;
};

export default function Auth({ onLogin }: { onLogin: () => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      onLogin();
    } catch (err: any) {
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      onLogin();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen bg-[#030014] font-sans overflow-hidden">
      
      {/* Matrix Rain Background */}
      <MatrixRain />

      {/* Glow effects */}
      <div className="absolute top-[20%] left-[20%] w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] z-0 pointer-events-none"></div>
      <div className="absolute bottom-[20%] right-[20%] w-96 h-96 bg-green-600/10 rounded-full blur-[120px] z-0 pointer-events-none"></div>

      {/* Main Layout Container */}
      <div className="relative z-10 flex flex-col lg:flex-row w-full max-w-6xl mx-auto p-4 sm:p-8 items-center justify-center gap-8 lg:gap-20">
        
        {/* LEFT SIDE: About Developer (Hidden on small screens, shown on large) */}
        <div className="hidden lg:flex flex-col flex-1 text-left">
          <div className="relative mb-8 w-40 h-40">
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full blur-xl opacity-60 animate-pulse"></div>
            <img 
              src="/profile.jpg" 
              alt="Aryan" 
              className="relative w-40 h-40 rounded-full object-cover border-4 border-white/10 shadow-2xl"
              onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                e.currentTarget.src = "https://ui-avatars.com/api/?name=Aryan&background=6366f1&color=fff&size=200&font-size=0.4";
              }}
            />
          </div>
          
          <h1 className="text-5xl font-bold text-white tracking-tight mb-4">
            Hi, I'm <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Aryan</span>
          </h1>
          <p className="text-xl text-gray-300 font-medium mb-6">Full-Stack AI Developer</p>
          <p className="text-gray-400 leading-relaxed max-w-lg mb-8">
            I specialize in building intelligent, production-ready web applications. 
            <span className="text-gray-200 font-semibold"> Nexus AI</span> is a demonstration of advanced RAG Architecture, combining React, FastAPI, Gemini API, and Cloud Databases to create a seamless research experience.
          </p>

          <div className="flex gap-4">
             <a href="https://github.com/aryannn1" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg> GitHub
             </a>
             <a href="https://www.linkedin.com/in/aryan-sharma-66424b288" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm font-medium text-[#0077b5] hover:text-[#00a0e9] transition-colors">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg> LinkedIn
             </a>
          </div>
        </div>

        {/* RIGHT SIDE: Login Form */}
        <div className="w-full max-w-md">
          <div className="bg-black/40 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl shadow-[0_0_50px_-12px_rgba(99,102,241,0.3)] transition-all duration-300 hover:shadow-[0_0_50px_-12px_rgba(99,102,241,0.5)]">
            
            <div className="flex flex-col items-center mb-8">
              <div className="bg-gradient-to-tr from-indigo-500 to-purple-500 p-3 rounded-2xl mb-4 shadow-lg shadow-indigo-500/30">
                <Bot className="text-white w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {isLogin ? 'Access Nexus' : 'Join Nexus'}
              </h2>
              <p className="text-gray-400 text-sm mt-2 text-center">
                {isLogin ? 'Your intelligent research companion awaits.' : 'Create an account to start your AI journey.'}
              </p>
            </div>

            {error && (
              <div className="bg-red-500/10 text-red-400 p-3 rounded-xl text-sm mb-6 border border-red-500/20 text-center animate-pulse">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative group">
                <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-400 group-focus-within:text-indigo-400 transition-colors" />
                <input
                  type="email"
                  placeholder="Email address"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-gray-500"
                />
              </div>
              <div className="relative group">
                <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400 group-focus-within:text-indigo-400 transition-colors" />
                <input
                  type="password"
                  placeholder="Password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-gray-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-medium transition-all shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Sign In' : 'Create Account')}
              </button>
            </form>

            <div className="mt-8 flex items-center gap-4">
              <div className="h-px bg-white/10 flex-1"></div>
              <span className="text-xs text-gray-500 uppercase tracking-widest">Or</span>
              <div className="h-px bg-white/10 flex-1"></div>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full mt-6 bg-white hover:bg-gray-100 text-black py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
              Continue with Google
            </button>

            <p className="text-center text-sm text-gray-400 mt-8">
              {isLogin ? "New here? " : "Already have an account? "}
              <button
                onClick={() => { setIsLogin(!isLogin); setError(''); }}
                className="text-indigo-400 font-medium hover:text-indigo-300 transition-colors"
              >
                {isLogin ? 'Create an account' : 'Sign In'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}