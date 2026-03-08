import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import CardViewer from '../Cards/CardViewer';
import TriviaViewer from '../Cards/TriviaViewer';
import FillViewer from '../Cards/FillViewer';
import CardForm from '../Cards/CardForm';
import CSVImporter from '../Cards/CSVImporter';
import BulkAddCards from '../Cards/BulkAddCards';

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function DeckDetail() {
  const { id } = useParams();
  const [deck, setDeck] = useState(null);
  const [mode, setMode] = useState('list'); // list | study | trivia | fill | add | bulk | import | duplicates
  const [studyIndex, setStudyIndex] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [studyCards, setStudyCards] = useState([]);
  const [editingCard, setEditingCard] = useState(null); // { id, question, answer }
  const [editError, setEditError] = useState('');

  // Study session setup
  const [studyPhase, setStudyPhase] = useState(null); // null | 'config' | 'active'
  const [configCardCount, setConfigCardCount] = useState('all');
  const [liveCounts, setLiveCounts] = useState({ correct: 0, wrong: 0 });
  const [invertCards, setInvertCards] = useState(false);
  const [hideKnown, setHideKnown] = useState(false);
  const [autoFlipDelay, setAutoFlipDelay] = useState(0); // 0 = disabled
  const [fillWeakMode, setFillWeakMode] = useState(false);
  const [fillShowCharCount, setFillShowCharCount] = useState(false);
  const [includeFillCards, setIncludeFillCards] = useState(false);
  const [fillCardPercentage, setFillCardPercentage] = useState(20);

  // Marked cards
  const [markedCardIds, setMarkedCardIds] = useState(new Set());

  // Duplicate cards
  const [duplicateGroups, setDuplicateGroups] = useState(null);
  const [duplicateLoading, setDuplicateLoading] = useState(false);

  // Session tracking
  const sessionStartRef = useRef(null);
  const sessionCountsRef = useRef({ correct: 0, wrong: 0 });
  const deckIdRef = useRef(null);

  const load = useCallback(() =>
    api.get(`/decks/${id}`).then(({ data }) => {
      setDeck(data);
      deckIdRef.current = data.id;
      setStudyIndex(0);
    }), [id]);

  const loadMarkedCards = useCallback(() => {
    api.get(`/statistics/decks/${id}/marked`)
      .then(({ data }) => setMarkedCardIds(new Set(data.marked_card_ids)))
      .catch(() => {});
  }, [id]);

  const handleExport = () => {
    if (!deck) return;
    const token = localStorage.getItem('access_token');
    fetch(`/api/decks/${id}/export`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Export failed');
        return res.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${deck.name.replace(/\s+/g, '_')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => alert('Failed to export deck. Please try again.'));
  };

  const handleToggleShare = async () => {
    const { data } = await api.put(`/decks/${id}/share`);
    setDeck(data);
  };

  const startStudy = useCallback((cards, doShuffle) => {
    setStudyCards(doShuffle ? shuffleArray(cards) : [...cards]);
    setStudyIndex(0);
  }, []);

  const beginSession = () => {
    sessionStartRef.current = new Date().toISOString();
    sessionCountsRef.current = { correct: 0, wrong: 0 };
  };

  const saveSession = async (deckId) => {
    if (!sessionStartRef.current) return;
    const started = sessionStartRef.current;
    const counts = { ...sessionCountsRef.current };
    sessionStartRef.current = null;
    sessionCountsRef.current = { correct: 0, wrong: 0 };
    try {
      await api.post('/sessions', {
        deck_id: deckId,
        correct_count: counts.correct,
        wrong_count: counts.wrong,
        started_at: started,
        ended_at: new Date().toISOString(),
      });
    } catch (_) {}
  };

  // Save session on component unmount (e.g. navigating away)
  useEffect(() => {
    return () => {
      if (sessionStartRef.current && deckIdRef.current) {
        const started = sessionStartRef.current;
        const counts = { ...sessionCountsRef.current };
        api.post('/sessions', {
          deck_id: deckIdRef.current,
          correct_count: counts.correct,
          wrong_count: counts.wrong,
          started_at: started,
          ended_at: new Date().toISOString(),
        }).catch(() => {});
      }
    };
  }, []);

  const loadDuplicates = useCallback(() => {
    setDuplicateLoading(true);
    api.get(`/decks/${id}/duplicates`)
      .then(({ data }) => setDuplicateGroups(data))
      .catch(() => setDuplicateGroups({ groups: [], duplicate_card_ids: [], total_duplicates: 0 }))
      .finally(() => setDuplicateLoading(false));
  }, [id]);

  const handleMarkDuplicates = async () => {
    try {
      await api.post(`/decks/${id}/duplicates/mark`);
      loadMarkedCards();
      loadDuplicates();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to mark duplicates. Please try again.');
    }
  };

  const handleModeChange = (m) => {
    const wasActiveSession = (mode === 'study' || mode === 'trivia' || mode === 'fill') && studyPhase === 'active';
    if (wasActiveSession && m !== mode) {
      saveSession(deck.id);
      setLiveCounts({ correct: 0, wrong: 0 });
    }
    if (m === 'study' || m === 'trivia' || m === 'fill') {
      setStudyPhase('config');
      setConfigCardCount('all');
      setShuffle(false);
      setInvertCards(false);
      setHideKnown(false);
      setAutoFlipDelay(0);
      setFillWeakMode(false);
      setFillShowCharCount(false);
      setIncludeFillCards(false);
      setFillCardPercentage(20);
    } else {
      setStudyPhase(null);
    }
    if (m === 'duplicates') {
      setDuplicateGroups(null);
    }
    setMode(m);
  };

  const handleStartSession = async () => {
    const allCards = deck.cards || [];
    let baseCards = allCards;
    if (mode === 'fill') {
      baseCards = allCards.filter((c) => c.answer.trim().split(/\s+/).length === 1);
    }
    if (hideKnown) {
      try {
        const { data } = await api.get(`/statistics/decks/${id}/known`);
        const knownIds = new Set(data.known_card_ids);
        baseCards = baseCards.filter((c) => !knownIds.has(c.id));
      } catch (err) {
        console.error('Failed to fetch known cards, showing all cards:', err);
      }
    }
    let selectedCards;
    if (configCardCount === 'all' || configCardCount >= baseCards.length) {
      selectedCards = baseCards;
    } else {
      selectedCards = shuffleArray(baseCards).slice(0, configCardCount);
    }
    if (mode === 'study' && includeFillCards) {
      const fillEligibleInSelected = selectedCards.filter((c) => c.answer.trim().split(/\s+/).length === 1);
      const fillCount = Math.min(
        Math.round(selectedCards.length * fillCardPercentage / 100),
        fillEligibleInSelected.length,
      );
      if (fillCount > 0) {
        const shuffledEligible = shuffleArray(fillEligibleInSelected);
        const fillCardIds = new Set(shuffledEligible.slice(0, fillCount).map((c) => c.id));
        selectedCards = selectedCards.map((c) => fillCardIds.has(c.id) ? { ...c, _isFill: true } : c);
      }
    }
    startStudy(selectedCards, shuffle);
    beginSession();
    setLiveCounts({ correct: 0, wrong: 0 });
    setStudyPhase('active');
  };

  const handleResult = (correct) => {
    sessionCountsRef.current[correct ? 'correct' : 'wrong'] += 1;
    setLiveCounts((prev) => ({
      ...prev,
      [correct ? 'correct' : 'wrong']: prev[correct ? 'correct' : 'wrong'] + 1,
    }));
    if (studyIndex === studyCards.length - 1) {
      saveSession(deck.id);
      setStudyPhase('complete');
    }
  };

  const handleCardMark = (cardId) => {
    setMarkedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  };

  const handleTogglePin = async (cardId) => {
    try {
      await api.post(`/statistics/cards/${cardId}/mark`);
      loadMarkedCards();
    } catch {
      alert('Failed to update pin. Please try again.');
    }
  };

  const handleClearAllPins = async () => {
    if (!window.confirm('Clear all pins for this deck?')) return;
    try {
      await api.delete(`/statistics/decks/${id}/marks`);
      loadMarkedCards();
    } catch {
      alert('Failed to clear pins. Please try again.');
    }
  };

  const handleEditSave = async () => {
    setEditError('');
    try {
      await api.put(`/cards/${editingCard.id}`, {
        question: editingCard.question,
        answer: editingCard.answer,
        context: editingCard.context,
      });
      setEditingCard(null);
      load();
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to save card');
    }
  };

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadMarkedCards(); }, [loadMarkedCards]);

  if (!deck) return <div className="p-8 text-center text-gray-400">Loading…</div>;

  const cards = deck.cards || [];
  const isActiveSession = (mode === 'study' || mode === 'trivia' || mode === 'fill') && studyPhase === 'active';
  const hiddenDuringSession = new Set(['add', 'bulk', 'import', 'duplicates']);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <Link to="/decks" className="text-indigo-600 font-medium hover:underline">← Back to Decks</Link>
        <span className="text-gray-600 font-medium">{deck.name}</span>
        <button
          onClick={handleToggleShare}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            deck.is_public
              ? 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-200'
              : 'bg-white text-gray-600 border border-gray-300 hover:bg-indigo-50'
          }`}
        >
          {deck.is_public ? '🌐 Public' : '🔒 Private'}
        </button>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex flex-wrap gap-2 mb-6">
          {['list', 'study', 'trivia', 'fill', 'add', 'bulk', 'import', 'duplicates']
            .filter((m) => !(isActiveSession && hiddenDuringSession.has(m)))
            .map((m) => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  mode === m
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-300 hover:bg-indigo-50'
                }`}
              >
                {m === 'list' ? 'Cards' : m === 'study' ? 'Study' : m === 'trivia' ? '🎯 Trivia' : m === 'fill' ? '✏️ Fill' : m === 'add' ? '+ Add Card' : m === 'bulk' ? '⚡ Bulk Add' : m === 'import' ? 'Import CSV' : '🔍 Duplicates'}
              </button>
            ))}
          {!isActiveSession && (
            <button
              onClick={handleExport}
              className="px-4 py-2 rounded-lg text-sm font-medium transition bg-white text-gray-600 border border-gray-300 hover:bg-indigo-50"
            >
              ⬇ Export CSV
            </button>
          )}
        </div>

        {mode === 'list' && (
          <div>
            {markedCardIds.size > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-4 text-sm text-orange-700 flex justify-between items-center">
                <span>📌 <span className="font-medium">{markedCardIds.size} pinned card{markedCardIds.size !== 1 ? 's' : ''}</span> — scroll down to find them highlighted</span>
                <button
                  onClick={handleClearAllPins}
                  className="ml-4 text-xs text-orange-600 hover:text-orange-800 border border-orange-300 rounded px-2 py-1 hover:bg-orange-100 transition"
                >
                  Clear all pins
                </button>
              </div>
            )}
            {cards.length === 0 ? (
              <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
                No cards yet. Add some or import a CSV!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {cards.map((card) => (
                  <div key={card.id} className={`rounded-xl shadow p-4 ${markedCardIds.has(card.id) ? 'bg-orange-50 border-2 border-orange-300' : 'bg-white'}`}>
                    {editingCard && editingCard.id === card.id ? (
                      <div className="space-y-3">
                        {editError && <p className="text-red-500 text-sm">{editError}</p>}
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Question</label>
                          <textarea
                            value={editingCard.question}
                            onChange={(e) => setEditingCard({ ...editingCard, question: e.target.value })}
                            rows={2}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Answer</label>
                          <textarea
                            value={editingCard.answer}
                            onChange={(e) => setEditingCard({ ...editingCard, answer: e.target.value })}
                            rows={2}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Context (optional)</label>
                          <textarea
                            value={editingCard.context || ''}
                            onChange={(e) => setEditingCard({ ...editingCard, context: e.target.value })}
                            rows={2}
                            placeholder="Additional context or hint…"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleEditSave}
                            className="px-3 py-1 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => { setEditingCard(null); setEditError(''); }}
                            className="px-3 py-1 text-xs border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-100 transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start mb-1">
                          <p className="font-medium text-gray-800">{card.question}</p>
                          <button
                            onClick={() => handleTogglePin(card.id)}
                            className={`ml-1 shrink-0 text-base leading-none ${markedCardIds.has(card.id) ? 'text-orange-500' : 'text-gray-300 hover:text-orange-400'}`}
                            title={markedCardIds.has(card.id) ? 'Remove pin' : 'Pin card'}
                          >
                            📌
                          </button>
                        </div>
                        <p className="text-gray-500 text-sm mt-1">{card.answer}</p>
                        {card.context && (
                          <p className="text-xs text-blue-500 mt-1 italic">💡 {card.context}</p>
                        )}
                        <div className="flex gap-3 mt-2">
                          <button
                            onClick={() => { setEditingCard({ id: card.id, question: card.question, answer: card.answer, context: card.context || '' }); setEditError(''); }}
                            className="text-xs text-indigo-500 hover:text-indigo-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={async () => {
                              if (!window.confirm('Delete card?')) return;
                              await api.delete(`/cards/${card.id}`);
                              load();
                            }}
                            className="text-xs text-red-400 hover:text-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {(mode === 'study' || mode === 'trivia' || mode === 'fill') && (
          cards.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">Add cards first!</div>
          ) : studyPhase === 'config' ? (
            (() => {
              const fillEligible = cards.filter((c) => c.answer.trim().split(/\s+/).length === 1);
              if (mode === 'fill' && fillEligible.length === 0) {
                return (
                  <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
                    No cards with a single-word answer found. Fill mode only works with 1-word answers.
                  </div>
                );
              }
              return (
                <div className="bg-white rounded-xl shadow p-6 max-w-md mx-auto">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    {mode === 'study' ? 'Study Session Setup' : mode === 'trivia' ? 'Trivia Session Setup' : 'Fill-in Session Setup'}
                  </h3>
                  {mode === 'fill' && (
                    <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 mb-4">
                      ✏️ Only cards with a single-word answer will be included ({fillEligible.length} of {cards.length} cards).
                    </p>
                  )}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Cards to study</label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={configCardCount === 'all'}
                            onChange={() => setConfigCardCount('all')}
                            className="text-indigo-600"
                          />
                          <span className="text-sm">All cards ({mode === 'fill' ? fillEligible.length : cards.length})</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={configCardCount !== 'all'}
                            onChange={() => setConfigCardCount(Math.min(10, mode === 'fill' ? fillEligible.length : cards.length))}
                            className="text-indigo-600"
                          />
                          <span className="text-sm">Random selection:</span>
                          {configCardCount !== 'all' && (
                            <input
                              type="number"
                              min={1}
                              max={mode === 'fill' ? fillEligible.length : cards.length}
                              value={configCardCount}
                              onChange={(e) => setConfigCardCount(Math.max(1, Math.min(mode === 'fill' ? fillEligible.length : cards.length, parseInt(e.target.value) || 1)))}
                              className="w-16 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                          )}
                        </label>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={shuffle}
                        onChange={() => setShuffle(!shuffle)}
                        className="text-indigo-600"
                      />
                      <span className="text-sm">🔀 Shuffle cards</span>
                    </label>
                    {mode !== 'fill' && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={invertCards}
                          onChange={() => setInvertCards(!invertCards)}
                          className="text-indigo-600"
                        />
                        <span className="text-sm">🔄 Invert questions and answers</span>
                      </label>
                    )}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hideKnown}
                        onChange={() => setHideKnown(!hideKnown)}
                        className="text-indigo-600"
                      />
                      <span className="text-sm">⭐ Hide known cards</span>
                    </label>
                    {mode === 'study' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          ⏱ Auto-flip timer
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={autoFlipDelay > 0}
                            onChange={() => setAutoFlipDelay(autoFlipDelay > 0 ? 0 : 5)}
                            className="text-indigo-600"
                          />
                          <span className="text-sm">Flip card automatically after</span>
                          {autoFlipDelay > 0 && (
                            <input
                              type="number"
                              min={1}
                              max={60}
                              value={autoFlipDelay}
                              onChange={(e) => setAutoFlipDelay(Math.max(1, Math.min(60, parseInt(e.target.value) || 1)))}
                              className="w-16 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                          )}
                          {autoFlipDelay > 0 && <span className="text-sm text-gray-500">seconds</span>}
                        </div>
                      </div>
                    )}
                    {mode === 'fill' && (
                      <>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={fillWeakMode}
                            onChange={() => setFillWeakMode(!fillWeakMode)}
                            className="text-indigo-600"
                          />
                          <span className="text-sm">🔤 Modo débil (ignorar acentos y tolerar pequeños errores)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={fillShowCharCount}
                            onChange={() => setFillShowCharCount(!fillShowCharCount)}
                            className="text-indigo-600"
                          />
                          <span className="text-sm">🔢 Mostrar contador de caracteres</span>
                        </label>
                      </>
                    )}
                    {mode === 'study' && fillEligible.length > 0 && (
                      <div>
                        <label className="flex items-center gap-2 cursor-pointer mb-2">
                          <input
                            type="checkbox"
                            checked={includeFillCards}
                            onChange={() => setIncludeFillCards(!includeFillCards)}
                            className="text-indigo-600"
                          />
                          <span className="text-sm">🔀 Mix Fill cards (random)</span>
                        </label>
                        {includeFillCards && (
                          <div className="ml-6 flex items-center gap-2">
                            <span className="text-sm text-gray-600">Percentage of Fill cards:</span>
                            <input
                              type="number"
                              min={10}
                              max={50}
                              step={10}
                              value={fillCardPercentage}
                              onChange={(e) => setFillCardPercentage(Math.max(10, Math.min(50, parseInt(e.target.value) || 10)))}
                              className="w-16 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                            <span className="text-sm text-gray-500">%</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleStartSession}
                    className="mt-6 w-full px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition"
                  >
                    Start Session
                  </button>
                </div>
              );
            })()
          ) : studyPhase === 'complete' ? (
            <div className="bg-white rounded-xl shadow p-8 text-center max-w-md mx-auto">
              <h3 className="text-2xl font-bold text-indigo-700 mb-2"><span aria-hidden="true">🎉 </span>¡Práctica terminada!</h3>
              <p className="text-gray-500 mb-6">Has completado todas las tarjetas de esta sesión.</p>
              <div className="flex justify-center gap-10 mb-8">
                <div>
                  <p className="text-3xl font-bold text-green-600">{liveCounts.correct}</p>
                  <p className="text-sm text-gray-500">Correctas</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-red-500">{liveCounts.wrong}</p>
                  <p className="text-sm text-gray-500">Incorrectas</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-700">
                    {liveCounts.correct + liveCounts.wrong > 0
                      ? Math.round((liveCounts.correct / (liveCounts.correct + liveCounts.wrong)) * 100)
                      : 0}%
                  </p>
                  <p className="text-sm text-gray-500">Precisión</p>
                </div>
              </div>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => {
                    setLiveCounts({ correct: 0, wrong: 0 });
                    setStudyPhase('config');
                  }}
                  className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition"
                >
                  🔄 Volver al inicio
                </button>
                <button
                  onClick={() => handleModeChange('list')}
                  className="px-6 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition"
                >
                  ✓ Terminar sesión
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex justify-center items-center gap-8 mb-4 text-sm font-semibold">
                <span className="text-green-600">✓ Correct: {liveCounts.correct}</span>
                <span className="text-red-500">✗ Wrong: {liveCounts.wrong}</span>
                <button
                  onClick={() => {
                    saveSession(deck.id);
                    setLiveCounts({ correct: 0, wrong: 0 });
                    setStudyPhase('config');
                  }}
                  aria-label="End study session"
                  className="px-4 py-1.5 bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-600 transition"
                >
                  ■ End Session
                </button>
              </div>
              {mode === 'study' ? (
                <CardViewer
                  cards={studyCards}
                  index={studyIndex}
                  onNext={() => setStudyIndex((i) => Math.min(i + 1, studyCards.length - 1))}
                  onPrev={() => setStudyIndex((i) => Math.max(i - 1, 0))}
                  onResult={handleResult}
                  invertCards={invertCards}
                  autoFlipDelay={autoFlipDelay > 0 ? autoFlipDelay : undefined}
                  onMark={handleCardMark}
                  markedCardIds={markedCardIds}
                />
              ) : mode === 'fill' ? (
                <FillViewer
                  cards={studyCards}
                  index={studyIndex}
                  onNext={() => setStudyIndex((i) => Math.min(i + 1, studyCards.length - 1))}
                  onPrev={() => setStudyIndex((i) => Math.max(i - 1, 0))}
                  onResult={handleResult}
                  weakMode={fillWeakMode}
                  showCharCount={fillShowCharCount}
                />
              ) : (
                <TriviaViewer
                  cards={studyCards}
                  index={studyIndex}
                  onNext={() => setStudyIndex((i) => Math.min(i + 1, studyCards.length - 1))}
                  onPrev={() => setStudyIndex((i) => Math.max(i - 1, 0))}
                  onResult={handleResult}
                  invertCards={invertCards}
                />
              )}
            </div>
          )
        )}

        {mode === 'add' && <CardForm deckId={id} onSaved={() => { load(); setMode('list'); }} />}
        {mode === 'bulk' && <BulkAddCards deckId={id} onSaved={() => { load(); setMode('list'); }} />}
        {mode === 'import' && <CSVImporter deckId={id} onImported={() => { load(); setMode('list'); }} />}

        {mode === 'duplicates' && (
          <div>
            {duplicateGroups === null ? (
              <div className="bg-white rounded-xl shadow p-8 text-center">
                <p className="text-gray-500 mb-4">Find cards with the same question so you can review and clean them up.</p>
                <button
                  onClick={loadDuplicates}
                  disabled={duplicateLoading}
                  className="px-5 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {duplicateLoading ? 'Searching…' : '🔍 Search for duplicates'}
                </button>
              </div>
            ) : duplicateGroups.total_duplicates === 0 ? (
              <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
                ✅ No duplicate cards found in this deck.
              </div>
            ) : (
              <div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4 text-sm text-yellow-800 flex flex-wrap justify-between items-center gap-2">
                  <span>⚠️ <span className="font-medium">{duplicateGroups.total_duplicates} duplicate card{duplicateGroups.total_duplicates !== 1 ? 's' : ''}</span> found across <span className="font-medium">{duplicateGroups.groups.length} group{duplicateGroups.groups.length !== 1 ? 's' : ''}</span></span>
                  <div className="flex gap-2">
                    <button
                      onClick={handleMarkDuplicates}
                      className="text-xs bg-orange-500 text-white border border-orange-400 rounded px-3 py-1 hover:bg-orange-600 transition"
                    >
                      📌 Mark all duplicates
                    </button>
                    <button
                      onClick={loadDuplicates}
                      className="text-xs text-yellow-700 border border-yellow-300 rounded px-2 py-1 hover:bg-yellow-100 transition"
                    >
                      🔄 Refresh
                    </button>
                  </div>
                </div>
                <div className="space-y-4">
                  {duplicateGroups.groups.map((group, gi) => (
                    <div key={gi} className="bg-white rounded-xl shadow p-4">
                      <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wide mb-2">
                        Group {gi + 1} — {group.length} cards with the same question
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {group.map((card) => (
                          <div key={card.id} className={`rounded-lg border p-3 ${markedCardIds.has(card.id) ? 'bg-orange-50 border-orange-300' : 'bg-gray-50 border-gray-200'}`}>
                            <p className="font-medium text-gray-800 text-sm">{card.question}</p>
                            <p className="text-gray-500 text-xs mt-1">{card.answer}</p>
                            <div className="flex gap-3 mt-2">
                              <button
                                onClick={() => handleTogglePin(card.id)}
                                className={`text-xs ${markedCardIds.has(card.id) ? 'text-orange-500 hover:text-orange-700' : 'text-gray-400 hover:text-orange-500'}`}
                                title={markedCardIds.has(card.id) ? 'Remove pin' : 'Pin card'}
                              >
                                {markedCardIds.has(card.id) ? '📌 Pinned' : '📌 Pin'}
                              </button>
                              <button
                                onClick={async () => {
                                  if (!window.confirm('Delete this card?')) return;
                                  await api.delete(`/cards/${card.id}`);
                                  load();
                                  loadDuplicates();
                                }}
                                className="text-xs text-red-400 hover:text-red-600"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

