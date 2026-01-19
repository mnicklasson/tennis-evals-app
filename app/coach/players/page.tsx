'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getBrowserSupabase } from '@/lib/supabase';

type PlayerRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  level: string | null;
};

export default function PlayersPage() {
  const supabase = useMemo(() => getBrowserSupabase(), []);
  const router = useRouter();

  const [status, setStatus] = useState('');
  const [players, setPlayers] = useState<PlayerRow[]>([]);

  useEffect(() => {
    (async () => {
      setStatus('Loading...');

      // Must be logged in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Must be coach + get club_id
      const { data: prof, error: profErr } = await supabase
        .from('users_profile')
        .select('role, club_id')
        .eq('user_id', user.id)
        .single();

      if (profErr) {
        setStatus(profErr.message);
        return;
      }

      if (prof?.role !== 'coach') {
        router.push('/login');
        return;
      }

      if (!prof?.club_id) {
        setStatus('Your account is missing a club. Ask admin to set your club.');
        return;
      }

      // Load players for this club
      const { data, error } = await supabase
        .from('players')
        .select('id, first_name, last_name, level')
        .eq('club_id', prof.club_id)
        .order('last_name', { ascending: true });

      if (error) {
        setStatus(error.message);
        return;
      }

      setPlayers((data ?? []) as PlayerRow[]);
      setStatus('');
    })();
  }, [supabase, router]);

  async function deletePlayer(id: string) {
    const ok = confirm('Delete this player? This cannot be undone.');
    if (!ok) return;

    setStatus('Deleting...');

    const { error } = await supabase.from('players').delete().eq('id', id);

    if (error) {
      setStatus(error.message);
      return;
    }

    setPlayers((prev) => prev.filter((p) => p.id !== id));
    setStatus('');
  }


  return (
    <div className="container" style={{ maxWidth: 820 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Players</h1>
        <Link href="/coach/players/new" className="badge">+ Add Player</Link>
      </div>

      {status ? <p style={{ marginTop: 12 }}>{status}</p> : null}

      <div className="card" style={{ marginTop: 12 }}>
        {players.length === 0 ? (
          <p className="small">No players found yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {players.map((p) => (
              <div
                key={p.id}
                className="row"
                style={{ justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {(p.first_name ?? '') + ' ' + (p.last_name ?? '')}
                  </div>
                  {p.level ? <div className="small">Level: {p.level}</div> : null}
                </div>

                <div className="row" style={{ gap: 8 }}>
  <Link className="badge" href={`/coach/players/${p.id}/edit`}>Edit</Link>

  <button
  className="secondary"
  disabled={status === 'Deleting...'}
  onClick={() => deletePlayer(p.id)}
>
  Delete
</button>
</div>

              </div>
            ))}
          </div>
        )}
      </div>

      <p className="small" style={{ marginTop: 12 }}>
        Tip: Click Edit to update a player.
      </p>
    </div>
  );
}
