from datetime import datetime

from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity

from models import db, User, AppSettings

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
def register():
    settings = AppSettings.get()
    if not settings.registration_enabled:
        return jsonify({'message': 'El registro se encuentra deshabilitado temporalmente, favor de comunicarse con el administrador'}), 409

    data = request.get_json()
    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')

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
    )
    db.session.add(user)
    db.session.commit()

    access_token = create_access_token(identity=str(user.id))
    return jsonify({'access_token': access_token, 'user': user.to_dict()}), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '')

    user = User.query.filter_by(username=username).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({'message': 'Invalid credentials'}), 401

    user.last_login = datetime.utcnow()
    db.session.commit()

    access_token = create_access_token(identity=str(user.id))
    return jsonify({'access_token': access_token, 'user': user.to_dict()}), 200


@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    data = request.get_json()
    email = data.get('email', '').strip()
    current_password = data.get('current_password', '')
    new_password = data.get('new_password', '')
    language = data.get('language', '').strip()

    if email and email != user.email:
        if User.query.filter_by(email=email).first():
            return jsonify({'message': 'Email already in use'}), 409
        user.email = email

    if new_password:
        if not current_password:
            return jsonify({'message': 'Current password is required to change password'}), 400
        if not check_password_hash(user.password_hash, current_password):
            return jsonify({'message': 'Current password is incorrect'}), 401
        user.password_hash = generate_password_hash(new_password)

    if language and language in ('es', 'en'):
        user.language = language

    db.session.commit()
    return jsonify({'user': user.to_dict()}), 200


