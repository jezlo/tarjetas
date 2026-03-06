from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from models import db, Deck, Card, User
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
    decks = Deck.query.filter_by(is_public=True).order_by(Deck.created_at.desc()).all()
    return jsonify([d.to_dict(include_owner=True) for d in decks]), 200


@decks_bp.route('/import/<int:deck_id>', methods=['POST'])
@jwt_required()
def import_deck(deck_id):
    user_id = int(get_jwt_identity())
    source = Deck.query.filter_by(id=deck_id, is_public=True).first_or_404()
    new_deck = Deck(
        name=source.name,
        description=source.description,
        user_id=user_id,
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
