import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import CardViewer from '../Cards/CardViewer';
import CardForm from '../Cards/CardForm';
import CSVImporter from '../Cards/CSVImporter';

export default function DeckDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [deck, setDeck] = useState(null);
  const [mode, setMode] = useState('list'); // list | study | add | import
  const [studyIndex, setStudyIndex] = useState(0);

  const load = () =>
    api.get(`/decks/${id}`).then(({ data }) => {
      setDeck(data);
      setStudyIndex(0);
    });

  useEffect(() => { load(); }, [id]);

  if (!deck) return <div className="p-8 text-center text-gray-400">Loading…</div>;

  const cards = deck.cards || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <Link to="/decks" className="text-indigo-600 font-medium hover:underline">← Back to Decks</Link>
        <span className="text-gray-600 font-medium">{deck.name}</span>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex flex-wrap gap-2 mb-6">
          {['list', 'study', 'add', 'import'].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                mode === m
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-indigo-50'
              }`}
            >
              {m === 'list' ? 'Cards' : m === 'study' ? 'Study' : m === 'add' ? '+ Add Card' : 'Import CSV'}
            </button>
          ))}
        </div>

        {mode === 'list' && (
          <div className="space-y-3">
            {cards.length === 0 ? (
              <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
                No cards yet. Add some or import a CSV!
              </div>
            ) : (
              cards.map((card) => (
                <div key={card.id} className="bg-white rounded-xl shadow p-4">
                  <p className="font-medium text-gray-800">{card.question}</p>
                  <p className="text-gray-500 text-sm mt-1">{card.answer}</p>
                  <button
                    onClick={async () => {
                      if (!window.confirm('Delete card?')) return;
                      await api.delete(`/cards/${card.id}`);
                      load();
                    }}
                    className="text-xs text-red-400 hover:text-red-600 mt-2"
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {mode === 'study' && (
          cards.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">Add cards first!</div>
          ) : (
            <CardViewer
              cards={cards}
              index={studyIndex}
              onNext={() => setStudyIndex((i) => Math.min(i + 1, cards.length - 1))}
              onPrev={() => setStudyIndex((i) => Math.max(i - 1, 0))}
            />
          )
        )}

        {mode === 'add' && <CardForm deckId={id} onSaved={() => { load(); setMode('list'); }} />}
        {mode === 'import' && <CSVImporter deckId={id} onImported={() => { load(); setMode('list'); }} />}
      </main>
    </div>
  );
}
