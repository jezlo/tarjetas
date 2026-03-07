import csv
import io
import re

from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import jwt_required, get_jwt_identity

from models import db, Deck, Card, CardStatistic, User
from utils.csv_importer import import_cards_from_csv

decks_bp = Blueprint('decks', __name__)


@decks_bp.route('', methods=['GET'])
@jwt_required()
def get_decks():
    user_id = int(get_jwt_identity())
    decks = Deck.query.filter_by(user_id=user_id).order_by(Deck.created_at.desc()).all()
    return jsonify([d.to_dict() for d in decks]), 200


@decks_bp.route('', methods=['POST'])
@jwt_required()
def create_deck():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'message': 'name is required'}), 400

    deck = Deck(name=name, description=data.get('description', ''), user_id=user_id)
    db.session.add(deck)
    db.session.commit()
    return jsonify(deck.to_dict()), 201


@decks_bp.route('/public/list', methods=['GET'])
@jwt_required()
def get_public_decks():
    user_id = int(get_jwt_identity())
    decks = Deck.query.filter_by(is_public=True).order_by(Deck.created_at.desc()).all()
    # Build a set of source_deck_ids the user has already imported (ignore NULLs)
    imported_ids = {
        d.source_deck_id
        for d in Deck.query.filter(
            Deck.user_id == user_id,
            Deck.source_deck_id.isnot(None),
        ).with_entities(Deck.source_deck_id).all()
    }
    result = []
    for d in decks:
        data = d.to_dict(include_owner=True)
        data['is_own'] = d.user_id == user_id
        data['already_imported'] = d.id in imported_ids
        result.append(data)
    return jsonify(result), 200


@decks_bp.route('/import/<int:deck_id>', methods=['POST'])
@jwt_required()
def import_deck(deck_id):
    user_id = int(get_jwt_identity())
    source = Deck.query.filter_by(id=deck_id, is_public=True).first_or_404()
    if source.user_id == user_id:
        return jsonify({'message': 'Cannot import your own deck'}), 400
    # Prevent duplicate imports of the same source deck
    existing = Deck.query.filter_by(user_id=user_id, source_deck_id=deck_id).first()
    if existing:
        return jsonify({'message': 'You have already imported this deck'}), 400
    new_deck = Deck(
        name=source.name,
        description=source.description,
        user_id=user_id,
        source_deck_id=source.id,
    )
    db.session.add(new_deck)
    db.session.flush()
    for card in source.cards:
        db.session.add(Card(deck_id=new_deck.id, question=card.question, answer=card.answer))
    db.session.commit()
    return jsonify(new_deck.to_dict(include_cards=True)), 201


@decks_bp.route('/<int:deck_id>/share', methods=['PUT'])
@jwt_required()
def toggle_share(deck_id):
    user_id = int(get_jwt_identity())
    deck = Deck.query.filter_by(id=deck_id, user_id=user_id).first_or_404()
    deck.is_public = not deck.is_public
    db.session.commit()
    return jsonify(deck.to_dict()), 200


@decks_bp.route('/<int:deck_id>', methods=['GET'])
@jwt_required()
def get_deck(deck_id):
    user_id = int(get_jwt_identity())
    deck = Deck.query.filter_by(id=deck_id, user_id=user_id).first_or_404()
    return jsonify(deck.to_dict(include_cards=True)), 200


@decks_bp.route('/<int:deck_id>', methods=['PUT'])
@jwt_required()
def update_deck(deck_id):
    user_id = int(get_jwt_identity())
    deck = Deck.query.filter_by(id=deck_id, user_id=user_id).first_or_404()
    data = request.get_json()
    if 'name' in data:
        stripped = data['name'].strip()
        if not stripped:
            return jsonify({'message': 'name cannot be empty'}), 400
        deck.name = stripped
    if 'description' in data:
        deck.description = data['description']
    db.session.commit()
    return jsonify(deck.to_dict()), 200


@decks_bp.route('/<int:deck_id>', methods=['DELETE'])
@jwt_required()
def delete_deck(deck_id):
    user_id = int(get_jwt_identity())
    deck = Deck.query.filter_by(id=deck_id, user_id=user_id).first_or_404()
    db.session.delete(deck)
    db.session.commit()
    return jsonify({'message': 'Deck deleted'}), 200


@decks_bp.route('/<int:deck_id>/cards', methods=['GET'])
@jwt_required()
def get_deck_cards(deck_id):
    user_id = int(get_jwt_identity())
    deck = Deck.query.filter_by(id=deck_id, user_id=user_id).first_or_404()
    return jsonify([c.to_dict() for c in deck.cards]), 200


@decks_bp.route('/<int:deck_id>/cards', methods=['POST'])
@jwt_required()
def create_card(deck_id):
    user_id = int(get_jwt_identity())
    deck = Deck.query.filter_by(id=deck_id, user_id=user_id).first_or_404()
    data = request.get_json()
    question = data.get('question', '').strip()
    answer = data.get('answer', '').strip()
    if not question or not answer:
        return jsonify({'message': 'question and answer are required'}), 400

    card = Card(deck_id=deck.id, question=question, answer=answer)
    db.session.add(card)
    db.session.commit()
    return jsonify(card.to_dict()), 201


@decks_bp.route('/<int:deck_id>/import', methods=['POST'])
@jwt_required()
def import_csv(deck_id):
    user_id = int(get_jwt_identity())
    deck = Deck.query.filter_by(id=deck_id, user_id=user_id).first_or_404()

    if 'file' not in request.files:
        return jsonify({'message': 'No file provided'}), 400

    file = request.files['file']
    if not file.filename.endswith('.csv'):
        return jsonify({'message': 'Only CSV files are supported'}), 400

    try:
        count = import_cards_from_csv(file.stream, deck.id)
    except ValueError as exc:
        return jsonify({'message': str(exc)}), 400

    return jsonify({'message': f'{count} cards imported'}), 201


@decks_bp.route('/combine', methods=['POST'])
@jwt_required()
def combine_decks():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    name = data.get('name', '').strip()
    deck_ids = data.get('deck_ids', [])
    if not name:
        return jsonify({'message': 'name is required'}), 400
    if not deck_ids or len(deck_ids) < 2:
        return jsonify({'message': 'At least 2 decks are required'}), 400

    source_decks = Deck.query.filter(Deck.id.in_(deck_ids), Deck.user_id == user_id).all()
    if len(source_decks) != len(deck_ids):
        return jsonify({'message': 'Some decks were not found'}), 404

    new_deck = Deck(name=name, description=data.get('description', ''), user_id=user_id)
    db.session.add(new_deck)
    db.session.flush()
    for source in source_decks:
        for card in source.cards:
            db.session.add(Card(deck_id=new_deck.id, question=card.question, answer=card.answer))
    db.session.commit()
    return jsonify(new_deck.to_dict()), 201


def _find_duplicate_groups(deck):
    """Return a list of groups (each group is a list of cards) that share the same normalised question."""
    groups = {}
    for card in deck.cards:
        key = card.question.strip().lower()
        groups.setdefault(key, []).append(card)
    return [group for group in groups.values() if len(group) > 1]


@decks_bp.route('/<int:deck_id>/duplicates', methods=['GET'])
@jwt_required()
def get_duplicate_cards(deck_id):
    user_id = int(get_jwt_identity())
    deck = Deck.query.filter_by(id=deck_id, user_id=user_id).first_or_404()

    duplicate_groups = _find_duplicate_groups(deck)
    duplicate_card_ids = [card.id for group in duplicate_groups for card in group]
    return jsonify({
        'groups': [[card.to_dict() for card in group] for group in duplicate_groups],
        'duplicate_card_ids': duplicate_card_ids,
        'total_duplicates': len(duplicate_card_ids),
    }), 200


@decks_bp.route('/<int:deck_id>/duplicates/mark', methods=['POST'])
@jwt_required()
def mark_duplicate_cards(deck_id):
    user_id = int(get_jwt_identity())
    deck = Deck.query.filter_by(id=deck_id, user_id=user_id).first_or_404()

    duplicate_cards = [card for group in _find_duplicate_groups(deck) for card in group]
    duplicate_ids = [c.id for c in duplicate_cards]

    existing_stats = {
        s.card_id: s
        for s in CardStatistic.query.filter(
            CardStatistic.card_id.in_(duplicate_ids),
            CardStatistic.user_id == user_id,
        ).all()
    }

    for card in duplicate_cards:
        stat = existing_stats.get(card.id)
        if not stat:
            stat = CardStatistic(card_id=card.id, user_id=user_id, correct_count=0, wrong_count=0)
            db.session.add(stat)
        stat.is_marked = True
    db.session.commit()

    return jsonify({
        'message': f'{len(duplicate_cards)} duplicate cards marked',
        'duplicate_card_ids': duplicate_ids,
    }), 200


@decks_bp.route('/<int:deck_id>/export', methods=['GET'])
@jwt_required()
def export_csv(deck_id):
    user_id = int(get_jwt_identity())
    deck = Deck.query.filter_by(id=deck_id, user_id=user_id).first_or_404()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['question', 'answer'])
    for card in deck.cards:
        writer.writerow([card.question, card.answer])

    csv_bytes = output.getvalue().encode('utf-8')
    safe_name = re.sub(r'[^\w\-]', '_', deck.name)
    filename = f"{safe_name}.csv"
    return Response(
        csv_bytes,
        mimetype='text/csv',
        headers={'Content-Disposition': f'attachment; filename="{filename}"'},
    )
