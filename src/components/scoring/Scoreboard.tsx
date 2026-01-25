import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { Round, RoundScore } from '../../types';
import { format } from 'date-fns';

interface ScoreboardProps {
  tripId?: string;
  roundId?: string;
}

export function Scoreboard({ tripId, roundId }: ScoreboardProps) {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [selectedRound, setSelectedRound] = useState<Round | null>(null);
  const [scores, setScores] = useState<RoundScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRounds();
  }, [tripId]);

  useEffect(() => {
    if (selectedRound) {
      loadScores(selectedRound.id);
    }
  }, [selectedRound]);

  async function loadRounds() {
    setLoading(true);
    try {
      const params: any = {};
      if (tripId) params.tripId = tripId;
      if (roundId) params.roundId = roundId;
      const data = await api.getRounds(params);
      if (data.rounds) {
        setRounds(data.rounds);
        const activeRound = data.rounds.find((r: Round) => r.is_active === 1);
        if (activeRound) {
          setSelectedRound(activeRound);
        } else if (data.rounds.length > 0) {
          setSelectedRound(data.rounds[0]);
        }
      } else if (data.round) {
        setSelectedRound(data.round);
        if (data.scores) {
          setScores(data.scores);
        }
      }
    } catch (err) {
      console.error('Failed to load rounds:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadScores(roundId: string) {
    try {
      const { scores } = await api.getRounds({ roundId });
      if (scores) {
        setScores(scores);
      }
    } catch (err) {
      console.error('Failed to load scores:', err);
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading scoreboard...</div>;
  }

  const sortedScores = [...scores].sort((a, b) => {
    if (a.cross_score === null && b.cross_score === null) return 0;
    if (a.cross_score === null) return 1;
    if (b.cross_score === null) return -1;
    return a.cross_score - b.cross_score;
  });

  return (
    <div className="space-y-4">
      {rounds.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {rounds.map((round) => (
            <button
              key={round.id}
              onClick={() => setSelectedRound(round)}
              className={`px-4 py-2 rounded-md ${
                selectedRound?.id === round.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
              }`}
            >
              {round.name}
              {round.is_active === 1 && ' (Active)'}
            </button>
          ))}
        </div>
      )}

      {selectedRound && (
        <div>
          <h2 className="text-xl font-semibold mb-4">
            {selectedRound.name} - {format(new Date(selectedRound.date * 1000), 'MMM d, yyyy')}
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-300 dark:border-gray-600">
                  <th className="text-left p-2">Rank</th>
                  <th className="text-left p-2">Player</th>
                  <th className="text-right p-2">CROSS</th>
                  <th className="text-right p-2">NET</th>
                </tr>
              </thead>
              <tbody>
                {sortedScores.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center p-4 text-gray-500 dark:text-gray-400">
                      No scores yet
                    </td>
                  </tr>
                ) : (
                  sortedScores.map((score, index) => (
                    <tr
                      key={score.id}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <td className="p-2 font-medium">{index + 1}</td>
                      <td className="p-2">{score.display_name || score.email}</td>
                      <td className="p-2 text-right">
                        {score.cross_score !== null ? score.cross_score : '-'}
                      </td>
                      <td className="p-2 text-right">
                        {score.net_score !== null ? score.net_score : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
