import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';

export function HistoricalScoringPage() {
  const { user } = useAuth();
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [scores, setScores] = useState<Array<{ id: number; course: string; year: number; player: string; score: number | null; index_number: number | null }>>([]);
  const [handicapsByYear, setHandicapsByYear] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);
  const [averagesExpanded, setAveragesExpanded] = useState(false);
  const [averagesByYearExpanded, setAveragesByYearExpanded] = useState(false);
  const [averagesByCourseExpanded, setAveragesByCourseExpanded] = useState(false);
  const [editingCell, setEditingCell] = useState<{ key: string; value: string } | null>(null);

  const players = ['Loop', 'Boose', 'Krass', 'TK', 'CTH', 'Avayou', 'Alex', 'Huffman', 'Jon', 'Tim', 'Doc', 'Will'];

  if (user && !user.view_scores) {
    return <Navigate to="/markets" replace />;
  }

  useEffect(() => {
    loadScores();
  }, [selectedCourse, selectedYear]);

  useEffect(() => {
    api.getHandicaps('all').then((res) => setHandicapsByYear(('handicapsByYear' in res ? res.handicapsByYear : {}) ?? {})).catch(() => setHandicapsByYear({}));
  }, []);

  async function loadScores() {
    setLoading(true);
    try {
      const { scores: scoresData } = await api.getScores(
        selectedCourse !== 'all' ? selectedCourse : undefined,
        selectedYear !== 'all' ? selectedYear : undefined
      );
      setScores(scoresData || []);
    } catch (err) {
      console.error('Failed to load scores:', err);
    } finally {
      setLoading(false);
    }
  }

  type RowData = {
    course: string;
    year: number;
    [player: string]: string | number | null | undefined;
  };

  const getRowData = (): RowData[] => {
    const rowMap = new Map<string, RowData>();
    scores.forEach(score => {
      const key = `${score.course}-${score.year}`;
      if (!rowMap.has(key)) {
        rowMap.set(key, { course: score.course, year: score.year });
      }
      const row = rowMap.get(key)!;
      row[score.player] = score.score;
    });
    rowMap.forEach((row) => {
      players.forEach(player => {
        if (!(player in row)) {
          row[player] = null;
        }
      });
    });
    return Array.from(rowMap.values());
  };

  const getHandicap = (year: number, player: string) => handicapsByYear[String(year)]?.[player] ?? null;

  const historicalData = getRowData();
  const courses = Array.from(new Set(historicalData.map(d => d.course as string))).filter((c): c is string => typeof c === 'string');
  const years = Array.from(new Set(historicalData.map(d => d.year as number))).filter((y): y is number => typeof y === 'number').sort((a, b) => b - a);

  const filteredData = historicalData.filter(row => {
    if (selectedCourse !== 'all' && row.course !== selectedCourse) return false;
    if (selectedYear !== 'all' && row.year !== parseInt(selectedYear)) return false;
    return true;
  });

  const playerAverages = players.map(player => {
    const scores = filteredData
      .map(row => row[player] as number | null)
      .filter(score => score !== null && score !== undefined) as number[];
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    return { player, avg, count: scores.length };
  });

  const averagesByYear = (() => {
    const byYear = new Map<number, number[]>();
    filteredData.forEach(row => {
      players.forEach(player => {
        const s = row[player] as number | null;
        if (s != null) {
          const year = row.year as number;
          if (!byYear.has(year)) byYear.set(year, []);
          byYear.get(year)!.push(s);
        }
      });
    });
    return Array.from(byYear.entries())
      .map(([year, scores]) => ({
        year,
        avg: scores.reduce((a, b) => a + b, 0) / scores.length,
        count: scores.length,
      }))
      .sort((a, b) => b.year - a.year);
  })();

  const averagesByCourse = (() => {
    const byCourse = new Map<string, number[]>();
    filteredData.forEach(row => {
      const course = row.course as string;
      players.forEach(player => {
        const s = row[player] as number | null;
        if (s != null) {
          if (!byCourse.has(course)) byCourse.set(course, []);
          byCourse.get(course)!.push(s);
        }
      });
    });
    return Array.from(byCourse.entries())
      .map(([course, scores]) => ({
        course,
        avg: scores.reduce((a, b) => a + b, 0) / scores.length,
        count: scores.length,
      }))
      .sort((a, b) => a.course.localeCompare(b.course));
  })();

  const currentYear = new Date().getFullYear();
  const isHistoricalYear = (year: number) => year < currentYear;
  const getCellKey = (course: string, year: number, player: string) => `${course}-${year}-${player}`;

  const updateScore = async (course: string, year: number | null, player: string, value: string) => {
    if (year === null) return;
    if (isHistoricalYear(year)) return;
    const numValue = value === '' ? null : parseInt(value, 10);
    if (isNaN(numValue as number) && value !== '') return;
    try {
      await api.updateScoreValue({ course, year, player, score: numValue });
      await loadScores();
    } catch (err) {
      console.error('Failed to update score:', err);
    }
  };

  const handleScoreBlur = (course: string, year: number, player: string, currentValue: string, originalScore: number | null) => {
    if (isHistoricalYear(year)) return;
    const originalStr = originalScore === null || originalScore === undefined ? '' : String(originalScore);
    if (currentValue === originalStr) {
      setEditingCell(null);
      return;
    }
    updateScore(course, year, player, currentValue);
    setEditingCell(null);
  };

  if (loading) {
    return <div className="text-center py-8">Loading scores...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Scoring</h1>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1.5">Course</label>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="all">All Courses</option>
            {courses.map(course => (
              <option key={course} value={String(course)}>{course}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1.5">Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-h-[44px] touch-manipulation"
          >
            <option value="all">All Years</option>
            {years.map(year => (
              <option key={year} value={year.toString()}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {filteredData.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setAveragesExpanded(prev => !prev)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
            aria-expanded={averagesExpanded}
          >
            <h2 className="text-sm font-bold">Average Scores</h2>
            <svg className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${averagesExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {averagesExpanded && (
            <div className="px-4 pb-4 pt-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {playerAverages.filter(p => p.count > 0).sort((a, b) => (a.avg || 0) - (b.avg || 0)).map(({ player, avg, count }) => (
                  <div key={player} className="text-center">
                    <div className="text-xs text-gray-600 dark:text-gray-400">{player}</div>
                    <div className="text-lg font-semibold">{avg?.toFixed(1)}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-500">({count} rounds)</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {filteredData.length > 0 && averagesByYear.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setAveragesByYearExpanded(prev => !prev)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
            aria-expanded={averagesByYearExpanded}
          >
            <h2 className="text-sm font-bold">Average Scores by Year</h2>
            <svg className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${averagesByYearExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {averagesByYearExpanded && (
            <div className="px-4 pb-4 pt-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {averagesByYear.map(({ year, avg, count }) => (
                  <div key={year} className="text-center">
                    <div className="text-xs text-gray-600 dark:text-gray-400">{year}</div>
                    <div className="text-lg font-semibold">{avg.toFixed(1)}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-500">({count} rounds)</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {filteredData.length > 0 && averagesByCourse.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setAveragesByCourseExpanded(prev => !prev)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
            aria-expanded={averagesByCourseExpanded}
          >
            <h2 className="text-sm font-bold">Average Scores by Course</h2>
            <svg className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${averagesByCourseExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {averagesByCourseExpanded && (
            <div className="px-4 pb-4 pt-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {averagesByCourse.map(({ course, avg, count }) => (
                  <div key={course} className="text-center">
                    <div className="text-xs text-gray-600 dark:text-gray-400">{course}</div>
                    <div className="text-lg font-semibold">{avg.toFixed(1)}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-500">({count} rounds)</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="md:hidden space-y-2">
        {filteredData.length === 0 ? (
          <EmptyState
            icon={<svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
            title="No Data Available"
            message="Try adjusting your filters to see more results."
          />
        ) : (
          filteredData.map((row, idx) => {
            const isHistorical = isHistoricalYear(row.year as number);
            return (
              <Card key={`${row.course}-${row.year}-${idx}`} className="overflow-hidden">
                <CardHeader className="py-1.5 px-2 sm:px-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">{row.course}</h3>
                    <span className="text-xs text-gray-600 dark:text-gray-400">{row.year}</span>
                  </div>
                </CardHeader>
                <CardContent className="py-1 px-2 sm:px-3 pb-2">
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-1">
                    {players.map(player => {
                      const score = row[player] as number | null;
                      const handicap = getHandicap(row.year as number, player);
                      const cellKey = getCellKey(row.course, row.year as number, player);
                      const displayValue = editingCell?.key === cellKey ? editingCell.value : (score === null || score === undefined ? '' : String(score));
                      const numForColor = displayValue === '' ? null : parseInt(displayValue, 10);
                      const colorClass = (numForColor === null || isNaN(numForColor)) && displayValue === '' ? 'text-gray-400 dark:text-gray-500' : numForColor !== null && !isNaN(numForColor) && numForColor < 85 ? 'text-green-600 dark:text-green-400 font-semibold' : numForColor !== null && !isNaN(numForColor) && numForColor < 95 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100';
                      return (
                        <div key={player} className="flex flex-col items-center py-0.5">
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 w-full text-center truncate">{player}</span>
                          {isHistorical ? (
                            <>
                              <span className={`text-xs ${score != null ? colorClass : 'text-gray-400 dark:text-gray-500'}`}>{score != null ? score : '—'}</span>
                              {handicap != null && <span className="text-[9px] text-gray-400 dark:text-gray-500">({handicap})</span>}
                            </>
                          ) : (
                            <>
                              <input
                                type="number"
                                value={displayValue}
                                onFocus={() => setEditingCell({ key: cellKey, value: score === null || score === undefined ? '' : String(score) })}
                                onChange={(e) => editingCell?.key === cellKey && setEditingCell(prev => prev ? { ...prev, value: e.target.value } : null)}
                                onBlur={(e) => handleScoreBlur(row.course, row.year as number, player, e.target.value, score)}
                                className={`w-full max-w-[48px] text-center text-xs border border-gray-300 dark:border-gray-600 rounded px-1 py-1 min-h-0 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white dark:bg-gray-700 ${colorClass}`}
                                placeholder="—"
                                min="0"
                                max="200"
                                inputMode="numeric"
                              />
                              {handicap != null && <span className="text-[9px] text-gray-400 dark:text-gray-500">({handicap})</span>}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <div className="hidden md:block overflow-x-auto -mx-3 sm:mx-0">
        <div className="inline-block min-w-full align-middle">
          <table className="w-full min-w-[800px] border-collapse text-xs" aria-describedby="scores-table-caption">
            <caption id="scores-table-caption" className="sr-only">Scores by course and year. Number under each score is handicap index for that year.</caption>
            <thead>
              <tr className="border-b border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
                <th className="py-1 px-1 text-left text-[10px] font-bold text-gray-600 dark:text-gray-400 sticky left-0 bg-gray-50 dark:bg-gray-800 z-10 whitespace-nowrap">Course</th>
                <th className="py-1 px-1 text-center text-[10px] font-bold text-gray-600 dark:text-gray-400 w-10">Year</th>
                {players.map(player => (
                  <th key={player} className="py-1 px-0.5 text-center text-[10px] font-bold text-gray-600 dark:text-gray-400 min-w-[36px]">{player}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={players.length + 2} className="py-4 text-center text-gray-500 dark:text-gray-400">No data available for selected filters</td>
                </tr>
              ) : (
                filteredData.map((row, idx) => (
                  <tr key={`${row.course}-${row.year}-${idx}`} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                    <td className="py-0.5 px-1 text-left text-[11px] font-medium sticky left-0 bg-white dark:bg-gray-900 z-10 whitespace-nowrap">{row.course}</td>
                    <td className="py-0.5 px-1 text-center text-[11px]">{row.year}</td>
                    {players.map(player => {
                      const score = row[player] as number | null;
                      const handicap = getHandicap(row.year as number, player);
                      const cellKey = getCellKey(row.course, row.year as number, player);
                      const isHistorical = isHistoricalYear(row.year as number);
                      const displayValue = editingCell?.key === cellKey ? editingCell.value : (score === null || score === undefined ? '' : String(score));
                      const numForColor = displayValue === '' ? null : parseInt(displayValue, 10);
                      const colorClass = (numForColor === null || isNaN(numForColor)) && displayValue === '' ? 'text-gray-400 dark:text-gray-500' : numForColor !== null && !isNaN(numForColor) && numForColor < 85 ? 'text-green-600 dark:text-green-400 font-semibold' : numForColor !== null && !isNaN(numForColor) && numForColor < 95 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100';
                      return (
                        <td key={player} className="py-0.5 px-0.5 text-center align-top">
                          {isHistorical ? (
                            <div className="flex flex-col items-center leading-tight">
                              <span className={score != null ? colorClass : 'text-gray-400 dark:text-gray-500'}>{score != null ? score : '—'}</span>
                              {handicap != null && <span className="text-[9px] text-gray-400 dark:text-gray-500">({handicap})</span>}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-0">
                              <input
                                type="number"
                                value={displayValue}
                                onFocus={() => setEditingCell({ key: cellKey, value: score === null || score === undefined ? '' : String(score) })}
                                onChange={(e) => editingCell?.key === cellKey && setEditingCell(prev => prev ? { ...prev, value: e.target.value } : null)}
                                onBlur={(e) => handleScoreBlur(row.course, row.year as number, player, e.target.value, score)}
                                className={`w-9 text-center text-[11px] border border-gray-300 dark:border-gray-600 rounded px-0.5 py-0.5 min-h-0 ${`focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white dark:bg-gray-700 ${colorClass}`}`}
                                placeholder="—"
                                min="0"
                                max="200"
                              />
                              {handicap != null && <span className="text-[9px] text-gray-400 dark:text-gray-500">({handicap})</span>}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
