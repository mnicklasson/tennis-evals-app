'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabase } from '@/lib/supabase';

export default function CoachDashboard() {
  const supabase = useMemo(() => getBrowserSupabase(), []);
  const router = useRouter();
  const [coachEmail, setCoachEmail] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setCoachEmail(user.email ?? '');

      const { data, error } = await supabase.from('users_profile').select('role').eq('user_id', user.id).single();
      if (error || data?.role !== 'coach') {
        router.push('/login');
        return;
      }
    })();
  }, [supabase, router]);

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <div className="container">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Coach</h1>
        <div className="row" style={{ alignItems: 'center' }}>
          <span className="badge">{coachEmail}</span>
          <button className="secondary" onClick={signOut}>Sign out</button>
        </div>
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <Link href="/coach/players" className="card" style={{ display: 'block', minWidth: 260 }}>
          <h3 style={{ marginTop: 0 }}>Players</h3>
          <p className="small">Add/edit players and link their logins.</p>
        </Link>
        <Link href="#" className="card" style={{ display: 'block', minWidth: 260, opacity: 0.6 }}>
          <h3 style={{ marginTop: 0 }}>New Evaluation</h3>
          <p className="small">Coming next: create session, pick focus, fill evaluation form.</p>
        </Link>
        <Link href="#" className="card" style={{ display: 'block', minWidth: 260, opacity: 0.6 }}>
          <h3 style={{ marginTop: 0 }}>Club Settings</h3>
          <p className="small">Logo + Venmo handle (coming next).</p>
        </Link>
      </div>

      {status ? <p>{status}</p> : null}
    </div>
  );
}
