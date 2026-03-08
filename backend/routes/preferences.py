import json
from datetime import datetime

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from models import db, SessionPreferences

preferences_bp = Blueprint('preferences', __name__)


@preferences_bp.route('', methods=['GET'])
@jwt_required()
def get_preferences():
    user_id = int(get_jwt_identity())
    prefs = SessionPreferences.query.filter_by(user_id=user_id).first()
    if not prefs:
        return jsonify({}), 200
    return jsonify(json.loads(prefs.preferences)), 200


@preferences_bp.route('', methods=['POST'])
@jwt_required()
def save_preferences():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    if not isinstance(data, dict):
        return jsonify({'message': 'Invalid data'}), 400

    prefs = SessionPreferences.query.filter_by(user_id=user_id).first()
    if prefs:
        prefs.preferences = json.dumps(data)
        prefs.updated_at = datetime.utcnow()
    else:
        prefs = SessionPreferences(
            user_id=user_id,
            preferences=json.dumps(data),
        )
        db.session.add(prefs)

    db.session.commit()
    return jsonify(json.loads(prefs.preferences)), 200
