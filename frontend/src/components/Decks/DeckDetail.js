import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import CardViewer from '../Cards/CardViewer';
import TriviaViewer from '../Cards/TriviaViewer';
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
  const [mode, setMode] = useState('list'); // list | study | trivia | add | bulk | import
  const [studyIndex, setStudyIndex] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [studyCards, setStudyCards] = useState([]);
  const [editingCard, setEditingCard] = useState(null); // { id, question, answer }
  const [editError, setEditError] = useState('');

  // Session tracking
  const sessionStartRef = useRef(null);
  const sessionCountsRef = useRef({ correct: 0, wrong: 0 });

  const load = useCallback(() =>
    api.get(`/decks/${id}`).then(({ data }) => {
      setDeck(data);
      setStudyIndex(0);
    }), [id]);

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
    try {
      await api.post('/sessions', {
        deck_id: deckId,
        correct_count: sessionCountsRef.current.correct,
        wrong_count: sessionCountsRef.current.wrong,
        started_at: sessionStartRef.current,
        ended_at: new Date().toISOString(),
      });
    } catch (_) {}
    sessionStartRef.current = null;
    sessionCountsRef.current = { correct: 0, wrong: 0 };
  };

  const handleModeChange = (m) => {
    const isLeavingSession = (mode === 'study' || mode === 'trivia') && m !== 'study' && m !== 'trivia';
    if (isLeavingSession && deck) {
      saveSession(deck.id);
    }
    if ((m === 'study' || m === 'trivia') && deck) {
      startStudy(deck.cards || [], shuffle);
      beginSession();
    }
    setMode(m);
  };

  const handleShuffleToggle = () => {
    const next = !shuffle;
    setShuffle(next);
    if ((mode === 'study' || mode === 'trivia') && deck) {
      startStudy(deck.cards || [], next);
    }
  };

  const handleEditSave = async () => {
    setEditError('');
    try {
      await api.put(`/cards/${editingCard.id}`, {
        question: editingCard.question,
        answer: editingCard.answer,
      });
      setEditingCard(null);
      load();
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to save card');
    }
  };

  useEffect(() => { load(); }, [load]);

  if (!deck) return <div className="p-8 text-center text-gray-400">Loading…</div>;

  const cards = deck.cards || [];

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
          {['list', 'study', 'trivia', 'add', 'bulk', 'import'].map((m) => (
            <button
              key={m}
              onClick={() => handleModeChange(m)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                mode === m
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-indigo-50'
              }`}
            >
              {m === 'list' ? 'Cards' : m === 'study' ? 'Study' : m === 'trivia' ? '🎯 Trivia' : m === 'add' ? '+ Add Card' : m === 'bulk' ? '⚡ Bulk Add' : 'Import CSV'}
            </button>
          ))}
          <button
            onClick={handleExport}
            className="px-4 py-2 rounded-lg text-sm font-medium transition bg-white text-gray-600 border border-gray-300 hover:bg-indigo-50"
          >
            ⬇ Export CSV
          </button>
        </div>

        {mode === 'list' && (
          <div>
            {cards.length === 0 ? (
              <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
                No cards yet. Add some or import a CSV!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {cards.map((card) => (
                  <div key={card.id} className="bg-white rounded-xl shadow p-4">
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
                        <p className="font-medium text-gray-800">{card.question}</p>
                        <p className="text-gray-500 text-sm mt-1">{card.answer}</p>
                        <div className="flex gap-3 mt-2">
                          <button
                            onClick={() => { setEditingCard({ id: card.id, question: card.question, answer: card.answer }); setEditError(''); }}
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

        {mode === 'study' && (
          cards.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">Add cards first!</div>
          ) : (
            <div>
              <div className="flex justify-end mb-4">
                <button
                  onClick={handleShuffleToggle}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    shuffle
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-600 border border-gray-300 hover:bg-indigo-50'
                  }`}
                >
                  🔀 Shuffle {shuffle ? 'On' : 'Off'}
                </button>
              </div>
              <CardViewer
                cards={studyCards}
                index={studyIndex}
                onNext={() => setStudyIndex((i) => Math.min(i + 1, studyCards.length - 1))}
                onPrev={() => setStudyIndex((i) => Math.max(i - 1, 0))}
                onResult={(correct) => { sessionCountsRef.current[correct ? 'correct' : 'wrong'] += 1; }}
              />
            </div>
          )
        )}

        {mode === 'trivia' && (
          cards.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">Add cards first!</div>
          ) : (
            <div>
              <div className="flex justify-end mb-4">
                <button
                  onClick={handleShuffleToggle}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    shuffle
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-600 border border-gray-300 hover:bg-indigo-50'
                  }`}
                >
                  🔀 Shuffle {shuffle ? 'On' : 'Off'}
                </button>
              </div>
              <TriviaViewer
                cards={studyCards}
                index={studyIndex}
                onNext={() => setStudyIndex((i) => Math.min(i + 1, studyCards.length - 1))}
                onPrev={() => setStudyIndex((i) => Math.max(i - 1, 0))}
                onResult={(correct) => { sessionCountsRef.current[correct ? 'correct' : 'wrong'] += 1; }}
              />
            </div>
          )
        )}

        {mode === 'add' && <CardForm deckId={id} onSaved={() => { load(); setMode('list'); }} />}
        {mode === 'bulk' && <BulkAddCards deckId={id} onSaved={() => { load(); setMode('list'); }} />}
        {mode === 'import' && <CSVImporter deckId={id} onImported={() => { load(); setMode('list'); }} />}
      </main>
    </div>
  );
}
