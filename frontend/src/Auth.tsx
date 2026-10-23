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
      // Slight fade effect for tail
      ctx.fillStyle = 'rgba(3, 0, 20, 0.1)'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#0F0'; // Green text
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
    <div className="relative flex min-h-screen bg-[#030014] items-center justify-center p-4 overflow-hidden font-sans">
      
      {/* Matrix Rain Background */}
      <MatrixRain />

      {/* Shooting Stars / Meteors Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="absolute h-0.5 w-0.5 bg-white rounded-full shadow-[0_0_10px_2px_rgba(255,255,255,0.8)]"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animation: `meteor ${Math.random() * 3 + 2}s linear infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          >
            <div className="absolute top-0 right-0 w-[100px] h-[1px] bg-gradient-to-l from-white to-transparent transform -translate-y-1/2 translate-x-full rotate-[-45deg] origin-top-right"></div>
          </div>
        ))}
      </div>

      {/* Glow effects */}
      <div className="absolute top-[20%] left-[20%] w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] z-0 pointer-events-none"></div>
      <div className="absolute bottom-[20%] right-[20%] w-96 h-96 bg-green-600/10 rounded-full blur-[120px] z-0 pointer-events-none"></div>

      {/* Login Card */}
      <div className="bg-black/40 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl w-full max-w-md shadow-[0_0_50px_-12px_rgba(99,102,241,0.3)] relative z-10 transition-all duration-300 hover:shadow-[0_0_50px_-12px_rgba(99,102,241,0.5)]">
        
        <div className="flex flex-col items-center mb-8">
          <div className="bg-gradient-to-tr from-indigo-500 to-purple-500 p-3 rounded-2xl mb-4 shadow-lg shadow-indigo-500/30">
            <Bot className="text-white w-8 h-8" />
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight">
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
  );
}