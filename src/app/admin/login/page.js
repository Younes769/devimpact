'use client';

import { useState } from 'react';
import { supabase } from '@/utils/supabase';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  async function handleLogin(e) {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: {
          persistSession: rememberMe
        }
      });

      if (error) throw error;
      
      router.push('/admin');
    } catch (error) {
      console.error('Error logging in:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black">
      <div className="min-h-screen bg-[radial-gradient(circle_at_50%_50%,_rgba(16,185,129,0.05)_0%,_transparent_60%)] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <div className="relative w-12 h-12 bg-white/5 rounded-xl p-2">
              <Image
                src="/logo.png"
                alt="DevImpact Logo"
                width={48}
                height={48}
                className="rounded-lg"
                priority
              />
            </div>
          </div>

          <div className="relative bg-white/5 rounded-2xl backdrop-blur-sm border border-white/10 p-8 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent rounded-2xl"></div>
            <div className="relative">
              <h2 className="text-2xl font-bold text-white mb-2 text-center">Admin Login</h2>
              <p className="text-white/60 text-center mb-8">Enter your credentials to access the dashboard</p>
              
              <form onSubmit={handleLogin} className="space-y-6">
                {error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                    placeholder="admin@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-white/10 bg-white/5 text-emerald-500 focus:ring-emerald-500/50"
                    />
                    <span className="text-sm text-white/60 group-hover:text-white/80 transition-colors">Remember me</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`
                    w-full px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium 
                    rounded-lg transition-all flex items-center justify-center gap-2
                    ${loading ? 'opacity-75 cursor-not-allowed' : ''}
                  `}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Logging in...</span>
                    </>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
} 