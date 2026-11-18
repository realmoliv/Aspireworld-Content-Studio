import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface AuthViewProps {
  onBypassDemo?: () => void;
}

export function AuthView({ onBypassDemo }: AuthViewProps) {
  const { signIn, signUp, isSupabaseConfigured } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (!fullName.trim()) {
          setErrorMessage('Full name is required.');
          setLoading(false);
          return;
        }
        const { error } = await signUp(email, password, fullName);
        if (error) {
          setErrorMessage(error.message);
        } else {
          setSuccessMessage('Account created! Please check your email to confirm, or sign in.');
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          setErrorMessage(error.message);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="drawer-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div 
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: '4px',
          width: '100%',
          maxWidth: '28rem',
          padding: 'var(--space-5)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>
          <img 
            src="/aspire-globe.svg" 
            alt="Aspire World" 
            style={{ width: '3rem', height: '3rem', margin: '0 auto var(--space-2)' }} 
          />
          <h2 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', letterSpacing: '0.04em', margin: 0 }}>
            ASPIRE WORLD
          </h2>
          <span style={{ font: '600 0.75rem Barlow Condensed', letterSpacing: '0.15em', color: 'var(--grey)' }}>
            CONTENT STUDIO AUTHENTICATION
          </span>
        </div>

        {!isSupabaseConfigured && (
          <div 
            style={{
              background: 'rgba(252, 13, 18, 0.1)',
              border: '1px solid var(--red)',
              padding: 'var(--space-3)',
              borderRadius: '4px',
              marginBottom: 'var(--space-4)',
              fontSize: '0.85rem',
            }}
          >
            <strong style={{ color: 'var(--red)', display: 'block', marginBottom: '0.25rem' }}>
              SUPABASE SETUP REQUIRED
            </strong>
            <p style={{ margin: '0 0 var(--space-2) 0', color: 'var(--grey)' }}>
              To enable database authentication, create a <code>.env</code> file in the project root with your Supabase credentials:
            </p>
            <pre 
              style={{ 
                background: 'var(--surface-2)', 
                padding: 'var(--space-2)', 
                borderRadius: '4px', 
                fontSize: '0.75rem',
                overflowX: 'auto',
                color: '#fff',
                marginBottom: 'var(--space-2)'
              }}
            >
              VITE_SUPABASE_URL=https://...
              <br />
              VITE_SUPABASE_ANON_KEY=eyJ...
            </pre>
            {onBypassDemo && (
              <button 
                type="button"
                onClick={onBypassDemo}
                className="btn btn-secondary"
                style={{ width: '100%', fontSize: '0.8rem', padding: '0.5rem' }}
              >
                Continue in Local / Demo Mode →
              </button>
            )}
          </div>
        )}

        {isSupabaseConfigured && (
          <>
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              <button
                type="button"
                className={`btn ${mode === 'signin' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => { setMode('signin'); setErrorMessage(''); setSuccessMessage(''); }}
              >
                SIGN IN
              </button>
              <button
                type="button"
                className={`btn ${mode === 'signup' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => { setMode('signup'); setErrorMessage(''); setSuccessMessage(''); }}
              >
                CREATE ACCOUNT
              </button>
            </div>

            {errorMessage && (
              <div 
                style={{
                  background: 'rgba(252, 13, 18, 0.15)',
                  borderLeft: '3px solid var(--red)',
                  padding: 'var(--space-2)',
                  marginBottom: 'var(--space-3)',
                  fontSize: '0.85rem',
                  color: '#ff8888',
                }}
              >
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div 
                style={{
                  background: 'rgba(40, 167, 69, 0.15)',
                  borderLeft: '3px solid #28a745',
                  padding: 'var(--space-2)',
                  marginBottom: 'var(--space-3)',
                  fontSize: '0.85rem',
                  color: '#85e89d',
                }}
              >
                {successMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {mode === 'signup' && (
                <label className="field">
                  <span>FULL NAME <b>REQUIRED</b></span>
                  <input
                    type="text"
                    required
                    className="input"
                    placeholder="e.g. Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </label>
              )}

              <label className="field">
                <span>EMAIL ADDRESS <b>REQUIRED</b></span>
                <input
                  type="email"
                  required
                  className="input"
                  placeholder="name@aspireworld.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>

              <label className="field">
                <span>PASSWORD <b>REQUIRED</b></span>
                <input
                  type="password"
                  required
                  className="input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ marginTop: 'var(--space-2)', padding: '0.75rem' }}
              >
                {loading ? 'AUTHENTICATING...' : mode === 'signin' ? 'SIGN IN TO STUDIO' : 'REGISTER ACCOUNT'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
