import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDownLeft, ArrowUpRight, Banknote, Plus, Repeat, ShoppingBag, Sparkles, Trophy, Wand2 } from 'lucide-react'
import { CountUp, Modal, PageHead, SimTag } from '../components/common/ui'
import { sgd } from '../lib/format'
import type { WalletTx } from '../data/demo-account'
import { useStore } from '../store/store'

const ICONS: Record<WalletTx['kind'], typeof Banknote> = {
  return: Repeat,
  resale: ArrowDownLeft,
  creator: Sparkles,
  drop: Sparkles,
  purchase: ShoppingBag,
  withdraw: ArrowUpRight,
  challenge: Trophy,
  topup: Plus,
  transform: Wand2,
}

export default function WalletPage() {
  const { state, balance, withdraw, addDemoFunds } = useStore()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const earnings = state.wallet.filter((t) => t.amount > 0 && t.kind !== 'topup')
  const bySource = [
    { l: 'Returns', v: earnings.filter((t) => t.kind === 'return').reduce((s, t) => s + t.amount, 0) },
    { l: 'Resale', v: earnings.filter((t) => t.kind === 'resale').reduce((s, t) => s + t.amount, 0) },
    { l: 'Creator & transformation', v: earnings.filter((t) => t.kind === 'creator' || t.kind === 'transform').reduce((s, t) => s + t.amount, 0) },
  ]
  const maxSrc = Math.max(1, ...bySource.map((b) => b.v))

  return (
    <div className="container page">
      <PageHead eyebrow="Circular Wallet" title="RE:PLAY Cash" subtitle="Money earned from returns, resale and transformations — spend it on the next drop or cash it out." right={<SimTag>Demo / simulated balance</SimTag>} />

      <div className="grid stack-md" style={{ gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: 16 }}>
        <div className="card card-dark card-pad stack gap16">
          <div className="row between">
            <span className="eyebrow" style={{ color: '#A68BC9' }}>Available RE:PLAY Cash</span>
            <span className="tiny mono muted">SIMULATED · NO REAL FUNDS</span>
          </div>
          <div style={{ fontSize: 64, fontWeight: 850, letterSpacing: '-0.045em', lineHeight: 1 }}>
            <CountUp value={balance} format={(n) => sgd(Math.round(n * 100) / 100, 2)} />
          </div>
          <div className="grid g2" style={{ gap: 8 }}>
            <button className="btn btn-light" onClick={() => setOpen(true)}>
              <Banknote size={15} /> Withdraw
            </button>
            <button className="btn btn-dark-outline" onClick={() => nav('/discover')}>
              <ShoppingBag size={15} /> Spend
            </button>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ color: '#C3B0E2', alignSelf: 'flex-start' }} onClick={addDemoFunds}>
            <Plus size={13} /> Add S$50 demo funds
          </button>
        </div>

        <div className="card card-pad stack gap12">
          <div className="card-title">Where your money came from</div>
          {bySource.map((b) => (
            <div key={b.l}>
              <div className="row between small">
                <span className="muted">{b.l}</span>
                <b className="num">{sgd(Math.round(b.v * 100) / 100, 2)}</b>
              </div>
              <div className="bar accent mt8" style={{ height: 6 }}>
                <span style={{ width: `${(b.v / maxSrc) * 100}%` }} />
              </div>
            </div>
          ))}
          <div className="small muted" style={{ marginTop: 'auto' }}>
            Every dollar here came from giving a product another life.
          </div>
        </div>
      </div>

      <div className="card mt16">
        <div className="card-head">
          <div className="card-title">Transactions</div>
          <span className="small muted">{state.wallet.length} records</span>
        </div>
        <div>
          {state.wallet.map((t, i) => {
            const Icon = ICONS[t.kind] ?? Banknote
            return (
              <div key={t.id} className={`tx-row ${i === 0 ? 'tx-new' : ''}`}>
                <span className={`tx-ic ${t.amount > 0 ? 'pos' : ''}`}>
                  <Icon size={16} />
                </span>
                <div>
                  <div className="strong">{t.label}</div>
                  <div className="small muted">
                    {t.detail} · {new Date(t.date).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
                <b className={`num ${t.amount > 0 ? 'up' : ''}`} style={{ fontSize: 15 }}>
                  {t.amount > 0 ? '+' : '−'}
                  {sgd(Math.abs(t.amount), 2)}
                </b>
              </div>
            )
          })}
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Withdraw RE:PLAY Cash">
        <div className="stack gap12">
          <p className="muted small">Simulated transfer to DBS ••• 4821. No real money moves in this prototype.</p>
          <div className="field">
            <label htmlFor="withdraw-amount">
              Amount <span className="muted">max {sgd(balance, 2)}</span>
            </label>
            <input id="withdraw-amount" className="input" type="number" min={0} step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
          </div>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-outline" onClick={() => setAmount(String(balance))}>
              Max
            </button>
            <button
              className="btn btn-primary"
              disabled={!Number(amount) || Number(amount) > balance}
              onClick={() => {
                withdraw(Math.round(Number(amount) * 100) / 100)
                setAmount('')
                setOpen(false)
              }}
            >
              Withdraw {Number(amount) ? sgd(Number(amount), 2) : ''}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
