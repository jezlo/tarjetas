from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime

from models import db, Deck, StudySession

sessions_bp = Blueprint('sessions', __name__)


@sessions_bp.route('', methods=['GET'])
@jwt_required()
def get_sessions():
    user_id = int(get_jwt_identity())
    sessions = (
        StudySession.query.filter_by(user_id=user_id)
        .order_by(StudySession.started_at.desc())
        .all()
    )
    return jsonify([s.to_dict() for s in sessions]), 200


@sessions_bp.route('', methods=['POST'])
@jwt_required()
def create_session():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    deck_id = data.get('deck_id')
    if not deck_id:
        return jsonify({'message': 'deck_id is required'}), 400

    deck = Deck.query.filter_by(id=deck_id, user_id=user_id).first_or_404()

    started_at = data.get('started_at')
    ended_at = data.get('ended_at')

    valid_session_types = {'study', 'trivia', 'fill'}
    session_type = data.get('session_type', 'study')
    if session_type not in valid_session_types:
        return jsonify({'message': "session_type must be one of: 'study', 'trivia', 'fill'"}), 400

    session = StudySession(
        user_id=user_id,
        deck_id=deck.id,
        correct_count=int(data.get('correct_count', 0)),
        wrong_count=int(data.get('wrong_count', 0)),
        session_type=session_type,
        started_at=datetime.fromisoformat(started_at.replace('Z', '+00:00')) if started_at else datetime.utcnow(),
        ended_at=datetime.fromisoformat(ended_at.replace('Z', '+00:00')) if ended_at else None,
        total_cards_in_session=int(data.get('total_cards_in_session', 0)),
        cards_reviewed=int(data.get('cards_reviewed', 0)),
    )
    db.session.add(session)
    db.session.commit()
    return jsonify(session.to_dict()), 201


@sessions_bp.route('/<int:session_id>', methods=['DELETE'])
@jwt_required()
def delete_session(session_id):
    user_id = int(get_jwt_identity())
    session = StudySession.query.filter_by(id=session_id, user_id=user_id).first_or_404()
    db.session.delete(session)
    db.session.commit()
    return jsonify({'message': 'Session deleted'}), 200


@sessions_bp.route('', methods=['DELETE'])
@jwt_required()
def delete_all_sessions():
    user_id = int(get_jwt_identity())
    StudySession.query.filter_by(user_id=user_id).delete()
    db.session.commit()
    return jsonify({'message': 'All sessions deleted'}), 200
