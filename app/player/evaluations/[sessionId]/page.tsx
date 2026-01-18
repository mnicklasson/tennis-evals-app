'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getBrowserSupabase } from '@/lib/supabase';

type Feedback = {
  id: string;
  scope: 'team' | 'individual';
  rating: number | null;
  comment: string | null;
  evaluation_items: { category: string; name: string };
};

type Suggestion = {
  id: string;
  scope: 'team' | 'individual';
  strength_text: string | null;
  priority_text: string | null;
  drill_text: string | null;
};

export default function PlayerEvaluationDetail() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const supabase = useMemo(() => getBrowserSupabase(), []);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [session, setSession] = useState<any>(null);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // RLS will block access if the player is not allowed.
      const { data: s, error: sErr } = await supabase
        .from('sessions')
        .select('id, date, coach_mode, play_format, location_name, opponent_name')
        .eq('id', sessionId)
        .single();

      if (sErr) {
        setErr(sErr.message);
        setLoading(false);
        return;
      }

      const { data: f, error: fErr } = await supabase
        .from('feedback_entries')
        .select('id, scope, rating, comment, evaluation_items(category, name)')
        .eq('session_id', sessionId)
        .order('scope', { ascending: true });

      if (fErr) setErr(fErr.message);

      const { data: sug, error: sugErr } = await supabase
        .from('suggestions')
        .select('id, scope, strength_text, priority_text, drill_text')
        .eq('session_id', sessionId)
        .order('scope', { ascending: true });

      if (sugErr) setErr(sugErr.message);

      setSession(s);
      setFeedback((f ?? []) as any);
      setSuggestions((sug ?? []) as any);
      setLoading(false);
    })();
  }, [supabase, router, sessionId]);

  const teamFeedback = feedback.filter(x => x.scope === 'team');
  const personalFeedback = feedback.filter(x => x.scope === 'individual');
  const teamSug = suggestions.filter(x => x.scope === 'team');
  const personalSug = suggestions.filter(x => x.scope === 'individual');

  return (
    <div className="container" style={{ maxWidth: 800 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Evaluation</h1>
        <Link href="/player" className="badge">← Back</Link>
      </div>

      {loading ? <p>Loading...</p> : null}
      {err ? <p>{err}</p> : null}

      {session ? (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>{session.date}</strong>
            <span className="badge">{session.coach_mode === 'on_court' ? 'On-court' : 'Off-court'}</span>
            <span className="badge">{session.play_format}</span>
          </div>
          <div className="small" style={{ marginTop: 6 }}>
            {session.location_name ? `Location: ${session.location_name}` : ''}
            {session.opponent_name ? ` • Opponent: ${session.opponent_name}` : ''}
          </div>
        </div>
      ) : null}

      {teamFeedback.length ? (
        <div style={{ marginTop: 12 }}>
          <h3 style={{ marginBottom: 8 }}>Team (shared)</h3>
          {teamFeedback.map(f => (
            <div key={f.id} className="card" style={{ marginBottom: 10 }}>
              <strong>{f.evaluation_items.name}</strong> <span className="badge">{f.evaluation_items.category}</span>
              {f.rating !== null ? <div className="small">Rating: {f.rating}</div> : null}
              {f.comment ? <p style={{ marginBottom: 0 }}>{f.comment}</p> : null}
            </div>
          ))}
          {teamSug.map(s => (
            <div key={s.id} className="card" style={{ marginBottom: 10 }}>
              <strong>Suggestions</strong>
              {s.strength_text ? <p><b>Strength:</b> {s.strength_text}</p> : null}
              {s.priority_text ? <p><b>Priority:</b> {s.priority_text}</p> : null}
              {s.drill_text ? <p style={{ marginBottom: 0 }}><b>Drill:</b> {s.drill_text}</p> : null}
            </div>
          ))}
        </div>
      ) : null}

      <div style={{ marginTop: 12 }}>
        <h3 style={{ marginBottom: 8 }}>Personal (private)</h3>
        {personalFeedback.map(f => (
          <div key={f.id} className="card" style={{ marginBottom: 10 }}>
            <strong>{f.evaluation_items.name}</strong> <span className="badge">{f.evaluation_items.category}</span>
            {f.rating !== null ? <div className="small">Rating: {f.rating}</div> : null}
            {f.comment ? <p style={{ marginBottom: 0 }}>{f.comment}</p> : null}
          </div>
        ))}

        {personalSug.map(s => (
          <div key={s.id} className="card" style={{ marginBottom: 10 }}>
            <strong>Suggestions</strong>
            {s.strength_text ? <p><b>Strength:</b> {s.strength_text}</p> : null}
            {s.priority_text ? <p><b>Priority:</b> {s.priority_text}</p> : null}
            {s.drill_text ? <p style={{ marginBottom: 0 }}><b>Drill:</b> {s.drill_text}</p> : null}
          </div>
        ))}

        {personalFeedback.length === 0 && !loading ? (
          <div className="card"><p style={{ margin: 0 }}>No personal notes were shared for this session.</p></div>
        ) : null}
      </div>
    </div>
  );
}
