export const canUseMockCandidates =
  process.env.NODE_ENV === 'development' ||
  process.env.NEXT_PUBLIC_ENABLE_MOCK_CANDIDATES === 'true'
