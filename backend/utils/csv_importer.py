import csv
import io

from models import db, Card


def import_cards_from_csv(stream, deck_id):
    """Read a CSV file stream and bulk-insert cards into the given deck.

    The CSV must have 'question' and 'answer' columns (case-insensitive).
    An optional 'context' column is also supported.
    Rows whose question already exists in the deck are skipped as duplicates.
    Returns the number of cards created.
    """
    content = stream.read()
    if isinstance(content, bytes):
        content = content.decode('utf-8-sig')

    reader = csv.DictReader(io.StringIO(content))
    headers = [h.lower() for h in (reader.fieldnames or [])]
    if 'question' not in headers or 'answer' not in headers:
        raise ValueError("CSV must contain 'question' and 'answer' columns")

    # Build a set of existing questions (normalised) for this deck to detect duplicates
    existing_questions = {
        q.lower()
        for (q,) in db.session.query(Card.question).filter_by(deck_id=deck_id).all()
    }

    count = 0
    for row in reader:
        # Normalize keys to lower-case
        normalised = {k.lower(): v for k, v in row.items()}
        question = normalised.get('question', '').strip()
        answer = normalised.get('answer', '').strip()
        context = normalised.get('context', '').strip() or None
        if question and answer and question.lower() not in existing_questions:
            db.session.add(Card(deck_id=deck_id, question=question, answer=answer, context=context))
            existing_questions.add(question.lower())
            count += 1

    db.session.commit()
    return count
