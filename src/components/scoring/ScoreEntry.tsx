import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { Round, RoundScore } from '../../types';

interface ScoreEntryProps {
  round: Round;
  onUpdate?: () => void;
}

export function ScoreEntry({ round, onUpdate }: ScoreEntryProps) {
  const [crossScore, setCrossScore] = useState<string>('');
  const [netScore, setNetScore] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [currentScore, setCurrentScore] = useState<RoundScore | null>(null);

  useEffect(() => {
    loadCurrentScore();
  }, [round.id]);

  async function loadCurrentScore() {
    try {
      const { scores } = await api.getRounds({ roundId: round.id });
      if (scores && scores.length > 0) {
        const myScore = scores.find((s: RoundScore) => s.user_id === (window as any).__user?.id);
        if (myScore) {
          setCurrentScore(myScore);
          setCrossScore(myScore.cross_score?.toString() || '');
          setNetScore(myScore.net_score?.toString() || '');
        }
      }
    } catch (err) {
      console.error('Failed to load current score:', err);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      await api.updateScore(round.id, {
        cross_score: crossScore ? parseInt(crossScore, 10) : null,
        net_score: netScore ? parseInt(netScore, 10) : null,
      });
      await loadCurrentScore();
      onUpdate?.();
    } catch (err: any) {
      alert(err.message || 'Failed to update score');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 border border-gray-300 dark:border-gray-600 rounded-lg">
      <h2 className="text-xl font-semibold mb-4">{round.name}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">CROSS Score</label>
            <input
              type="number"
              min="1"
              value={crossScore}
              onChange={(e) => setCrossScore(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              placeholder="Enter CROSS score"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">NET Score</label>
            <input
              type="number"
              min="1"
              value={netScore}
              onChange={(e) => setNetScore(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              placeholder="Enter NET score"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Score'}
        </button>
      </form>

      {currentScore && (
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Last updated: {new Date(currentScore.updated_at * 1000).toLocaleString()}
        </div>
      )}
    </div>
  );
}
