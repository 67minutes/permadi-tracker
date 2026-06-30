import { useState, useEffect, useMemo } from 'react'
import { PLAN } from './data.js'

const STORAGE_KEY = 'permadi-progress-v1'
const ALL = PLAN.flatMap(p => p.sessions)
const TOTAL_PP = ALL.reduce((s, x) => s + x.pp, 0)

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

const CHIP_CLASS = { KEY: 'c-key', MATH: 'c-math', FAST: 'c-fast', BUFFER: 'c-buf' }
const isHeavy = s => s.tags.includes('MATH') || s.tags.includes('BUFFER')

export default function App() {
  const [done, setDone] = useState(loadState)

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(done)) } catch { /* private mode */ }
  }, [done])

  const toggle = id => setDone(d => ({ ...d, [id]: !d[id] }))
  const reset = () => {
    if (confirm('Clear all check-offs? Your Anki cards are safe — this only resets the tracker.')) setDone({})
  }

  const ppDone = useMemo(
    () => ALL.filter(s => done[s.id]).reduce((a, b) => a + b.pp, 0),
    [done]
  )
  const pct = Math.round((ppDone / TOTAL_PP) * 100)

  // ---- Today: compute Session A / B from the queue ----
  const today = useMemo(() => {
    const queue = ALL.filter(s => !done[s.id])
    if (queue.length === 0) return { finished: true }
    const A = queue[0]
    if (A.tags.includes('BUFFER')) return { A, mode: 'buffer' }
    if (A.tags.includes('MATH')) return { A, mode: 'mathOnly' }
    const next = queue[1]
    const B = next && !isHeavy(next) ? next : null
    return { A, B, mode: 'normal' }
  }, [done])

  return (
    <>
      <header>
        <div className="hrow">
          <div className="title">Permadi · Reservoir Engineering
            <small>spaced-repetition drill plan</small>
          </div>
          <div className="depth">drilled <b>{ppDone}</b> / {TOTAL_PP} pp<br />
            <span className="pct mono">{pct}%</span>
          </div>
        </div>
        <div className="gauge"><div className="gauge-fill" style={{ right: `${100 - pct}%` }} /></div>
      </header>

      <div className="wrap">
        <TodayCard today={today} onToggle={toggle} />

        {PLAN.map(ph => {
          const total = ph.sessions.length
          const d = ph.sessions.filter(s => done[s.id]).length
          return (
            <div className="phase" key={ph.n}>
              <div className="phase-head">
                <span className="phase-num">{ph.n}</span>
                <span className="phase-name">{ph.name}</span>
                <span className="phase-prog mono">{d}/{total}</span>
              </div>
              {ph.sessions.map(s => (
                <Session key={s.id} s={s} done={!!done[s.id]} onToggle={toggle} />
              ))}
            </div>
          )
        })}

        {pct >= 100 && <div className="done-banner">TD reached. You absorbed the whole formation. ▼</div>}

        <footer>
          <button className="reset" onClick={reset}>reset progress</button>
        </footer>
      </div>
    </>
  )
}

function TodayCard({ today, onToggle }) {
  if (today.finished) {
    return (
      <div className="today">
        <h2>Today</h2>
        <p className="today-done">Nothing queued — you reached total depth. ▼ Keep clearing Anki.</p>
      </div>
    )
  }
  return (
    <div className="today">
      <h2>Today</h2>
      <Slot label="Session A" sess={today.A} onToggle={onToggle} />
      {today.mode === 'normal' && today.B &&
        <Slot label="Session B" sess={today.B} onToggle={onToggle} />}
      {today.mode === 'normal' && !today.B &&
        <div className="slot-note">Session B — next box is heavy, so it's tomorrow's A. Tonight: Anki only.</div>}
      {today.mode === 'mathOnly' &&
        <div className="slot-note">No Session B — this <b>MATH</b> box is the whole new-material quota today.</div>}
      {today.mode === 'buffer' &&
        <div className="slot-note">No new boxes — this consolidation <b>is</b> the day.</div>}
      <div className="anki-line">↻ Then clear your <b>Anki queue</b> — the one number that must hit zero daily.</div>
    </div>
  )
}

function Slot({ label, sess, onToggle }) {
  return (
    <div className="slot" onClick={() => onToggle(sess.id)} role="button" tabIndex={0}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onToggle(sess.id)}>
      <div className="box" aria-hidden>✓</div>
      <div>
        <div className="slot-label">{label} · <span className="mono">{sess.id}</span> · {sess.time}</div>
        <div className="slot-title">{sess.t}</div>
      </div>
    </div>
  )
}

function Session({ s, done, onToggle }) {
  return (
    <div className={'sess' + (done ? ' done' : '')} onClick={() => onToggle(s.id)}
      role="button" tabIndex={0}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onToggle(s.id)}>
      <div className="box" aria-hidden>✓</div>
      <div className="body">
        <div className="id mono">{s.id}</div>
        <div className="stitle">{s.t}</div>
        <div className="saction">{s.a}</div>
        <div className="chips">
          <span className="chip c-time">{s.time}{s.pp ? ` · ${s.pp}pp` : ''}</span>
          {s.tags.map(t => <span key={t} className={'chip ' + CHIP_CLASS[t]}>{t}</span>)}
        </div>
      </div>
    </div>
  )
}
