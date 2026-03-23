import type { ProfileWeights, SimulationRound } from './types'

export function aggregateWeights(
  rounds: SimulationRound[],
  answers: { roundIndex: number; choiceId: string }[]
): ProfileWeights {
  const sum: ProfileWeights = { speedVsDepth: 0, shortVsLong: 0, riskVsConviction: 0 }
  let n = 0
  for (const a of answers) {
    const round = rounds[a.roundIndex]
    if (!round) continue
    const choice = round.choices.find((c) => c.id === a.choiceId)
    if (!choice) continue
    const w = choice.profileWeights
    sum.speedVsDepth += w.speedVsDepth
    sum.shortVsLong += w.shortVsLong
    sum.riskVsConviction += w.riskVsConviction
    n += 1
  }
  if (n === 0) return { speedVsDepth: 0, shortVsLong: 0, riskVsConviction: 0 }
  return {
    speedVsDepth: sum.speedVsDepth / n,
    shortVsLong: sum.shortVsLong / n,
    riskVsConviction: sum.riskVsConviction / n,
  }
}

export function weightsToLabels(w: ProfileWeights): {
  speedVsDepth: string
  shortVsLong: string
  riskVsConviction: string
} {
  return {
    speedVsDepth: w.speedVsDepth < -0.15 ? 'Depth-first' : w.speedVsDepth > 0.15 ? 'Fast' : 'Balanced',
    shortVsLong: w.shortVsLong < -0.15 ? 'Long-term' : w.shortVsLong > 0.15 ? 'Short-term biased' : 'Balanced',
    riskVsConviction:
      w.riskVsConviction < -0.15 ? 'Risk-averse' : w.riskVsConviction > 0.15 ? 'Conviction-led' : 'Moderate',
  }
}

export function deriveBlindspots(w: ProfileWeights): string[] {
  const out: string[] = []
  if (w.speedVsDepth > 0.2) out.push('You may ship before root-cause clarity.')
  if (w.speedVsDepth < -0.2) out.push('You may slow execution while diagnosing.')
  if (w.shortVsLong > 0.2) out.push('You optimize for near-term metrics over durability.')
  if (w.shortVsLong < -0.2) out.push('You may defer wins that need speed.')
  if (w.riskVsConviction > 0.2) out.push('You may commit before evidence is sufficient.')
  if (w.riskVsConviction < -0.2) out.push('You may delay bold bets.')
  if (out.length === 0) out.push('Watch for context you did not stress-test.')
  return out.slice(0, 4)
}
