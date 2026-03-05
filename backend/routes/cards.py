from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from models import db, Card, Deck

cards_bp = Blueprint('cards', __name__)


@cards_bp.route('/<int:card_id>', methods=['PUT'])
@jwt_required()
def update_card(card_id):
    user_id = int(get_jwt_identity())
    card = Card.query.join(Deck).filter(Card.id == card_id, Deck.user_id == user_id).first_or_404()
    data = request.get_json()
    if 'question' in data:
        card.question = data['question'].strip() or card.question
    if 'answer' in data:
        card.answer = data['answer'].strip() or card.answer
    db.session.commit()
    return jsonify(card.to_dict()), 200


@cards_bp.route('/<int:card_id>', methods=['DELETE'])
@jwt_required()
def delete_card(card_id):
    user_id = int(get_jwt_identity())
    card = Card.query.join(Deck).filter(Card.id == card_id, Deck.user_id == user_id).first_or_404()
    db.session.delete(card)
    db.session.commit()
    return jsonify({'message': 'Card deleted'}), 200
