import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { useTranslation } from '../../hooks/useTranslation';
import { useSessionPreferences } from '../../contexts/SessionPreferencesContext';
import CardViewer from '../Cards/CardViewer';
import QuestionnaireViewer from '../Cards/QuestionnaireViewer';
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

/**
 * Selects and filters cards for a study session.
 *
 * Rules:
 * - 'fill' mode restricts cards to single-word answers before any other filtering.
 * - hideKnown removes cards marked as known (fetched fresh from the API).
 * - onlyDifficult guarantees ALL difficult cards appear first; normal cards fill
 *   remaining slots up to configCardCount (difficult cards are never cut off).
 * - shuffle is applied *within* each group (difficult / normal) separately so that
 *   difficult cards always stay at the front.
 *
 * Returns { selectedCards, doShuffle, freshDifficultIds }.
 * freshDifficultIds is the Set fetched from the API when onlyDifficult is true,
 * or null when onlyDifficult is false or the API call fails (cached data is used instead).
 */
async function selectAndFilterCards({
  allCards,
  mode,
  hideKnown,
  onlyDifficult,
  shuffle,
  configCardCount,
  deckId,
  cachedDifficultIds,
}) {
  let baseCards = [...allCards];

  // Fill mode: only cards whose answer is a single word
  if (mode === 'fill') {
    baseCards = baseCards.filter((c) => c.answer.trim().split(/\s+/).length === 1);
  }

  // Optionally exclude cards the user already knows
  if (hideKnown) {
    try {
      const { data } = await api.get(`/statistics/decks/${deckId}/known`);
      const knownIds = new Set(data.known_card_ids);
      baseCards = baseCards.filter((c) => !knownIds.has(c.id));
    } catch (err) {
      console.error('Failed to fetch known cards, showing all cards:', err);
    }
  }

  // Separate difficult cards from normal cards (keeping order within each group)
  let difficultCount = 0;
  let freshDifficultIds = null;
  if (onlyDifficult) {
    let difficultIds = cachedDifficultIds;
    try {
      const { data } = await api.get(`/statistics/decks/${deckId}/difficult`);
      freshDifficultIds = new Set(data.difficult_card_ids);
      difficultIds = freshDifficultIds;
    } catch (err) {
      console.error('Failed to fetch difficult cards, using cached data:', err);
    }
    const difficultCards = baseCards.filter((c) => difficultIds.has(c.id));
    const normalCards = baseCards.filter((c) => !difficultIds.has(c.id));
    difficultCount = difficultCards.length;
    baseCards = [...difficultCards, ...normalCards];
  }

  // Select cards, always guaranteeing difficult cards are included in full
  let selectedCards;
  let doShuffle = shuffle;

  if (onlyDifficult) {
    const difficultPart = shuffle
      ? shuffleArray(baseCards.slice(0, difficultCount))
      : baseCards.slice(0, difficultCount);
    const normalPart = shuffle
      ? shuffleArray(baseCards.slice(difficultCount))
      : baseCards.slice(difficultCount);

    if (configCardCount === 'all') {
      selectedCards = [...difficultPart, ...normalPart];
    } else {
      // Always include ALL difficult cards; fill remaining slots with normal cards
      const remainingSlots = Math.max(0, configCardCount - difficultPart.length);
      selectedCards = [...difficultPart, ...normalPart.slice(0, remainingSlots)];
    }
    doShuffle = false; // shuffle was already applied within each group above
  } else if (configCardCount === 'all' || configCardCount >= baseCards.length) {
    selectedCards = baseCards;
  } else {
    selectedCards = shuffle ? shuffleArray(baseCards).slice(0, configCardCount) : baseCards.slice(0, configCardCount);
  }

  return { selectedCards, doShuffle, freshDifficultIds };
}

export default function DeckDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { preferences, updatePreferences } = useSessionPreferences();
  const [deck, setDeck] = useState(null);
  const [mode, setMode] = useState('list'); // list | study | questionnaire | trivia | fill | add | bulk | import | duplicates
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
  const [onlyDifficult, setOnlyDifficult] = useState(false);
  const [autoFlipDelay, setAutoFlipDelay] = useState(0); // 0 = disabled
  const [fillWeakMode, setFillWeakMode] = useState(false);
  const [fillShowCharCount, setFillShowCharCount] = useState(false);
  const [includeFillCards, setIncludeFillCards] = useState(false);
  const [fillCardPercentage, setFillCardPercentage] = useState(20);
  const [triviaOptionCount, setTriviaOptionCount] = useState(3);

  // Marked cards
  const [markedCardIds, setMarkedCardIds] = useState(new Set());

  // Known cards
  const [knownCardIds, setKnownCardIds] = useState(new Set());
  const [showKnownFilter, setShowKnownFilter] = useState('all'); // 'all' | 'known' | 'difficult'

  // Difficult cards
  const [difficultCardIds, setDifficultCardIds] = useState(new Set());

  // Duplicate cards
  const [duplicateGroups, setDuplicateGroups] = useState(null);
  const [duplicateLoading, setDuplicateLoading] = useState(false);

  // Session tracking
  const sessionStartRef = useRef(null);
  const sessionCountsRef = useRef({ correct: 0, wrong: 0 });
  const sessionModeRef = useRef('study');
  const deckIdRef = useRef(null);
  const evaluatedCardIdsRef = useRef(new Set());
  const totalCardsInSessionRef = useRef(0);

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

  const loadKnownCards = useCallback(() => {
    api.get(`/statistics/decks/${id}/known`)
      .then(({ data }) => setKnownCardIds(new Set(data.known_card_ids)))
      .catch(() => {});
  }, [id]);

  const loadDifficultCards = useCallback(() => {
    api.get(`/statistics/decks/${id}/difficult`)
      .then(({ data }) => setDifficultCardIds(new Set(data.difficult_card_ids)))
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
      .catch(() => alert(t('deckDetail.failedExport')));
  };

  const handleToggleShare = async () => {
    const { data } = await api.put(`/decks/${id}/share`);
    setDeck(data);
  };

  const startStudy = useCallback((cards, doShuffle) => {
    setStudyCards(doShuffle ? shuffleArray(cards) : [...cards]);
    setStudyIndex(0);
  }, []);

  const beginSession = (sessionMode, cardCount) => {
    sessionStartRef.current = new Date().toISOString();
    sessionCountsRef.current = { correct: 0, wrong: 0 };
    sessionModeRef.current = sessionMode || 'study';
    evaluatedCardIdsRef.current = new Set();
    totalCardsInSessionRef.current = cardCount || 0;
  };

  const saveSession = async (deckId) => {
    if (!sessionStartRef.current) return;
    const started = sessionStartRef.current;
    const counts = { ...sessionCountsRef.current };
    const cardsInSession = totalCardsInSessionRef.current;
    const cardsReviewed = evaluatedCardIdsRef.current.size;
    sessionStartRef.current = null;
    sessionCountsRef.current = { correct: 0, wrong: 0 };
    try {
      await api.post('/sessions', {
        deck_id: deckId,
        correct_count: counts.correct,
        wrong_count: counts.wrong,
        total_cards_in_session: cardsInSession,
        cards_reviewed: cardsReviewed,
        session_type: sessionModeRef.current,
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
        const cardsInSession = totalCardsInSessionRef.current;
        const cardsReviewed = evaluatedCardIdsRef.current.size;
        api.post('/sessions', {
          deck_id: deckIdRef.current,
          correct_count: counts.correct,
          wrong_count: counts.wrong,
          total_cards_in_session: cardsInSession,
          cards_reviewed: cardsReviewed,
          session_type: sessionModeRef.current,
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
      alert(err.response?.data?.message || t('deckDetail.failedMarkDuplicates'));
    }
  };

  const handleModeChange = (m) => {
    const wasActiveSession = (mode === 'study' || mode === 'questionnaire' || mode === 'trivia' || mode === 'fill') && studyPhase === 'active';
    if (wasActiveSession && m !== mode) {
      saveSession(deck.id);
      setLiveCounts({ correct: 0, wrong: 0 });
    }
    if (m === 'study' || m === 'questionnaire' || m === 'trivia' || m === 'fill') {
      setStudyPhase('config');
      // Restore saved preferences
      setConfigCardCount(preferences.num_cards);
      setShuffle(preferences.shuffle);
      setInvertCards(preferences.invert_cards);
      setHideKnown(preferences.hide_known);
      setOnlyDifficult(!!preferences.only_difficult);
      setAutoFlipDelay(preferences.auto_flip_delay);
      setFillWeakMode(preferences.fill_weak_mode);
      setFillShowCharCount(preferences.fill_show_char_count);
      setIncludeFillCards(preferences.include_fill_cards);
      setFillCardPercentage(preferences.fill_card_percentage);
      setTriviaOptionCount(preferences.trivia_option_count);
    } else {
      setStudyPhase(null);
    }
    if (m === 'duplicates') {
      setDuplicateGroups(null);
    }
    setMode(m);
  };

  const handleStartSession = async () => {
    // Save current config as preferences
    updatePreferences({
      session_type: mode,
      num_cards: configCardCount,
      shuffle,
      invert_cards: invertCards,
      hide_known: hideKnown,
      only_difficult: onlyDifficult,
      auto_flip_delay: autoFlipDelay,
      fill_weak_mode: fillWeakMode,
      fill_show_char_count: fillShowCharCount,
      include_fill_cards: includeFillCards,
      fill_card_percentage: fillCardPercentage,
      trivia_option_count: triviaOptionCount,
    });

    const { selectedCards, doShuffle, freshDifficultIds } = await selectAndFilterCards({
      allCards: deck.cards || [],
      mode,
      hideKnown,
      onlyDifficult,
      shuffle,
      configCardCount,
      deckId: id,
      cachedDifficultIds: difficultCardIds,
    });

    if (freshDifficultIds) {
      setDifficultCardIds(freshDifficultIds);
    }

    let finalCards = selectedCards;
    if (mode === 'study' && includeFillCards) {
      const fillEligibleInSelected = finalCards.filter((c) => c.answer.trim().split(/\s+/).length === 1);
      const fillCount = Math.min(
        Math.round(finalCards.length * fillCardPercentage / 100),
        fillEligibleInSelected.length,
      );
      if (fillCount > 0) {
        const shuffledEligible = shuffleArray(fillEligibleInSelected);
        const fillCardIds = new Set(shuffledEligible.slice(0, fillCount).map((c) => c.id));
        finalCards = finalCards.map((c) => fillCardIds.has(c.id) ? { ...c, _isFill: true } : c);
      }
    }

    startStudy(finalCards, doShuffle);
    beginSession(mode, finalCards.length);
    setLiveCounts({ correct: 0, wrong: 0 });
    setStudyPhase('active');
  };

  const handleResult = (correct, cardId) => {
    const alreadyEvaluated = cardId !== undefined && cardId !== null && evaluatedCardIdsRef.current.has(cardId);
    if (!alreadyEvaluated) {
      if (cardId !== undefined && cardId !== null) evaluatedCardIdsRef.current.add(cardId);
      sessionCountsRef.current[correct ? 'correct' : 'wrong'] += 1;
      setLiveCounts((prev) => ({
        ...prev,
        [correct ? 'correct' : 'wrong']: prev[correct ? 'correct' : 'wrong'] + 1,
      }));
    }
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
      alert(t('deckDetail.failedPin'));
    }
  };

  const handleClearAllPins = async () => {
    if (!window.confirm(t('deckDetail.clearPinsConfirm'))) return;
    try {
      await api.delete(`/statistics/decks/${id}/marks`);
      loadMarkedCards();
    } catch {
      alert(t('deckDetail.failedClearPins'));
    }
  };

  const handleUnmarkKnown = async (cardId) => {
    if (!window.confirm(t('deckDetail.unmarkConfirm'))) return;
    try {
      await api.put(`/statistics/cards/${cardId}/unmark`);
      loadKnownCards();
    } catch {
      alert(t('deckDetail.failedUnmark'));
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
      setEditError(err.response?.data?.message || t('deckDetail.failedSaveCard'));
    }
  };

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadMarkedCards(); }, [loadMarkedCards]);
  useEffect(() => { loadKnownCards(); }, [loadKnownCards]);
  useEffect(() => { loadDifficultCards(); }, [loadDifficultCards]);

  if (!deck) return <div className="p-8 text-center text-gray-400">{t('common.loading')}</div>;

  const cards = deck.cards || [];
  const isActiveSession = (mode === 'study' || mode === 'questionnaire' || mode === 'trivia' || mode === 'fill') && studyPhase === 'active';
  const hiddenDuringSession = new Set(['add', 'bulk', 'import', 'duplicates']);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <nav className="bg-white dark:bg-gray-900 shadow-sm px-6 py-4 flex justify-between items-center">
        <Link to="/decks" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">{t('nav.backToDecks')}</Link>
        <span className="text-gray-600 dark:text-gray-300 font-medium">{deck.name}</span>
        <button
          onClick={handleToggleShare}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            deck.is_public
              ? 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-200 dark:bg-green-900 dark:text-green-300 dark:border-green-700 dark:hover:bg-green-800'
              : 'bg-white text-gray-600 border border-gray-300 hover:bg-indigo-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700'
          }`}
        >
          {deck.is_public ? t('deckDetail.public') : t('deckDetail.private')}
        </button>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex flex-wrap gap-2 mb-6">
          {['list', 'study', 'questionnaire', 'trivia', 'fill', 'add', 'bulk', 'import', 'duplicates']
            .filter((m) => !(isActiveSession && hiddenDuringSession.has(m)))
            .map((m) => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  mode === m
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-indigo-50 dark:hover:bg-gray-700'
                }`}
              >
                {m === 'list' ? t('deckDetail.modeCards') : m === 'study' ? t('deckDetail.modeStudy') : m === 'questionnaire' ? t('deckDetail.modeQuestionnaire') : m === 'trivia' ? t('deckDetail.modeTrivia') : m === 'fill' ? t('deckDetail.modeFill') : m === 'add' ? t('deckDetail.modeAdd') : m === 'bulk' ? t('deckDetail.modeBulk') : m === 'import' ? t('deckDetail.modeImport') : t('deckDetail.modeDuplicates')}
              </button>
            ))}
          {!isActiveSession && (
            <button
              onClick={handleExport}
              className="px-4 py-2 rounded-lg text-sm font-medium transition bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-indigo-50 dark:hover:bg-gray-700"
            >
              {t('deckDetail.exportCsv')}
            </button>
          )}
        </div>

        {mode === 'list' && (
          <div>
            {markedCardIds.size > 0 && (
              <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-xl p-3 mb-4 text-sm text-orange-700 dark:text-orange-300 flex justify-between items-center">
                <span>{t('deckDetail.pinnedMsg', { n: markedCardIds.size })}</span>
                <button
                  onClick={handleClearAllPins}
                  className="ml-4 text-xs text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-200 border border-orange-300 dark:border-orange-700 rounded px-2 py-1 hover:bg-orange-100 dark:hover:bg-orange-900 transition"
                >
                  {t('deckDetail.clearAllPins')}
                </button>
              </div>
            )}
            {(knownCardIds.size > 0 || difficultCardIds.size > 0) && (
              <div className="flex items-center gap-2 mb-4 text-sm flex-wrap">
                <span className="text-gray-500 dark:text-gray-400">{t('deckDetail.knownFilter')}</span>
                <button
                  onClick={() => setShowKnownFilter('all')}
                  className={`px-3 py-1 rounded-lg border transition ${showKnownFilter === 'all' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-indigo-50 dark:hover:bg-gray-700'}`}
                >
                  {t('deckDetail.showAll')}
                </button>
                {knownCardIds.size > 0 && (
                  <button
                    onClick={() => setShowKnownFilter('known')}
                    className={`px-3 py-1 rounded-lg border transition ${showKnownFilter === 'known' ? 'bg-yellow-500 text-white border-yellow-500' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-yellow-50 dark:hover:bg-gray-700'}`}
                  >
                    {t('deckDetail.showKnown')} ({knownCardIds.size})
                  </button>
                )}
                {difficultCardIds.size > 0 && (
                  <button
                    onClick={() => setShowKnownFilter('difficult')}
                    className={`px-3 py-1 rounded-lg border transition ${showKnownFilter === 'difficult' ? 'bg-red-500 text-white border-red-500' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-red-50 dark:hover:bg-gray-700'}`}
                  >
                    {t('deckDetail.showDifficult')} ({difficultCardIds.size})
                  </button>
                )}
              </div>
            )}
            {cards.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-8 text-center text-gray-400 dark:text-gray-500">
                {t('deckDetail.noCards')}
              </div>
            ) : showKnownFilter === 'known' && knownCardIds.size === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-8 text-center text-gray-400 dark:text-gray-500">
                {t('deckDetail.noKnownCards')}
              </div>
            ) : showKnownFilter === 'difficult' && difficultCardIds.size === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-8 text-center text-gray-400 dark:text-gray-500">
                {t('deckDetail.noDifficultCards')}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {cards.filter((card) => {
                  if (showKnownFilter === 'known') return knownCardIds.has(card.id);
                  if (showKnownFilter === 'difficult') return difficultCardIds.has(card.id);
                  return true;
                }).map((card) => (
                  <div key={card.id} className={`rounded-xl shadow p-4 ${markedCardIds.has(card.id) ? 'bg-orange-50 dark:bg-orange-950 border-2 border-orange-300 dark:border-orange-700' : 'bg-white dark:bg-gray-800'}`}>
                    {editingCard && editingCard.id === card.id ? (
                      <div className="space-y-3">
                        {editError && <p className="text-red-500 text-sm">{editError}</p>}
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('deckDetail.question')}</label>
                          <textarea
                            value={editingCard.question}
                            onChange={(e) => setEditingCard({ ...editingCard, question: e.target.value })}
                            rows={2}
                            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('deckDetail.answer')}</label>
                          <textarea
                            value={editingCard.answer}
                            onChange={(e) => setEditingCard({ ...editingCard, answer: e.target.value })}
                            rows={2}
                            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">>{t('deckDetail.contextOptional')}</label>
                          <textarea
                            value={editingCard.context || ''}
                            onChange={(e) => setEditingCard({ ...editingCard, context: e.target.value })}
                            rows={2}
                            placeholder={t('deckDetail.additionalContext')}
                            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleEditSave}
                            className="px-3 py-1 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                          >
                            {t('common.save')}
                          </button>
                          <button
                            onClick={() => { setEditingCard(null); setEditError(''); }}
                            className="px-3 py-1 text-xs border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                          >
                            {t('common.cancel')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start mb-1">
                          <p className="font-medium text-gray-800 dark:text-gray-100">{card.question}</p>
                          <div className="flex items-center gap-1 ml-1 shrink-0">
                            {knownCardIds.has(card.id) && (
                              <span className="text-xs font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded px-1.5 py-0.5">⭐</span>
                            )}
                            <button
                              onClick={() => handleTogglePin(card.id)}
                              className={`text-base leading-none ${markedCardIds.has(card.id) ? 'text-orange-500' : 'text-gray-300 dark:text-gray-600 hover:text-orange-400'}`}
                              title={markedCardIds.has(card.id) ? t('deckDetail.removePin') : t('deckDetail.pinCard')}
                            >
                              📌
                            </button>
                          </div>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{card.answer}</p>
                        {card.context && (
                          <p className="text-xs text-blue-500 dark:text-blue-400 mt-1 italic">💡 {card.context}</p>
                        )}
                        <div className="flex gap-3 mt-2 flex-wrap">
                          <button
                            onClick={() => { setEditingCard({ id: card.id, question: card.question, answer: card.answer, context: card.context || '' }); setEditError(''); }}
                            className="text-xs text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                          >
                            {t('common.edit')}
                          </button>
                          <button
                            onClick={async () => {
                              if (!window.confirm(t('deckDetail.deleteCardConfirm'))) return;
                              await api.delete(`/cards/${card.id}`);
                              load();
                            }}
                            className="text-xs text-red-400 hover:text-red-600"
                          >
                            {t('common.delete')}
                          </button>
                          {knownCardIds.has(card.id) && (
                            <button
                              onClick={() => handleUnmarkKnown(card.id)}
                              className="text-xs text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200"
                            >
                              {t('deckDetail.unmarkKnown')}
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {(mode === 'study' || mode === 'questionnaire' || mode === 'trivia' || mode === 'fill') && (
          cards.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-8 text-center text-gray-400 dark:text-gray-500">{t('deckDetail.addCardsFirst')}</div>
          ) : studyPhase === 'config' ? (
            (() => {
              const fillEligible = cards.filter((c) => c.answer.trim().split(/\s+/).length === 1);
              if (mode === 'fill' && fillEligible.length === 0) {
                return (
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-8 text-center text-gray-400 dark:text-gray-500">
                    {t('deckDetail.noSingleWord')}
                  </div>
                );
              }
              return (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 max-w-md mx-auto">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
                    {mode === 'study' ? t('deckDetail.studySetup') : mode === 'trivia' ? t('deckDetail.triviaSetup') : mode === 'questionnaire' ? t('deckDetail.questionnaireSetup') : t('deckDetail.fillSetup')}
                  </h3>
                  {mode === 'fill' && (
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg px-3 py-2 mb-4">
                      {t('deckDetail.fillOnly', { n: fillEligible.length, total: cards.length })}
                    </p>
                  )}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('deckDetail.cardsToStudy')}</label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={configCardCount === 'all'}
                            onChange={() => setConfigCardCount('all')}
                            className="text-indigo-600"
                          />
                          <span className="text-sm dark:text-gray-300">{t('deckDetail.allCards', { n: mode === 'fill' ? fillEligible.length : cards.length })}</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={configCardCount !== 'all'}
                            onChange={() => setConfigCardCount(Math.min(10, mode === 'fill' ? fillEligible.length : cards.length))}
                            className="text-indigo-600"
                          />
                          <span className="text-sm dark:text-gray-300">{t('deckDetail.randomSelection')}</span>
                          {configCardCount !== 'all' && (
                            <input
                              type="number"
                              min={1}
                              max={mode === 'fill' ? fillEligible.length : cards.length}
                              value={configCardCount}
                              onChange={(e) => setConfigCardCount(Math.max(1, Math.min(mode === 'fill' ? fillEligible.length : cards.length, parseInt(e.target.value) || 1)))}
                              className="w-16 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
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
                      <span className="text-sm dark:text-gray-300">{t('deckDetail.shuffle')}</span>
                    </label>
                    {mode !== 'fill' && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={invertCards}
                          onChange={() => setInvertCards(!invertCards)}
                          className="text-indigo-600"
                        />
                        <span className="text-sm dark:text-gray-300">{t('deckDetail.invert')}</span>
                      </label>
                    )}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hideKnown}
                        onChange={() => setHideKnown(!hideKnown)}
                        className="text-indigo-600"
                      />
                      <span className="text-sm dark:text-gray-300">{t('deckDetail.hideKnown')}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={onlyDifficult}
                        onChange={() => setOnlyDifficult(!onlyDifficult)}
                        className="text-indigo-600"
                      />
                      <span className="text-sm dark:text-gray-300">{t('deckDetail.onlyDifficult')}</span>
                    </label>
                    {mode === 'study' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('deckDetail.autoFlip')}
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={autoFlipDelay > 0}
                            onChange={() => setAutoFlipDelay(autoFlipDelay > 0 ? 0 : 5)}
                            className="text-indigo-600"
                          />
                          <span className="text-sm dark:text-gray-300">{t('deckDetail.flipAfter')}</span>
                          {autoFlipDelay > 0 && (
                            <input
                              type="number"
                              min={1}
                              max={60}
                              value={autoFlipDelay}
                              onChange={(e) => setAutoFlipDelay(Math.max(1, Math.min(60, parseInt(e.target.value) || 1)))}
                              className="w-16 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                          )}
                          {autoFlipDelay > 0 && <span className="text-sm text-gray-500 dark:text-gray-400">{t('deckDetail.seconds')}</span>}
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
                          <span className="text-sm dark:text-gray-300">{t('deckDetail.fillWeak')}</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={fillShowCharCount}
                            onChange={() => setFillShowCharCount(!fillShowCharCount)}
                            className="text-indigo-600"
                          />
                          <span className="text-sm dark:text-gray-300">{t('deckDetail.fillCharCount')}</span>
                        </label>
                      </>
                    )}
                    {mode === 'trivia' && (
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('deckDetail.triviaOptions')}</label>
                        <input
                          type="number"
                          min={2}
                          max={10}
                          value={triviaOptionCount}
                          onChange={(e) => setTriviaOptionCount(Math.max(2, Math.min(10, parseInt(e.target.value) || 2)))}
                          className="w-16 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                      </div>
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
                          <span className="text-sm dark:text-gray-300">{t('deckDetail.mixFill')}</span>
                        </label>
                        {includeFillCards && (
                          <div className="ml-6 flex items-center gap-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">{t('deckDetail.fillPercentage')}</span>
                            <input
                              type="number"
                              min={10}
                              max={50}
                              step={10}
                              value={fillCardPercentage}
                              onChange={(e) => setFillCardPercentage(Math.max(10, Math.min(50, parseInt(e.target.value) || 10)))}
                              className="w-16 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                            <span className="text-sm text-gray-500 dark:text-gray-400">%</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleStartSession}
                    className="mt-6 w-full px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition"
                  >
                    {t('deckDetail.startSession')}
                  </button>
                </div>
              );
            })()
          ) : studyPhase === 'complete' ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-8 text-center max-w-md mx-auto">
              <h3 className="text-2xl font-bold text-indigo-700 dark:text-indigo-400 mb-2"><span aria-hidden="true">🎉 </span>{t('deckDetail.sessionDone')}</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-2">{t('deckDetail.sessionDoneDesc')}</p>
              <p className="text-sm text-indigo-500 dark:text-indigo-400 mb-6">
                {t('deckDetail.sessionAddedReviewed', { reviewed: liveCounts.correct + liveCounts.wrong, total: studyCards.length })}
              </p>
              <div className="flex justify-center gap-10 mb-8">
                <div>
                  <p className="text-3xl font-bold text-green-600">{liveCounts.correct}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('deckDetail.sessionCorrect')}</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-red-500">{liveCounts.wrong}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('deckDetail.sessionWrong')}</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-700 dark:text-gray-200">
                    {liveCounts.correct + liveCounts.wrong > 0
                      ? Math.round((liveCounts.correct / (liveCounts.correct + liveCounts.wrong)) * 100)
                      : 0}%
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('deckDetail.sessionAccuracy')}</p>
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
                  {t('deckDetail.restartSession')}
                </button>
                <button
                  onClick={() => handleModeChange('list')}
                  className="px-6 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                >
                  {t('deckDetail.endSessionBtn')}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex justify-center items-center gap-8 mb-4 text-sm font-semibold">
                <span className="text-green-600">{t('deckDetail.correctCount', { n: liveCounts.correct })}</span>
                <span className="text-red-500">{t('deckDetail.wrongCount', { n: liveCounts.wrong })}</span>
                <button
                  onClick={() => {
                    saveSession(deck.id);
                    setLiveCounts({ correct: 0, wrong: 0 });
                    setStudyPhase('config');
                  }}
                  aria-label="End study session"
                  className="px-4 py-1.5 bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-600 transition"
                >
                  {t('deckDetail.endSession')}
                </button>
              </div>
              {mode === 'study' ? (
                <CardViewer
                  cards={studyCards}
                  index={studyIndex}
                  onNext={() => setStudyIndex((i) => Math.min(i + 1, studyCards.length - 1))}
                  onPrev={() => setStudyIndex((i) => Math.max(i - 1, 0))}
                  onResult={(correct) => handleResult(correct, studyCards[studyIndex]?.id)}
                  invertCards={invertCards}
                  autoFlipDelay={autoFlipDelay > 0 ? autoFlipDelay : undefined}
                  onMark={handleCardMark}
                  markedCardIds={markedCardIds}
                />
              ) : mode === 'questionnaire' ? (
                <QuestionnaireViewer
                  cards={studyCards}
                  index={studyIndex}
                  onNext={() => setStudyIndex((i) => Math.min(i + 1, studyCards.length - 1))}
                  onPrev={() => setStudyIndex((i) => Math.max(i - 1, 0))}
                  onResult={(correct) => handleResult(correct, studyCards[studyIndex]?.id)}
                  invertCards={invertCards}
                />
              ) : mode === 'fill' ? (
                <FillViewer
                  cards={studyCards}
                  index={studyIndex}
                  onNext={() => setStudyIndex((i) => Math.min(i + 1, studyCards.length - 1))}
                  onPrev={() => setStudyIndex((i) => Math.max(i - 1, 0))}
                  onResult={(correct) => handleResult(correct, studyCards[studyIndex]?.id)}
                  weakMode={fillWeakMode}
                  showCharCount={fillShowCharCount}
                />
              ) : (
                <TriviaViewer
                  cards={studyCards}
                  index={studyIndex}
                  onNext={() => setStudyIndex((i) => Math.min(i + 1, studyCards.length - 1))}
                  onPrev={() => setStudyIndex((i) => Math.max(i - 1, 0))}
                  onResult={(correct) => handleResult(correct, studyCards[studyIndex]?.id)}
                  invertCards={invertCards}
                  optionCount={triviaOptionCount}
                  allCards={deck.cards}
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
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-8 text-center">
                <p className="text-gray-500 dark:text-gray-400 mb-4">{t('deckDetail.duplicatesDesc')}</p>
                <button
                  onClick={loadDuplicates}
                  disabled={duplicateLoading}
                  className="px-5 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {duplicateLoading ? t('deckDetail.searching') : t('deckDetail.searchDuplicates')}
                </button>
              </div>
            ) : duplicateGroups.total_duplicates === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-8 text-center text-gray-400 dark:text-gray-500">
                {t('deckDetail.noDuplicates')}
              </div>
            ) : (
              <div>
                <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3 mb-4 text-sm text-yellow-800 dark:text-yellow-300 flex flex-wrap justify-between items-center gap-2">
                  <span>{t('deckDetail.duplicatesFound', { total: duplicateGroups.total_duplicates, groups: duplicateGroups.groups.length })}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={handleMarkDuplicates}
                      className="text-xs bg-orange-500 text-white border border-orange-400 rounded px-3 py-1 hover:bg-orange-600 transition"
                    >
                      {t('deckDetail.markAllDuplicates')}
                    </button>
                    <button
                      onClick={loadDuplicates}
                      className="text-xs text-yellow-700 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-700 rounded px-2 py-1 hover:bg-yellow-100 dark:hover:bg-yellow-900 transition"
                    >
                      {t('deckDetail.refresh')}
                    </button>
                  </div>
                </div>
                <div className="space-y-4">
                  {duplicateGroups.groups.map((group, gi) => (
                    <div key={gi} className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
                      <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 uppercase tracking-wide mb-2">
                        {t('deckDetail.duplicateGroup', { n: gi + 1, count: group.length })}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {group.map((card) => (
                          <div key={card.id} className={`rounded-lg border p-3 ${markedCardIds.has(card.id) ? 'bg-orange-50 dark:bg-orange-950 border-orange-300 dark:border-orange-700' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'}`}>
                            <p className="font-medium text-gray-800 dark:text-gray-100 text-sm">{card.question}</p>
                            <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">{card.answer}</p>
                            <div className="flex gap-3 mt-2">
                              <button
                                onClick={() => handleTogglePin(card.id)}
                                className={`text-xs ${markedCardIds.has(card.id) ? 'text-orange-500 hover:text-orange-700' : 'text-gray-400 dark:text-gray-500 hover:text-orange-500'}`}
                                title={markedCardIds.has(card.id) ? t('deckDetail.removePin') : t('deckDetail.pinCard')}
                              >
                                {markedCardIds.has(card.id) ? t('deckDetail.pinnedCard') : t('deckDetail.pinCardBtn')}
                              </button>
                              <button
                                onClick={async () => {
                                  if (!window.confirm(t('deckDetail.deleteCardConfirm2'))) return;
                                  await api.delete(`/cards/${card.id}`);
                                  load();
                                  loadDuplicates();
                                }}
                                className="text-xs text-red-400 hover:text-red-600"
                              >
                                {t('common.delete')}
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

