import useStore from '../../store/useStore';
import FIMetricsCards  from './FIMetricsCards';
import FIInputsPanel   from './FIInputsPanel';
import FIScenarioPanel from './FIScenarioPanel';
import CPFLifePanel    from './CPFLifePanel';
import PortfolioValueChart from './PortfolioValueChart';
import PassiveIncomeChart  from './PassiveIncomeChart';

export default function FIForecastPage() {
  const swrPct = useStore((s) => s.fi_settings.swr_pct ?? 4);

  return (
    <div className="flex flex-col gap-6">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">FI Forecast</h1>
        <p className="text-sm text-gray-500">
          Passive income estimated at <strong>{swrPct}% SWR</strong> on your investable portfolio.
          Adjust inputs and explore your path to financial independence.
        </p>
      </div>

      {/* ── 1. Current snapshot ───────────────────────────────────────────────
           Investable portfolio → passive income → FI gap → projected FI year.
           Answers: "where am I right now?"                                   */}
      <FIMetricsCards />

      {/* ── 2. Plan inputs + FI scenario ─────────────────────────────────────
           Left: adjustable inputs (target income, SWR, savings ↔ age link).
           Right: projected FI year, progress bar, monthly gap.
           Answers: "what am I targeting and when do I get there?"            */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FIInputsPanel />
        <FIScenarioPanel />
      </div>

      {/* ── 3. CPF LIFE estimate ─────────────────────────────────────────────
           Separate income source — not portfolio-based, kicks in at 65.
           Answers: "how much does CPF boost my retirement income?"
           Placed before charts so the CPF line in chart 2 makes sense.      */}
      <CPFLifePanel />

      {/* ── 4. Portfolio value chart ──────────────────────────────────────────
           Shows portfolio growing toward FI target.
           After retirement: contributions stop, drawdown begins — clearly
           visible as the growth slope changes (or portfolio declines).
           Answers: "how does my portfolio behave over time?"                 */}
      <PortfolioValueChart />

      {/* ── 5. Monthly passive income chart ──────────────────────────────────
           Shows passive income (portfolio × SWR / 12) growing over the years.
           At age 65: CPF LIFE payout creates a visible step-up on the line.
           Target income shown as a horizontal line — income crosses it at FI.
           Answers: "when does my income reach what I need, and how does
                     CPF contribute from age 65?"                             */}
      <PassiveIncomeChart />

    </div>
  );
}
