'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Eye, Flame, Heart, Pause, Play, RotateCcw, Shuffle, Snowflake, Sparkles, Trophy, Timer, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

type Card = { id: number; emoji: string; matched: boolean; revealed: boolean }
type Level = { label: string; rows: number; cols: number; pairs: number }

const levels: Level[] = [
  { label: 'Warm up', rows: 4, cols: 4, pairs: 8 },
  { label: 'Brain boost', rows: 4, cols: 5, pairs: 10 },
  { label: 'Memory flex', rows: 6, cols: 6, pairs: 18 },
  { label: 'Monster mode', rows: 6, cols: 8, pairs: 24 },
]

const emojis = ['🍓', '🦊', '🌈', '🍄', '🐸', '🌻', '🧁', '🪐', '🍉', '🐝', '🧸', '🎨', '🌙', '🍋', '🦄', '🍀', '🐳', '🍒', '⭐', '🎈', '🦋', '🍩', '🌵', '🐙']
const niceMessages = ['Nice! 🔥', 'Nailed it! ✨', 'Great find! 🌟', 'That was smooth!']
const closeMessages = ['So close 😭', 'Almost! Keep going', 'Tricky one!', 'Not this time']

function shuffled<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5)
}

function makeCards(levelIndex: number, randomize = true): Card[] {
  const level = levels[levelIndex]
  const pairSet = [...emojis.slice(0, level.pairs), ...emojis.slice(0, level.pairs)]
  return (randomize ? shuffled(pairSet) : pairSet).map((emoji, id) => ({ id, emoji, matched: false, revealed: false }))
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0')
  const secs = (seconds % 60).toString().padStart(2, '0')
  return `${mins}:${secs}`
}

export default function Page() {
  const [levelIndex, setLevelIndex] = useState(0)
  const [cards, setCards] = useState(() => makeCards(0, false))
  const [flipped, setFlipped] = useState<number[]>([])
  const [moves, setMoves] = useState(0)
  const [matches, setMatches] = useState(0)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(1240)
  const [seconds, setSeconds] = useState(0)
  const [countdown, setCountdown] = useState(3)
  const [message, setMessage] = useState('Get ready...')
  const [isStarted, setIsStarted] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isWon, setIsWon] = useState(false)
  const [challenge, setChallenge] = useState(true)
  const [lives, setLives] = useState(3)
  const [powerUps, setPowerUps] = useState({ peek: 1, freeze: 2, shuffle: 2 })
  const [frozen, setFrozen] = useState(false)

  const level = levels[levelIndex]
  const accuracy = moves ? Math.round((matches / moves) * 100) : 100
  const progress = Math.round((matches / level.pairs) * 100)

  const startGame = useCallback((nextLevel = levelIndex) => {
    setLevelIndex(nextLevel)
    setCards(makeCards(nextLevel))
    setFlipped([]); setMoves(0); setMatches(0); setCombo(0); setMaxCombo(0); setScore(0); setSeconds(0)
    setCountdown(3); setMessage('Get ready...'); setIsStarted(false); setIsPaused(false); setIsWon(false); setLives(3)
    setPowerUps({ peek: 1, freeze: 2, shuffle: 2 })
  }, [levelIndex])

  useEffect(() => {
    if (countdown <= 0) { setIsStarted(true); setMessage('Find your pairs!'); return }
    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 750)
    return () => window.clearTimeout(timer)
  }, [countdown])

  useEffect(() => {
    if (!isStarted || isPaused || isWon || frozen) return
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [isStarted, isPaused, isWon, frozen])

  useEffect(() => {
    if (isWon && score > bestScore) setBestScore(score)
  }, [isWon, score, bestScore])

  const finishIfWon = useCallback((nextMatches: number) => {
    if (nextMatches !== level.pairs) return
    setIsWon(true)
    setMessage('Memory monster unlocked 🧠🏆')
    setBestScore((best) => Math.max(best, score))
  }, [level.pairs, score])

  const flipCard = (id: number) => {
    if (!isStarted || isPaused || isWon || flipped.length >= 2) return
    const card = cards.find((item) => item.id === id)
    if (!card || card.matched || card.revealed) return
    const nextFlipped = [...flipped, id]
    setCards((current) => current.map((item) => item.id === id ? { ...item, revealed: true } : item))
    setFlipped(nextFlipped)
    if (nextFlipped.length !== 2) return

    setMoves((value) => value + 1)
    const first = cards.find((item) => item.id === nextFlipped[0])
    const second = card
    if (first?.emoji === second.emoji) {
      const nextCombo = combo + 1
      const gained = 100 + nextCombo * 25 + Math.max(0, 60 - seconds)
      const nextMatches = matches + 1
      setCards((current) => current.map((item) => nextFlipped.includes(item.id) ? { ...item, matched: true } : item))
      setMatches(nextMatches); setCombo(nextCombo); setMaxCombo((value) => Math.max(value, nextCombo)); setScore((value) => value + gained)
      setMessage(nextMatches === level.pairs - 1 ? 'ONE MORE! 🔥' : nextCombo > 1 ? `${nextCombo}x COMBO!` : niceMessages[Math.floor(Math.random() * niceMessages.length)])
      setFlipped([])
      finishIfWon(nextMatches)
    } else {
      setCombo(0)
      setMessage(closeMessages[Math.floor(Math.random() * closeMessages.length)])
      if (challenge) setLives((value) => Math.max(0, value - 1))
      window.setTimeout(() => {
        setCards((current) => current.map((item) => nextFlipped.includes(item.id) ? { ...item, revealed: false } : item))
        setFlipped([])
      }, 700)
    }
  }

  const usePeek = () => {
    if (!powerUps.peek || !isStarted || isPaused) return
    setPowerUps((value) => ({ ...value, peek: value.peek - 1 }))
    setCards((current) => current.map((item) => item.matched ? item : { ...item, revealed: true }))
    window.setTimeout(() => setCards((current) => current.map((item) => item.matched ? item : { ...item, revealed: false })), 1200)
  }
  const useFreeze = () => {
    if (!powerUps.freeze || !isStarted || isPaused || frozen) return
    setPowerUps((value) => ({ ...value, freeze: value.freeze - 1 })); setFrozen(true); setMessage('Time frozen! ❄️')
    window.setTimeout(() => setFrozen(false), 5000)
  }
  const useShuffle = () => {
    if (!powerUps.shuffle || !isStarted || isPaused) return
    setPowerUps((value) => ({ ...value, shuffle: value.shuffle - 1 })); setCards((current) => shuffled(current))
    setMessage('Mixing it up! 🔀')
  }

  const gridClass = useMemo(() => `grid-cols-${level.cols}`, [level.cols])

  return (
    <main className="min-h-screen overflow-hidden bg-[#fff8f0] text-[#25213a]">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-5 sm:px-8 sm:py-8">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-[#5c49d8] text-2xl shadow-[0_6px_0_#4231ac]">🧠</div>
            <div><p className="text-lg font-black tracking-tight">Memory Monster</p><p className="text-xs font-bold text-[#908a9e]">A tiny brain workout</p></div>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-black shadow-sm"><Trophy className="size-4 text-[#f5ad3d]" /> Best <span className="text-[#5c49d8]">{bestScore.toLocaleString()}</span></div>
        </header>

        <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 py-7 sm:py-10">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div><div className="mb-3 flex items-center gap-2"><span className="rounded-full bg-[#ffe6b8] px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#9a641e]">Level {levelIndex + 1}</span><span className="text-sm font-bold text-[#908a9e]">{level.label}</span></div><h1 className="text-4xl font-black tracking-[-0.05em] sm:text-6xl">Find your <span className="text-[#f06b59]">match.</span></h1><p className="mt-2 max-w-md text-sm font-semibold leading-6 text-[#817b8c]">Flip two cards at a time. Build a combo, beat your best, and become a memory monster.</p></div>
            <div className="flex items-center gap-2"><button type="button" onClick={() => setIsPaused((value) => !value)} className="game-button secondary"><Pause className="size-4" /> {isPaused ? 'Resume' : 'Pause'}</button><button type="button" onClick={() => startGame()} className="game-button secondary"><RotateCcw className="size-4" /> Restart</button></div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[['Score', score.toLocaleString(), 'text-[#5c49d8]'], ['Moves', moves.toString().padStart(2, '0'), 'text-[#f06b59]'], ['Time', formatTime(seconds), 'text-[#35a889]'], ['Accuracy', `${accuracy}%`, 'text-[#f0a42e]']].map(([label, value, color]) => <div key={label} className="rounded-2xl border border-[#f0e4da] bg-white px-4 py-3 shadow-[0_4px_0_#f0e4da]"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#a49cac]">{label}</p><p className={cn('mt-1 text-xl font-black', color)}>{value}</p></div>)}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#25213a] px-4 py-3 text-white shadow-[0_6px_0_#ded3c9] sm:px-5"><div className="flex items-center gap-3"><div className="flex items-center gap-1">{[0, 1, 2].map((heart) => <Heart key={heart} className={cn('size-5 fill-current', heart < lives ? 'text-[#f06b59]' : 'text-[#554e6b]')} />)}</div><span className="h-5 w-px bg-white/15" /><Flame className="size-4 text-[#ffb647]" /><span className="text-sm font-black">{combo}x combo</span></div><div className="flex items-center gap-2 text-sm font-bold text-[#d8d2e8]"><span className="hidden sm:inline">Progress</span><div className="h-2 w-28 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[#72d8b4] transition-all" style={{ width: `${progress}%` }} /></div><span>{matches}/{level.pairs}</span></div><div className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-black">{message}</div></div>

          <div className={cn('game-board rounded-[28px] border-4 border-white bg-[#f2e8ff] p-3 shadow-[0_12px_0_#ded3c9] sm:p-5', gridClass)} style={{ ['--cols' as string]: level.cols }}>
            {cards.map((card) => <button type="button" aria-label={card.revealed || card.matched ? `Revealed ${card.emoji}` : 'Hidden card'} key={card.id} onClick={() => flipCard(card.id)} className={cn('memory-card', card.revealed || card.matched ? 'is-revealed' : '', card.matched ? 'is-matched' : '')}><span className="card-face card-front">✦</span><span className="card-face card-back">{card.emoji}</span></button>)}
            {countdown > 0 && <div className="countdown-overlay"><p className="text-sm font-black uppercase tracking-[0.25em] text-white/70">Get ready</p><p className="text-8xl font-black text-white">{countdown}</p></div>}
            {isWon && <div className="victory-overlay"><div className="victory-card"><div className="mb-3 text-5xl">🏆</div><p className="text-sm font-black uppercase tracking-[0.2em] text-[#f06b59]">Level complete</p><h2 className="mt-1 text-4xl font-black tracking-tight">Memory monster unlocked!</h2><div className="my-5 grid grid-cols-2 gap-2 text-left"><div className="stat-chip"><span>Score</span><b>{score.toLocaleString()}</b></div><div className="stat-chip"><span>Time</span><b>{formatTime(seconds)}</b></div><div className="stat-chip"><span>Moves</span><b>{moves}</b></div><div className="stat-chip"><span>Max combo</span><b>{maxCombo}x</b></div></div><div className="flex flex-col gap-2 sm:flex-row"><button type="button" onClick={() => startGame()} className="game-button primary flex-1 justify-center"><RotateCcw className="size-4" /> Play again</button>{levelIndex < levels.length - 1 && <button type="button" onClick={() => startGame(levelIndex + 1)} className="game-button accent flex-1 justify-center">Next level <span>→</span></button>}</div></div></div>}
          </div>

          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row"><div className="flex items-center gap-2"><span className="text-xs font-black uppercase tracking-[0.18em] text-[#a49cac]">Power-ups</span><button type="button" onClick={usePeek} disabled={!powerUps.peek} className="power-button"><Eye className="size-4" /> Peek <b>{powerUps.peek}</b></button><button type="button" onClick={useFreeze} disabled={!powerUps.freeze} className="power-button"><Snowflake className="size-4" /> Freeze <b>{powerUps.freeze}</b></button><button type="button" onClick={useShuffle} disabled={!powerUps.shuffle} className="power-button"><Shuffle className="size-4" /> Shuffle <b>{powerUps.shuffle}</b></button></div><label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-[#817b8c]"><input type="checkbox" checked={challenge} onChange={(event) => setChallenge(event.target.checked)} className="size-4 accent-[#5c49d8]" /> Challenge mode <span className="text-[#f06b59]">♥</span></label></div>
          <div className="flex items-center justify-center gap-2 pt-1 text-xs font-bold text-[#a49cac]"><Sparkles className="size-3 text-[#f5ad3d]" /> Match pairs to build your streak <Zap className="size-3 text-[#f06b59]" /></div>
        </section>
      </div>
    </main>
  )
}
