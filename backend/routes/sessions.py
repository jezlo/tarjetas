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

    session = StudySession(
        user_id=user_id,
        deck_id=deck.id,
        correct_count=int(data.get('correct_count', 0)),
        wrong_count=int(data.get('wrong_count', 0)),
        started_at=datetime.fromisoformat(started_at.replace('Z', '+00:00')) if started_at else datetime.utcnow(),
        ended_at=datetime.fromisoformat(ended_at.replace('Z', '+00:00')) if ended_at else None,
    )
    db.session.add(session)
    db.session.commit()
    return jsonify(session.to_dict()), 201
