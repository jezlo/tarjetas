from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime

from models import db, Card, CardStatistic, Deck

statistics_bp = Blueprint('statistics', __name__)


def _get_or_create_stat(card_id, user_id):
    stat = CardStatistic.query.filter_by(card_id=card_id, user_id=user_id).first()
    if not stat:
        stat = CardStatistic(card_id=card_id, user_id=user_id)
        db.session.add(stat)
    return stat


@statistics_bp.route('', methods=['GET'])
@jwt_required()
def get_statistics():
    user_id = int(get_jwt_identity())
    stats = CardStatistic.query.filter_by(user_id=user_id).all()
    total_correct = sum(s.correct_count for s in stats)
    total_wrong = sum(s.wrong_count for s in stats)
    total = total_correct + total_wrong
    return jsonify({
        'total_reviews': total,
        'correct': total_correct,
        'wrong': total_wrong,
        'accuracy': round(total_correct / total * 100, 1) if total else 0,
        'cards_reviewed': len(stats),
    }), 200


@statistics_bp.route('/decks/<int:deck_id>', methods=['GET'])
@jwt_required()
def get_deck_statistics(deck_id):
    user_id = int(get_jwt_identity())
    deck = Deck.query.filter_by(id=deck_id, user_id=user_id).first_or_404()
    card_ids = [c.id for c in deck.cards]
    stats = CardStatistic.query.filter(
        CardStatistic.card_id.in_(card_ids),
        CardStatistic.user_id == user_id,
    ).all()
    total_correct = sum(s.correct_count for s in stats)
    total_wrong = sum(s.wrong_count for s in stats)
    total = total_correct + total_wrong
    return jsonify({
        'deck_id': deck_id,
        'deck_name': deck.name,
        'total_cards': len(card_ids),
        'total_reviews': total,
        'correct': total_correct,
        'wrong': total_wrong,
        'accuracy': round(total_correct / total * 100, 1) if total else 0,
        'cards': [s.to_dict() for s in stats],
    }), 200


@statistics_bp.route('/cards/<int:card_id>', methods=['POST'])
@jwt_required()
def record_result(card_id):
    user_id = int(get_jwt_identity())
    card = Card.query.join(Deck).filter(Card.id == card_id, Deck.user_id == user_id).first_or_404()
    data = request.get_json()
    correct = data.get('correct', False)

    stat = _get_or_create_stat(card.id, user_id)
    if correct:
        stat.correct_count += 1
    else:
        stat.wrong_count += 1
    stat.last_reviewed = datetime.utcnow()
    db.session.commit()
    return jsonify(stat.to_dict()), 200
