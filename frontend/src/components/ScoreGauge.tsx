import type { ScoreBreakdown } from '../lib/types'

type ScoreGaugeProps = {
  score: ScoreBreakdown
}

export function ScoreGauge({ score }: ScoreGaugeProps) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const dash = (score.total / 100) * circumference

  return (
    <section className="panel score-panel" aria-label="综合评分">
      <div className="gauge-wrap">
        <svg viewBox="0 0 140 140" className="gauge" role="img" aria-label={`综合评分 ${score.total}`}>
          <circle cx="70" cy="70" r={radius} className="gauge-track" />
          <circle
            cx="70"
            cy="70"
            r={radius}
            className="gauge-value"
            strokeDasharray={`${dash} ${circumference - dash}`}
          />
        </svg>
        <div className="gauge-number">
          <strong>{score.total}</strong>
          <span>综合分</span>
        </div>
      </div>
      <div className="score-grid">
        <Metric label="技术" value={score.technical} />
        <Metric label="估值" value={score.valuation} />
        <Metric label="资金" value={score.capital} />
        <Metric label="风险" value={score.risk} />
      </div>
    </section>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <div className="bar" aria-hidden="true">
        <i style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}
