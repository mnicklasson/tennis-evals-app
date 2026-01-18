'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getBrowserSupabase } from '@/lib/supabase';

export default function NewPlayer() {
  const supabase = useMemo(() => getBrowserSupabase(), []);
  const router = useRouter();
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [level, setLevel] = useState('');
  const [hand, setHand] = useState<'right'|'left'>('right');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      const { data: prof } = await supabase.from('users_profile').select('role').eq('user_id', user.id).single();
      if (prof?.role !== 'coach') router.push('/login');
    })();
  }, [supabase, router]);

    async function save() {
    setStatus('Saving...');

    // Get the logged-in user
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      setStatus('Not logged in. Please log in again.');
      router.push('/login');
      return;
    }

    // Get your coach profile so we know your club_id
    const { data: prof, error: profErr } = await supabase
      .from('users_profile')
      .select('role, club_id')
      .eq('user_id', user.id)
      .single();

    if (profErr) {
      setStatus(profErr.message);
      return;
    }

    if (!prof?.club_id || prof.role !== 'coach') {
      setStatus('Coach account not set up correctly (missing club).');
      return;
    }

    const { error } = await supabase.from('players').insert({
      first_name: first,
      last_name: last,
      level: level || null,
      dominant_hand: hand,
      notes: notes || null,
      club_id: prof.club_id,
    });

    if (error) setStatus(error.message);
    else router.push('/coach/players');
  }



  return (
    <div className="container" style={{ maxWidth: 680 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Add Player</h1>
        <Link href="/coach/players" className="badge">← Back</Link>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="row">
          <div style={{ flex: 1, minWidth: 220 }}>
            <label>First name</label>
            <input value={first} onChange={(e) => setFirst(e.target.value)} />
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label>Last name</label>
            <input value={last} onChange={(e) => setLast(e.target.value)} />
          </div>
        </div>

        <div className="row" style={{ marginTop: 12 }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label>Dominant hand</label>
            <select value={hand} onChange={(e) => setHand(e.target.value as any)}>
              <option value="right">Right</option>
              <option value="left">Left</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label>Level (optional)</label>
            <input value={level} onChange={(e) => setLevel(e.target.value)} placeholder="e.g., 3.5" />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <label>Notes (optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
        </div>

        <div className="row" style={{ marginTop: 12 }}>
          <button onClick={save}>Save</button>
          {status ? <span style={{ alignSelf: 'center' }}>{status}</span> : null}
        </div>
      </div>

      <p className="small" style={{ marginTop: 12 }}>
        Later we can add a field here to connect the player to their login email.
      </p>
    </div>
  );
}
