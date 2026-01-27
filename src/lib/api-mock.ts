// Mock API data for styling-only development mode
// This is used when running without backend/database

export const mockApi = {
  // Mock markets data
  markets: [
    {
      id: 1,
      market_id: 'market-team-champion',
      short_name: 'One Eye Open Team Champion',
      symbol: 'TEAM',
      max_winners: 1,
      min_winners: 1,
      created_date: Date.now(),
    },
    {
      id: 2,
      market_id: 'market-round-1',
      short_name: 'Round 1 Over/Under',
      symbol: 'R1',
      max_winners: 1,
      min_winners: 1,
      created_date: Date.now(),
    },
  ],

  // Mock outcomes for team champion
  teamChampionOutcomes: [
    { id: 1, outcome_id: 'outcome-1', name: 'Loop & Boose', ticker: 'LOOP-BOOSE', market_id: 'market-team-champion', strike: '0', settled_price: null, created_date: Date.now() },
    { id: 2, outcome_id: 'outcome-2', name: 'Krass & TK', ticker: 'KRASS-TK', market_id: 'market-team-champion', strike: '0', settled_price: null, created_date: Date.now() },
    { id: 3, outcome_id: 'outcome-3', name: 'CTH & Avayou', ticker: 'CTH-AVAYOU', market_id: 'market-team-champion', strike: '0', settled_price: null, created_date: Date.now() },
    { id: 4, outcome_id: 'outcome-4', name: 'Alex & Huffman', ticker: 'ALEX-HUFFMAN', market_id: 'market-team-champion', strike: '0', settled_price: null, created_date: Date.now() },
    { id: 5, outcome_id: 'outcome-5', name: 'Jon & Tim', ticker: 'JON-TIM', market_id: 'market-team-champion', strike: '0', settled_price: null, created_date: Date.now() },
    { id: 6, outcome_id: 'outcome-6', name: 'Doc & Will', ticker: 'DOC-WILL', market_id: 'market-team-champion', strike: '0', settled_price: null, created_date: Date.now() },
  ],

  // Mock orderbook data - DETERMINISTIC for stable testing
  // Prices are whole numbers 1-99 dollars (100-9900 cents)
  // Gap between best bid and best ask is always 2 dollars (200 cents)
  // Each outcome gets a fixed price based on its index for consistency
  generateOrderbook: (outcomeId?: string) => {
    // Use outcome ID to generate consistent prices for each outcome
    // This ensures the same outcome always has the same orderbook prices
    const outcomeIndex = outcomeId 
      ? parseInt(outcomeId.replace(/\D/g, '')) || 1 // Extract number from outcome-1, outcome-2, etc.
      : 1;
    
    // Generate deterministic base price based on outcome index (10-90 dollar range)
    // Each outcome gets a different but consistent price
    const basePriceDollars = 10 + ((outcomeIndex - 1) * 15) % 80; // Cycles through 10-90 range
    const basePriceCents = basePriceDollars * 100; // Convert to cents
    
    // Best bid is 1 dollar below base, best ask is 1 dollar above base (2 dollar gap)
    const bestBid = basePriceCents - 100; // 1 dollar below
    const bestAsk = basePriceCents + 100; // 1 dollar above (2 dollar gap from bid)
    
    const bids = [
      { id: outcomeIndex * 10 + 1, price: bestBid, contract_size: 10, side: 0, status: 'open' as const },
      { id: outcomeIndex * 10 + 2, price: bestBid - 100, contract_size: 15, side: 0, status: 'open' as const }, // 1 dollar lower
      { id: outcomeIndex * 10 + 3, price: bestBid - 200, contract_size: 20, side: 0, status: 'open' as const }, // 2 dollars lower
    ];
    const asks = [
      { id: outcomeIndex * 10 + 4, price: bestAsk, contract_size: 10, side: 1, status: 'open' as const },
      { id: outcomeIndex * 10 + 5, price: bestAsk + 100, contract_size: 15, side: 1, status: 'open' as const }, // 1 dollar higher
      { id: outcomeIndex * 10 + 6, price: bestAsk + 200, contract_size: 20, side: 1, status: 'open' as const }, // 2 dollars higher
    ];
    return { bids, asks };
  },
};
