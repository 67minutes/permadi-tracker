import { useState, useEffect, useMemo } from 'react'
import { PLAN } from './data.js'

const STORAGE_KEY = 'permadi-progress-v1'
const DAY_STORAGE_KEY = 'permadi-today-v1'
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
const SESSION_BY_ID = new Map(ALL.map(s => [s.id, s]))
const INDEX_BY_ID = new Map(ALL.map((s, i) => [s.id, i]))
const DAY_PACKETS = buildDayPackets()
const ANKI_SLOT = { id: 'ANKI', t: 'Clear Anki queue to zero', time: 'daily' }

function loadDay() {
  try {
    const raw = localStorage.getItem(DAY_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function buildDayPackets() {
  const packets = []
  for (let i = 0; i < ALL.length; i += 1) {
    const A = ALL[i]
    if (isHeavy(A)) {
      packets.push([A.id])
      continue
    }

    const B = ALL[i + 1]
    if (B && !isHeavy(B)) {
      packets.push([A.id, B.id])
      i += 1
    } else {
      packets.push([A.id])
    }
  }
  return packets
}

function buildDay(done) {
  const ids = DAY_PACKETS.find(packet => packet.some(id => !done[id]))
  return { ids: ids ? [...ids] : [], ankiDone: false }
}

function isDayComplete(day, done) {
  return day.ids.length > 0 && day.ids.every(id => done[id]) && day.ankiDone
}

function normalizeDay(day, done) {
  if (!day || !Array.isArray(day.ids) || day.ids.length === 0) return buildDay(done)

  const ids = day.ids.filter(id => SESSION_BY_ID.has(id))
  if (ids.length !== day.ids.length) return buildDay(done)

  const firstDayIndex = Math.min(...ids.map(id => INDEX_BY_ID.get(id)))
  const firstOpenIndex = ALL.findIndex(s => !done[s.id])
  if (firstOpenIndex !== -1 && firstOpenIndex < firstDayIndex) return buildDay(done)

  const normalized = { ids, ankiDone: !!day.ankiDone }
  return isDayComplete(normalized, done) ? buildDay(done) : normalized
}

export default function App() {
  const [tracker, setTracker] = useState(() => {
    const done = loadState()
    return { done, day: normalizeDay(loadDay(), done) }
  })
  const { done, day } = tracker

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(done))
      localStorage.setItem(DAY_STORAGE_KEY, JSON.stringify(day))
    } catch { /* private mode */ }
  }, [done, day])

  const toggle = id => setTracker(current => {
    const done = { ...current.done, [id]: !current.done[id] }
    return { done, day: normalizeDay(current.day, done) }
  })
  const toggleAnki = () => setTracker(current => {
    const day = normalizeDay(current.day, current.done)
    const nextDay = { ...day, ankiDone: !day.ankiDone }
    return { done: current.done, day: normalizeDay(nextDay, current.done) }
  })
  const reset = () => {
    if (confirm('Clear all check-offs? Your Anki cards are safe — this only resets the tracker.')) {
      setTracker({ done: {}, day: buildDay({}) })
    }
  }

  const ppDone = useMemo(
    () => ALL.filter(s => done[s.id]).reduce((a, b) => a + b.pp, 0),
    [done]
  )
  const pct = Math.round((ppDone / TOTAL_PP) * 100)

  // ---- Today: keep the active packet until its sessions and Anki are done ----
  const today = useMemo(() => {
    const sessions = day.ids.map(id => SESSION_BY_ID.get(id)).filter(Boolean)
    if (sessions.length === 0) return { finished: true }
    const [A, B] = sessions
    if (A.tags.includes('BUFFER')) return { A, mode: 'buffer', ankiDone: day.ankiDone }
    if (A.tags.includes('MATH')) return { A, mode: 'mathOnly', ankiDone: day.ankiDone }
    return { A, B, mode: 'normal', ankiDone: day.ankiDone }
  }, [day])

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
        <TodayCard today={today} done={done} onToggle={toggle} onToggleAnki={toggleAnki} />

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

function TodayCard({ today, done, onToggle, onToggleAnki }) {
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
      <Slot label="Session A" sess={today.A} done={!!done[today.A.id]} onToggle={() => onToggle(today.A.id)} />
      {today.mode === 'normal' && today.B &&
        <Slot label="Session B" sess={today.B} done={!!done[today.B.id]} onToggle={() => onToggle(today.B.id)} />}
      {today.mode === 'normal' && !today.B &&
        <div className="slot-note">Session B — next box is heavy, so it's tomorrow's A. Tonight: Anki only.</div>}
      {today.mode === 'mathOnly' &&
        <div className="slot-note">No Session B — this <b>MATH</b> box is the whole new-material quota today.</div>}
      {today.mode === 'buffer' &&
        <div className="slot-note">No new boxes — this consolidation <b>is</b> the day.</div>}
      <Slot label="Session C" sess={ANKI_SLOT} done={today.ankiDone} onToggle={onToggleAnki} />
    </div>
  )
}

function Slot({ label, sess, done, onToggle }) {
  return (
    <div className={'slot' + (done ? ' done' : '')} onClick={onToggle} role="button" tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onToggle()
        }
      }}>
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
