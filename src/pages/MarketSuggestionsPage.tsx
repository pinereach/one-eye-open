import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../lib/api';
import { ToastContainer, useToast } from '../components/ui/Toast';
import { useAuth } from '../hooks/useAuth';

export function MarketSuggestionsPage() {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [tbSubmitting, setTbSubmitting] = useState(false);
  const { toasts, showToast, removeToast } = useToast();

  // Round O/U specific state
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [selectedParticipant, setSelectedParticipant] = useState<string>('');
  const [strike, setStrike] = useState<string>('');
  const [participants, setParticipants] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [outcomes, setOutcomes] = useState<Array<{ name: string; ticker: string; strike: string }>>([]);

  // Total Birdies specific state (round-agnostic, whole event)
  const [tbParticipant, setTbParticipant] = useState<string>('');
  const [tbStrike, setTbStrike] = useState<string>('');
  const [tbOutcomes, setTbOutcomes] = useState<Array<{ name: string; ticker: string; strike: string }>>([]);

  // Head-to-Head matchup state
  const [h2hParticipant1, setH2hParticipant1] = useState<string>('');
  const [h2hParticipant2, setH2hParticipant2] = useState<string>('');
  const [h2hOutcomes, setH2hOutcomes] = useState<Array<{ name: string; ticker: string; strike: string }>>([]);
  const [h2hSubmitting, setH2hSubmitting] = useState(false);

  if (user && !user.view_market_creation) {
    return <Navigate to="/markets" replace />;
  }

  // Load participants on mount
  useEffect(() => {
    async function loadParticipants() {
      setLoadingParticipants(true);
      try {
        const { participants: participantsData } = await api.getParticipants();
        // Participants have id and name fields
        const mappedParticipants = (participantsData || []).map((p: any) => ({
          id: p.id || p.name, // Use id if available, fallback to name
          name: p.name,
        }));
        setParticipants(mappedParticipants);
      } catch (err) {
        console.error('Failed to load participants:', err);
        // Silently fail - don't show toast on mount
      } finally {
        setLoadingParticipants(false);
      }
    }
    loadParticipants();
  }, []); // Empty dependency array - only run once on mount


  // Generate Round O/U outcome when participant, round, and strike are filled
  useEffect(() => {
    if (selectedParticipant && roundNumber && strike.trim()) {
      const participant = participants.find(p => p.id === selectedParticipant);
      if (participant) {
        const participantName = participant.name;
        const overName = `${participantName} Over ${strike.trim()} - Round ${roundNumber}`;
        
        // Generate ticker (e.g., "AK-OV-R2-86.5")
        const initials = participantName.split(' ').map(n => n[0]).join('').toUpperCase();
        const overTicker = `${initials}-OV-R${roundNumber}-${strike.trim().replace('.', '_')}`;
        
        setOutcomes([
          { name: overName, ticker: overTicker, strike: strike.trim() },
        ]);
      }
    } else {
      setOutcomes([]);
    }
  }, [selectedParticipant, roundNumber, strike, participants]);

  // Generate Total Birdies outcome when participant and strike are filled (no round)
  useEffect(() => {
    if (tbParticipant && tbStrike.trim()) {
      const participant = participants.find(p => p.id === tbParticipant);
      if (participant) {
        const participantName = participant.name;
        const overName = `${participantName} Over ${tbStrike.trim()} - Total Birdies`;
        const initials = participantName.split(' ').map(n => n[0]).join('').toUpperCase();
        const overTicker = `${initials}-OV-${tbStrike.trim().replace('.', '_')}`;
        setTbOutcomes([
          { name: overName, ticker: overTicker, strike: tbStrike.trim() },
        ]);
      }
    } else {
      setTbOutcomes([]);
    }
  }, [tbParticipant, tbStrike, participants]);

  // Slug for ticker/outcome_id: full name in order so "Alex Over Avayou" ≠ "Avayou Over Alex"
  const nameToSlug = (name: string) =>
    name.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toUpperCase() || 'X';

  // Generate Head-to-Head outcome when both participants are selected (and different): only "Participant1 Over Participant2"
  useEffect(() => {
    if (h2hParticipant1 && h2hParticipant2 && h2hParticipant1 !== h2hParticipant2) {
      const p1 = participants.find(p => p.id === h2hParticipant1);
      const p2 = participants.find(p => p.id === h2hParticipant2);
      if (p1 && p2) {
        const name1 = p1.name;
        const name2 = p2.name;
        const slug1 = nameToSlug(name1);
        const slug2 = nameToSlug(name2);
        setH2hOutcomes([
          { name: `${name1} Over ${name2}`, ticker: `${slug1}-OV-${slug2}`, strike: '' },
        ]);
      }
    } else {
      setH2hOutcomes([]);
    }
  }, [h2hParticipant1, h2hParticipant2, participants]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // Validate required fields
    if (!selectedParticipant || !roundNumber || !strike.trim()) {
      showToast('Please fill in all required fields (Participant, Round, and Strike)', 'error');
      setSubmitting(false);
      return;
    }

    if (outcomes.length !== 1) {
      showToast('Please ensure outcome is generated correctly', 'error');
      setSubmitting(false);
      return;
    }

    const participant = participants.find(p => p.id === selectedParticipant);
    if (!participant) {
      showToast('Invalid participant selected', 'error');
      setSubmitting(false);
      return;
    }

    // Generate market name and symbol (just the round, not participant-specific)
    const shortName = `Round ${roundNumber} Over/Under`;
    const symbol = `R${roundNumber}OU`;

    try {
      await api.suggestMarket({
        short_name: shortName,
        symbol,
        max_winners: 1,
        min_winners: 1,
        round_number: roundNumber,
        outcomes: outcomes.map(o => ({
          name: o.name.trim(),
          ticker: o.ticker.trim(),
          strike: o.strike.trim() || undefined,
        })),
      });

      showToast('Market suggestion submitted successfully!', 'success');
      // Reset form
      setRoundNumber(1);
      setSelectedParticipant('');
      setStrike('');
      setOutcomes([]);
    } catch (err: any) {
      console.error('Failed to submit market suggestion:', err);
      showToast(err.message || 'Failed to submit market suggestion', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitTotalBirdies = async (e: React.FormEvent) => {
    e.preventDefault();
    setTbSubmitting(true);
    if (!tbParticipant || !tbStrike.trim()) {
      showToast('Please fill in Participant and Strike', 'error');
      setTbSubmitting(false);
      return;
    }
    if (tbOutcomes.length !== 1) {
      showToast('Please ensure outcome is generated correctly', 'error');
      setTbSubmitting(false);
      return;
    }
    const participant = participants.find(p => p.id === tbParticipant);
    if (!participant) {
      showToast('Invalid participant selected', 'error');
      setTbSubmitting(false);
      return;
    }
    try {
      await api.suggestMarket({
        short_name: 'Total Birdies',
        symbol: 'BIRDIES',
        max_winners: 1,
        min_winners: 1,
        outcomes: tbOutcomes.map(o => ({
          name: o.name.trim(),
          ticker: o.ticker.trim(),
          strike: o.strike.trim() || undefined,
        })),
      });
      showToast('Total Birdies suggestion submitted successfully!', 'success');
      setTbParticipant('');
      setTbStrike('');
      setTbOutcomes([]);
    } catch (err: any) {
      console.error('Failed to submit Total Birdies suggestion:', err);
      showToast(err.message || 'Failed to submit suggestion', 'error');
    } finally {
      setTbSubmitting(false);
    }
  };

  const handleSubmitH2H = async (e: React.FormEvent) => {
    e.preventDefault();
    setH2hSubmitting(true);
    if (!h2hParticipant1 || !h2hParticipant2 || h2hParticipant1 === h2hParticipant2) {
      showToast('Please select two different participants', 'error');
      setH2hSubmitting(false);
      return;
    }
    if (h2hOutcomes.length !== 1) {
      showToast('Please ensure the outcome is generated', 'error');
      setH2hSubmitting(false);
      return;
    }
    const p1 = participants.find(p => p.id === h2hParticipant1);
    const p2 = participants.find(p => p.id === h2hParticipant2);
    if (!p1 || !p2) {
      showToast('Invalid participant selected', 'error');
      setH2hSubmitting(false);
      return;
    }
    const shortName = `${p1.name} Over ${p2.name}`;
    const symbol = `H2H-${p1.name.split(' ').map(n => n[0]).join('')}-${p2.name.split(' ').map(n => n[0]).join('')}`.replace(/\s/g, '').toUpperCase().slice(0, 12);
    const slug1 = nameToSlug(p1.name);
    const slug2 = nameToSlug(p2.name);
    try {
      await api.suggestMarket({
        short_name: shortName,
        symbol: symbol || 'H2H',
        max_winners: 1,
        min_winners: 1,
        outcomes: h2hOutcomes.map(o => ({
          name: o.name.trim(),
          ticker: o.ticker.trim(),
          strike: o.strike.trim() || undefined,
          outcome_id: `outcome-h2h-${slug1}-${slug2}`,
        })),
      });
      showToast('Head-to-Head suggestion submitted successfully!', 'success');
      setH2hParticipant1('');
      setH2hParticipant2('');
      setH2hOutcomes([]);
    } catch (err: any) {
      console.error('Failed to submit Head-to-Head suggestion:', err);
      showToast(err.message || 'Failed to submit suggestion', 'error');
    } finally {
      setH2hSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <h1 className="text-xl sm:text-2xl font-bold">Market Suggestions</h1>
      <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
        Create Round Over/Under, Total Birdies, or Head-to-Head matchup outcomes.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Round Over/Under Quick Create */}
        <div className="bg-gray-50 dark:bg-gray-800 p-4 sm:p-6 rounded-lg space-y-4">
          <h2 className="text-lg sm:text-xl font-bold">Round Over/Under Market</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Create a Round Over/Under outcome by selecting a participant, round, and strike.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="round_number" className="block text-sm font-medium mb-1.5">
                Round # <span className="text-red-500">*</span>
              </label>
              <select
                id="round_number"
                value={roundNumber}
                onChange={(e) => setRoundNumber(parseInt(e.target.value, 10))}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm sm:text-base"
              >
                <option value={1}>Round 1</option>
                <option value={2}>Round 2</option>
                <option value={3}>Round 3</option>
                <option value={4}>Round 4</option>
                <option value={5}>Round 5</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="participant" className="block text-sm font-medium mb-1.5">
                Participant <span className="text-red-500">*</span>
              </label>
              <select
                id="participant"
                value={selectedParticipant}
                onChange={(e) => setSelectedParticipant(e.target.value)}
                required
                disabled={loadingParticipants}
                className="w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 min-h-[44px] touch-manipulation disabled:opacity-50"
              >
                <option value="">Select participant...</option>
                {participants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="strike" className="block text-sm font-medium mb-1.5">
                Strike <span className="text-red-500">*</span>
              </label>
              <input
                id="strike"
                type="text"
                value={strike}
                onChange={(e) => setStrike(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm sm:text-base"
                placeholder="e.g., 86.5"
              />
            </div>
          </div>
          
          {selectedParticipant && roundNumber && strike.trim() && outcomes.length === 1 && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                Generated Outcome:
              </p>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                {outcomes.map((outcome, idx) => (
                  <li key={idx}>• {outcome.name} ({outcome.ticker})</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base font-medium touch-manipulation"
          >
            {submitting ? 'Submitting...' : 'Submit Round O/U'}
          </button>
        </div>
      </form>

      {/* Total Birdies (round-agnostic, whole event) */}
      <form onSubmit={handleSubmitTotalBirdies} className="space-y-4 sm:space-y-6">
        <div className="bg-gray-50 dark:bg-gray-800 p-4 sm:p-6 rounded-lg space-y-4">
          <h2 className="text-lg sm:text-xl font-bold">Total Birdies Market</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Create a Total Birdies outcome for the whole event (all rounds). Select participant and strike.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="tb_participant" className="block text-sm font-medium mb-1.5">
                Participant <span className="text-red-500">*</span>
              </label>
              <select
                id="tb_participant"
                value={tbParticipant}
                onChange={(e) => setTbParticipant(e.target.value)}
                required
                disabled={loadingParticipants}
                className="w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 min-h-[44px] touch-manipulation disabled:opacity-50"
              >
                <option value="">Select participant...</option>
                {participants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="tb_strike" className="block text-sm font-medium mb-1.5">
                Strike (birdies) <span className="text-red-500">*</span>
              </label>
              <input
                id="tb_strike"
                type="text"
                value={tbStrike}
                onChange={(e) => setTbStrike(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm sm:text-base"
                placeholder="e.g., 3"
              />
            </div>
          </div>
          {tbParticipant && tbStrike.trim() && tbOutcomes.length === 1 && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                Generated Outcome:
              </p>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                {tbOutcomes.map((outcome, idx) => (
                  <li key={idx}>• {outcome.name} ({outcome.ticker})</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={tbSubmitting}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base font-medium touch-manipulation"
          >
            {tbSubmitting ? 'Submitting...' : 'Submit Total Birdies'}
          </button>
        </div>
      </form>

      {/* Head-to-Head Matchup */}
      <form onSubmit={handleSubmitH2H} className="space-y-4 sm:space-y-6">
        <div className="bg-gray-50 dark:bg-gray-800 p-4 sm:p-6 rounded-lg space-y-4">
          <h2 className="text-lg sm:text-xl font-bold">Head-to-Head Matchup</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Create a matchup market: Participant 1 Over Participant 2. Select two participants; the first is &quot;Over&quot; the second.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="h2h_participant1" className="block text-sm font-medium mb-1.5">
                Participant 1 (Over) <span className="text-red-500">*</span>
              </label>
              <select
                id="h2h_participant1"
                value={h2hParticipant1}
                onChange={(e) => setH2hParticipant1(e.target.value)}
                required
                disabled={loadingParticipants}
                className="w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 min-h-[44px] touch-manipulation disabled:opacity-50"
              >
                <option value="">Select participant...</option>
                {participants.map((p) => (
                  <option key={p.id} value={p.id} disabled={p.id === h2hParticipant2}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="h2h_participant2" className="block text-sm font-medium mb-1.5">
                Participant 2 <span className="text-red-500">*</span>
              </label>
              <select
                id="h2h_participant2"
                value={h2hParticipant2}
                onChange={(e) => setH2hParticipant2(e.target.value)}
                required
                disabled={loadingParticipants}
                className="w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 min-h-[44px] touch-manipulation disabled:opacity-50"
              >
                <option value="">Select participant...</option>
                {participants.map((p) => (
                  <option key={p.id} value={p.id} disabled={p.id === h2hParticipant1}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {h2hOutcomes.length === 1 && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                Generated outcome:
              </p>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                {h2hOutcomes.map((outcome, idx) => (
                  <li key={idx}>• {outcome.name} ({outcome.ticker})</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={h2hSubmitting || h2hOutcomes.length !== 1}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base font-medium touch-manipulation"
          >
            {h2hSubmitting ? 'Submitting...' : 'Submit Head-to-Head'}
          </button>
        </div>
      </form>
    </div>
  );
}
