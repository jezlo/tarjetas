from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime

from models import db, Card, CardStatistic, Deck

statistics_bp = Blueprint('statistics', __name__)


def _calculate_accuracy(correct, total):
    return round(correct / total * 100, 1) if total else 0


def _get_or_create_stat(card_id, user_id):
    stat = CardStatistic.query.filter_by(card_id=card_id, user_id=user_id).first()
    if not stat:
        stat = CardStatistic(card_id=card_id, user_id=user_id, correct_count=0, wrong_count=0)
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
        'accuracy': _calculate_accuracy(total_correct, total),
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
        'accuracy': _calculate_accuracy(total_correct, total),
        'cards': [s.to_dict() for s in stats],
    }), 200


@statistics_bp.route('/cards/<int:card_id>', methods=['POST'])
@jwt_required()
def record_result(card_id):
    user_id = int(get_jwt_identity())
    card = Card.query.join(Deck).filter(Card.id == card_id, Deck.user_id == user_id).first_or_404()
    data = request.get_json()
    correct = data.get('correct', False)
    known = data.get('known', False)

    stat = _get_or_create_stat(card.id, user_id)
    if correct:
        stat.correct_count += 1
    else:
        stat.wrong_count += 1
    if known:
        stat.is_known = True
    stat.last_reviewed = datetime.utcnow()
    db.session.commit()
    return jsonify(stat.to_dict()), 200


@statistics_bp.route('/decks/<int:deck_id>/known', methods=['GET'])
@jwt_required()
def get_known_cards(deck_id):
    user_id = int(get_jwt_identity())
    deck = Deck.query.filter_by(id=deck_id, user_id=user_id).first_or_404()
    card_ids = [c.id for c in deck.cards]
    known_stats = CardStatistic.query.filter(
        CardStatistic.card_id.in_(card_ids),
        CardStatistic.user_id == user_id,
        CardStatistic.is_known,
    ).all()
    return jsonify({'known_card_ids': [s.card_id for s in known_stats]}), 200


@statistics_bp.route('/decks/<int:deck_id>/marked', methods=['GET'])
@jwt_required()
def get_marked_cards(deck_id):
    user_id = int(get_jwt_identity())
    deck = Deck.query.filter_by(id=deck_id, user_id=user_id).first_or_404()
    card_ids = [c.id for c in deck.cards]
    marked_stats = CardStatistic.query.filter(
        CardStatistic.card_id.in_(card_ids),
        CardStatistic.user_id == user_id,
        CardStatistic.is_marked,
    ).all()
    return jsonify({'marked_card_ids': [s.card_id for s in marked_stats]}), 200


@statistics_bp.route('/cards/<int:card_id>/mark', methods=['POST'])
@jwt_required()
def toggle_mark(card_id):
    user_id = int(get_jwt_identity())
    card = Card.query.join(Deck).filter(Card.id == card_id, Deck.user_id == user_id).first_or_404()
    stat = _get_or_create_stat(card.id, user_id)
    stat.is_marked = not stat.is_marked
    db.session.commit()
    return jsonify(stat.to_dict()), 200
