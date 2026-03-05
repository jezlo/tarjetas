import csv
import io

from models import db, Card


def import_cards_from_csv(stream, deck_id):
    """Read a CSV file stream and bulk-insert cards into the given deck.

    The CSV must have 'question' and 'answer' columns (case-insensitive).
    Returns the number of cards created.
    """
    content = stream.read()
    if isinstance(content, bytes):
        content = content.decode('utf-8-sig')

    reader = csv.DictReader(io.StringIO(content))
    headers = [h.lower() for h in (reader.fieldnames or [])]
    if 'question' not in headers or 'answer' not in headers:
        raise ValueError("CSV must contain 'question' and 'answer' columns")

    count = 0
    for row in reader:
        # Normalize keys to lower-case
        normalised = {k.lower(): v for k, v in row.items()}
        question = normalised.get('question', '').strip()
        answer = normalised.get('answer', '').strip()
        if question and answer:
            db.session.add(Card(deck_id=deck_id, question=question, answer=answer))
            count += 1

    db.session.commit()
    return count
