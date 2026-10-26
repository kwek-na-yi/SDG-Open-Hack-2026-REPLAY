const JOURNEY = [
  { k: 'SEE', q: '“This is just an old garment.”' },
  { k: 'AI', q: '“Here are 3 things it could become.”' },
  { k: 'DISCOVER', q: '“I could turn it into this.”' },
  { k: 'VALUE', q: '“I could sell that.”' },
  { k: 'ACTION', q: '“Let’s make it.”' },
]

/** The five-step "see it → make it" story shown above the Transform flow. */
export default function Journey({ step }: { step: number }) {
  return (
    <div className="journey">
      {JOURNEY.map((j, i) => (
        <div key={j.k} className={`journey-step ${i < step ? 'done' : i === step ? 'on' : ''}`}>
          <span className="journey-k">{j.k}</span>
          <span className="journey-q">{j.q}</span>
        </div>
      ))}
    </div>
  )
}
