import json

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from models import db, SessionPreferences

preferences_bp = Blueprint('preferences', __name__)

_ALLOWED_KEYS = frozenset({
    'session_type',
    'num_cards',
    'shuffle',
    'invert_cards',
    'hide_known',
    'auto_flip_delay',
    'fill_weak_mode',
    'fill_show_char_count',
    'include_fill_cards',
    'fill_card_percentage',
    'trivia_option_count',
})

_VALID_SESSION_TYPES = frozenset({'study', 'questionnaire', 'trivia', 'fill'})


def _validate_preferences(data):
    """Validate preference values. Returns (cleaned_dict, error_message)."""
    if not isinstance(data, dict):
        return None, 'Preferences must be a JSON object'

    cleaned = {}
    for key, value in data.items():
        if key not in _ALLOWED_KEYS:
            continue
        cleaned[key] = value

    if 'session_type' in cleaned and cleaned['session_type'] not in _VALID_SESSION_TYPES:
        return None, f"session_type must be one of: {', '.join(sorted(_VALID_SESSION_TYPES))}"

    return cleaned, None


@preferences_bp.route('', methods=['GET'])
@jwt_required()
def get_preferences():
    user_id = int(get_jwt_identity())
    prefs_row = SessionPreferences.query.filter_by(user_id=user_id).first()
    if prefs_row is None:
        return jsonify({}), 200
    return jsonify(prefs_row.to_dict()), 200


@preferences_bp.route('', methods=['POST'])
@jwt_required()
def save_preferences():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    if data is None:
        return jsonify({'message': 'Request body must be JSON'}), 400

    cleaned, error = _validate_preferences(data)
    if error:
        return jsonify({'message': error}), 400

    prefs_row = SessionPreferences.query.filter_by(user_id=user_id).first()
    if prefs_row is None:
        prefs_row = SessionPreferences(user_id=user_id, preferences=json.dumps(cleaned))
        db.session.add(prefs_row)
    else:
        prefs_row.preferences = json.dumps(cleaned)

    db.session.commit()
    return jsonify(prefs_row.to_dict()), 200
