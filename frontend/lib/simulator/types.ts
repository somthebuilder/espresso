export type SimulatorTrack = 'product' | 'growth' | 'leadership' | 'strategy' | 'mixed'

export type ProfileWeights = {
  speedVsDepth: number
  shortVsLong: number
  riskVsConviction: number
}

export type Layer4Static = {
  headline: string
  operatorLine: string
  whatTheyDid: string[]
  impact: string[]
  videoUrl: string | null
  takeaway: string
}

export type SimulationChoice = {
  id: string
  label: string
  feedback: {
    layer1: string
    layer2: string
    layer3: string
  }
  layer4_static: Layer4Static
  profileWeights: ProfileWeights
  /** Optional: improves embedding retrieval for “From the archive” citations */
  citationQueryHint?: string
}

/** Returned by POST /api/simulator/citations */
export type SimulatorInterviewCitation = {
  chunkId: string
  text: string
  similarity: number
  highConfidence: boolean
  guestName: string
  episodeTitle: string
  episodeUrl: string | null
  timestamp: string | null
  segmentType: string | null
  themeId: string | null
}

export type SimulationRound = {
  prompt: string
  choices: SimulationChoice[]
}

export type SimulationDefinitionRow = {
  id: string
  podcast_id: string
  slug: string
  track: SimulatorTrack
  title: string
  teaser: string | null
  cover_emoji: string | null
  rounds: SimulationRound[]
  estimated_minutes: number
  published: boolean
  display_order: number
  created_at: string
}

export type RunAnswer = {
  roundIndex: number
  choiceId: string
  at: string
}

export type SimulationRunRow = {
  id: string
  user_key: string
  simulation_id: string
  status: 'in_progress' | 'completed'
  current_round_index: number
  answers: RunAnswer[]
  llm_summary: string | null
  llm_profile: LlmProfile | null
  llm_citations: LlmCitationsPayload | null
  copilot_input: string | null
  copilot_output: CopilotOutput | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

export type LlmProfile = {
  headline: string
  speedVsDepth: string
  shortVsLong: string
  riskVsConviction: string
  blindspots: string[]
  copilotNudge: string
}

export type CopilotOutput = {
  howToApproach: string[]
  whatToDo: string[]
  tradeoffs: string[]
  whatNotToDo: string[]
  profileNudge: string
}

export type LlmCitationConfidence = 'high' | 'medium' | 'low'

export type LlmCitation = {
  roundIndex: number
  choiceId: string
  guestName: string
  episodeTitle: string
  episodeUrl: string | null
  timestamp: string | null
  quote: string
  confidence: LlmCitationConfidence
}

export type LlmCitationsPayload = {
  citations: LlmCitation[]
  hasHighConfidence: boolean
}
