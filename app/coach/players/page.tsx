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
  archived_at?: string | null;
};


export default function PlayersPage() {
  const supabase = useMemo(() => getBrowserSupabase(), []);
  const router = useRouter();

  const [status, setStatus] = useState('');
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [showArchived, setShowArchived] = useState(false);

    useEffect(() => {
    (async () => {
      setStatus('Loading...');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

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

      const q = supabase
        .from('players')
        .select('id, first_name, last_name, level, archived_at')
        .eq('club_id', prof.club_id);

      const { data, error } = showArchived
        ? await q.order('last_name', { ascending: true })
        : await q.is('archived_at', null).order('last_name', { ascending: true });

      if (error) {
        setStatus(error.message);
        return;
      }

      setPlayers((data ?? []) as PlayerRow[]);
      setStatus('');
    })();
  }, [supabase, router, showArchived]);

  async function archivePlayer(id: string) {
    const ok = confirm('Archive this player? You can restore them later.');
    if (!ok) return;

    setStatus('Archiving...');

    const now = new Date().toISOString();

    const { error } = await supabase
      .from('players')
      .update({ archived_at: now })
      .eq('id', id);

    if (error) {
      setStatus(error.message);
      return;
    }

    // If not showing archived, remove it from the active list immediately
    if (!showArchived) {
      setPlayers((prev) => prev.filter((p) => p.id !== id));
    } else {
      setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, archived_at: now } : p)));
    }

    setStatus('');
  }

  async function restorePlayer(id: string) {
    setStatus('Restoring...');

    const { error } = await supabase
      .from('players')
      .update({ archived_at: null })
      .eq('id', id);

    if (error) {
      setStatus(error.message);
      return;
    }

    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, archived_at: null } : p)));
    setStatus('');
  }


  return (
    <div className="container" style={{ maxWidth: 820 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
  <h1 style={{ margin: 0 }}>Players</h1>

  <div className="row" style={{ gap: 12, alignItems: 'center' }}>
    <label className="small" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <input
        type="checkbox"
        checked={showArchived}
        onChange={(e) => setShowArchived(e.target.checked)}
      />
      Show archived
    </label>

    <Link href="/coach/players/new" className="badge">+ Add Player</Link>
  </div>
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

  {p.archived_at ? (
  <button className="secondary" onClick={() => restorePlayer(p.id)}>
    Restore
  </button>
) : (
  <button className="secondary" onClick={() => archivePlayer(p.id)}>
    Archive
  </button>
)}

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
