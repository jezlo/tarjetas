from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func

from models import db, User, Deck

admin_bp = Blueprint('admin', __name__)


def _require_admin():
    """Return the current user if they are an admin, otherwise return None."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    return user if (user and user.is_admin) else None


@admin_bp.route('/users', methods=['GET'])
@jwt_required()
def list_users():
    admin = _require_admin()
    if not admin:
        return jsonify({'message': 'Admin access required'}), 403

    deck_counts = dict(
        db.session.query(Deck.user_id, func.count(Deck.id))
        .group_by(Deck.user_id)
        .all()
    )

    users = User.query.order_by(User.created_at.desc()).all()
    result = []
    for u in users:
        data = u.to_dict()
        data['deck_count'] = deck_counts.get(u.id, 0)
        result.append(data)

    return jsonify(result), 200


@admin_bp.route('/users', methods=['POST'])
@jwt_required()
def create_user():
    admin = _require_admin()
    if not admin:
        return jsonify({'message': 'Admin access required'}), 403

    data = request.get_json()
    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    is_admin = bool(data.get('is_admin', False))

    if not username or not email or not password:
        return jsonify({'message': 'username, email and password are required'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'message': 'Username already taken'}), 409

    if User.query.filter_by(email=email).first():
        return jsonify({'message': 'Email already registered'}), 409

    user = User(
        username=username,
        email=email,
        password_hash=generate_password_hash(password),
        is_admin=is_admin,
    )
    db.session.add(user)
    db.session.commit()

    result = user.to_dict()
    result['deck_count'] = 0
    return jsonify(result), 201


@admin_bp.route('/users/<int:user_id>', methods=['PUT'])
@jwt_required()
def update_user(user_id):
    admin = _require_admin()
    if not admin:
        return jsonify({'message': 'Admin access required'}), 403

    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    data = request.get_json()
    new_password = data.get('password', '').strip()

    if not new_password:
        return jsonify({'message': 'Password is required'}), 400

    user.password_hash = generate_password_hash(new_password)
    db.session.commit()

    result = user.to_dict()
    result['deck_count'] = Deck.query.filter_by(user_id=user.id).count()
    return jsonify(result), 200


@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    admin = _require_admin()
    if not admin:
        return jsonify({'message': 'Admin access required'}), 403

    if admin.id == user_id:
        return jsonify({'message': 'Cannot delete your own account'}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': 'User deleted'}), 200
