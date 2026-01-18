'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getBrowserSupabase } from '@/lib/supabase';

export default function LoginPage() {
  const supabase = useMemo(() => getBrowserSupabase(), []);
  const router = useRouter();
  const params = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    const justConfirmed = params.get('confirmed');
    if (justConfirmed) setStatus('You are logged in.');

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('users_profile')
        .select('role')
        .eq('user_id', session.user.id)
        .maybeSingle();

      console.log('role lookup', { data, error, userId: session.user.id });

      if (error) {
        setStatus(
          `Logged in, but I can't find your profile yet. Ask the coach to finish setup. (${error.message})`
        );
        return;
      }

      if (data?.role === 'coach') router.push('/coach');
      else if (data?.role === 'player') router.push('/player');
      else setStatus('Logged in, but your role is not set yet.');
    });

    return () => subscription.unsubscribe();
  }, [supabase, router, params]);

  async function signInPassword() {
    setStatus('Signing in...');

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setStatus(error.message);
      return;
    }

    setStatus('Signed in. Loading your account...');
  }

  async function sendMagicLink() {
    setStatus('Sending magic link...');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/login?confirmed=1` },
    });
    if (error) setStatus(error.message);
    else setStatus('Check your email for the sign-in link.');
  }

  async function signUp() {
    setStatus('Creating account...');
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setStatus(error.message);
    else setStatus('Account created. If email confirmation is on, check your inbox, then log in.');
  }

  return (
    <div className="container" style={{ maxWidth: 520 }}>
      <h1>Tennis Evaluations</h1>

      <div className="card">
        <p className="small">
          Coaches and players log in here. You can use email+password or a magic link.
        </p>

        <div className="row">
          <div style={{ flex: 1, minWidth: 240 }}>
            <label>Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div style={{ flex: 1, minWidth: 240 }}>
            <label>Password (optional for magic link)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
        </div>

        <div className="row" style={{ marginTop: 12 }}>
          <button onClick={signInPassword}>Log in (password)</button>
          <button className="secondary" onClick={sendMagicLink}>
            Email me a magic link
          </button>
          <button className="secondary" onClick={signUp}>
            Sign up (coach only)
          </button>
        </div>

        {status ? <p style={{ marginTop: 12 }}>{status}</p> : null}
      </div>

      <p className="small" style={{ marginTop: 12 }}>
        If you are a player and you just signed up, the coach still needs to connect your login
        to your player profile.
      </p>
    </div>
  );
}
