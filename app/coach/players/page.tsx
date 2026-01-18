'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabase } from '@/lib/supabase';

type PlayerRow = {
  id: string;
  first_name: string;
  last_name: string;
  dominant_hand: 'right' | 'left';
  level: string | null;
};

export default function CoachPlayers() {
  const supabase = useMemo(() => getBrowserSupabase(), []);
  const router = useRouter();
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>('');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      const { data: prof } = await supabase.from('users_profile').select('role').eq('user_id', user.id).single();
      if (prof?.role !== 'coach') {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('players')
        .select('id, first_name, last_name, dominant_hand, level')
        .order('last_name');

      if (error) setErr(error.message);
      setPlayers(data ?? []);
      setLoading(false);
    })();
  }, [supabase, router]);

  const filtered = players.filter(p => {
    const name = `${p.first_name} ${p.last_name}`.toLowerCase();
    return name.includes(q.toLowerCase());
  });

  return (
    <div className="container">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Players</h1>
        <Link href="/coach" className="badge">← Back</Link>
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search players" />
        </div>
        <Link href="/coach/players/new"><button>+ Add Player</button></Link>
      </div>

      {loading ? <p>Loading...</p> : null}
      {err ? <p>{err}</p> : null}

      <div style={{ marginTop: 12 }}>
        {filtered.map(p => (
          <div key={p.id} className="card" style={{ marginBottom: 10 }}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{p.first_name} {p.last_name}</strong>{' '}
                <span className="badge">{p.dominant_hand === 'right' ? 'R' : 'L'}</span>
                {p.level ? <span className="badge" style={{ marginLeft: 8 }}>{p.level}</span> : null}
              </div>
              <span className="small">Editing coming next</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
