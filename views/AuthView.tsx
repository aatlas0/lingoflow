import React, { useState } from 'react';
import { useAuth, USERNAME_REGEX } from '../contexts/AuthContext';
import { useAppContext } from '../contexts/AppContext';
import { Button } from '../components/common/Button';
import { AnimatedBackground } from '../components/layout/AnimatedBackground';

type Mode = 'signIn' | 'signUp';

export const AuthView: React.FC = () => {
  const { signIn, signUp } = useAuth();
  const { isHighContrast, toggleHighContrast } = useAppContext();
  const [mode, setMode] = useState<Mode>('signIn');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'signUp') {
      if (!USERNAME_REGEX.test(username.trim())) {
        setError('Username must be 3-20 characters: letters, numbers, or underscores.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setIsSubmitting(true);
    let errorMessage: string | null;
    try {
      errorMessage = mode === 'signIn'
        ? await signIn(username, password)
        : await signUp(username, password);
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
    }
    setIsSubmitting(false);

    if (errorMessage) setError(errorMessage);
    // On success the auth listener flips the session and the app renders.
  };

  const inputClasses = `
    w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:border-brand-turquoise transition-colors
    ${isHighContrast
      ? 'border-slate-600 bg-slate-700/80 text-white placeholder-slate-500'
      : 'border-desert-dark bg-white/80 text-dark-green placeholder-dark-green/30'}
  `;

  const labelClasses = `block text-sm font-bold mb-1 ${isHighContrast ? 'text-slate-200' : 'text-dark-green'}`;

  return (
    <div className="h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <AnimatedBackground />

      {/* Theme toggle — follows the device theme by default */}
      <button
        onClick={toggleHighContrast}
        aria-pressed={isHighContrast}
        title={isHighContrast ? 'Switch to light mode' : 'Switch to dark mode'}
        className={`absolute top-4 right-4 z-20 p-3 rounded-full text-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-turquoise
          ${isHighContrast ? 'bg-slate-800/80 text-slate-200 hover:bg-slate-700' : 'bg-white/60 text-dark-green hover:bg-white/90'}
        `}
      >
        {isHighContrast ? '🌕' : '🌑'}
      </button>

      <div className="w-full max-w-md relative z-10 animate-fade-in-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gold text-dark-green text-3xl font-black ring-4 ring-desert shadow-xl mb-4">
            L
          </div>
          <h1 className={`text-4xl font-black tracking-tight ${isHighContrast ? 'text-white' : 'text-dark-green'}`}>LingoFlow</h1>
          <p className={`mt-2 ${isHighContrast ? 'text-slate-300' : 'text-dark-green/70'}`}>Your journey to a new language starts here.</p>
        </div>

        <div className={`backdrop-blur-md rounded-2xl shadow-xl border p-8
          ${isHighContrast ? 'bg-slate-800/90 border-slate-700' : 'bg-white/80 border-desert-dark/50'}
        `}>
          {/* Mode Tabs */}
          <div className={`flex rounded-lg p-1 mb-6 ${isHighContrast ? 'bg-slate-900/60' : 'bg-desert/50'}`} role="tablist">
            <button
              role="tab"
              aria-selected={mode === 'signIn'}
              onClick={() => switchMode('signIn')}
              className={`flex-1 py-2 rounded-md font-bold transition-all ${
                mode === 'signIn'
                  ? 'bg-brand-turquoise text-white shadow'
                  : isHighContrast ? 'text-slate-400 hover:text-white' : 'text-dark-green/60 hover:text-dark-green'
              }`}
            >
              Sign In
            </button>
            <button
              role="tab"
              aria-selected={mode === 'signUp'}
              onClick={() => switchMode('signUp')}
              className={`flex-1 py-2 rounded-md font-bold transition-all ${
                mode === 'signUp'
                  ? 'bg-brand-turquoise text-white shadow'
                  : isHighContrast ? 'text-slate-400 hover:text-white' : 'text-dark-green/60 hover:text-dark-green'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className={labelClasses}>
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder={mode === 'signUp' ? 'Choose a username' : 'Your username'}
                className={inputClasses}
                required
              />
            </div>

            <div>
              <label htmlFor="password" className={labelClasses}>
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className={inputClasses}
                required
                minLength={6}
              />
            </div>

            {mode === 'signUp' && (
              <div className="animate-fade-in">
                <label htmlFor="confirmPassword" className={labelClasses}>
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputClasses}
                  required
                />
              </div>
            )}

            {error && (
              <div
                role="alert"
                className={`rounded-lg px-4 py-3 text-sm font-medium border ${
                  isHighContrast
                    ? 'bg-red-900/40 border-red-500/50 text-red-200'
                    : 'bg-deep-red/10 border-deep-red/40 text-deep-red'
                }`}
              >
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting
                ? 'Please wait…'
                : mode === 'signIn' ? 'Sign In' : 'Start Learning'}
            </Button>
          </form>

          <p className={`text-center text-xs mt-6 ${isHighContrast ? 'text-slate-400' : 'text-dark-green/50'}`}>
            {mode === 'signUp'
              ? 'Your progress is saved to your account and follows you across devices.'
              : 'New here? Create an account to save your progress.'}
          </p>
        </div>
      </div>
    </div>
  );
};
