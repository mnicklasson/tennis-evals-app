'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getBrowserSupabase } from '@/lib/supabase';

type SessionRow = {
  id: string;
  date: string;
  play_format: 'practice' | 'singles' | 'doubles';
  coach_mode: 'on_court' | 'off_court';
  location_name: string | null;
  opponent_name: string | null;
};

export default function PlayerInbox() {
  const supabase = useMemo(() => getBrowserSupabase(), []);
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>('');
  const [email, setEmail] = useState<string>('');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setEmail(user.email ?? '');
      const { data: prof } = await supabase.from('users_profile').select('role').eq('user_id', user.id).single();
      if (prof?.role !== 'player') {
        router.push('/login');
        return;
      }

      // This select relies on RLS to only return sessions this player is allowed to see.
      const { data, error } = await supabase
        .from('sessions')
        .select('id, date, play_format, coach_mode, location_name, opponent_name')
        .order('date', { ascending: false });

      if (error) setErr(error.message);
      setSessions(data ?? []);
      setLoading(false);
    })();
  }, [supabase, router]);

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <div className="container">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>My Evaluations</h1>
        <div className="row" style={{ alignItems: 'center' }}>
          <span className="badge">{email}</span>
          <button className="secondary" onClick={signOut}>Sign out</button>
        </div>
      </div>

      {loading ? <p>Loading...</p> : null}
      {err ? <p>{err}</p> : null}

      <div style={{ marginTop: 12 }}>
        {sessions.map(s => (
          <Link key={s.id} href={`/player/evaluations/${s.id}`} style={{ textDecoration: 'none' }}>
            <div className="card" style={{ marginBottom: 10 }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>{s.date}</strong>
                <span className="badge">{s.coach_mode === 'on_court' ? 'On-court' : 'Off-court'}</span>
                <span className="badge">{s.play_format}</span>
              </div>
              <div className="small" style={{ marginTop: 6 }}>
                {s.location_name ? `Location: ${s.location_name}` : ''}
                {s.opponent_name ? ` • Opponent: ${s.opponent_name}` : ''}
              </div>
            </div>
          </Link>
        ))}

        {sessions.length === 0 && !loading ? (
          <div className="card">
            <p style={{ margin: 0 }}>No evaluations yet.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
