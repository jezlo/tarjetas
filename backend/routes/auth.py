from datetime import datetime

from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity

from models import db, User, AppSettings, Deck, Card, get_or_create_default_categories

auth_bp = Blueprint('auth', __name__)

_DEMO_CARDS = [
    {
        'question': '¿Qué es una tarjeta de memoria (flashcard)?',
        'answer': 'Una herramienta de estudio con una pregunta en el frente y la respuesta al dorso.',
        'context': 'Las tarjetas de memoria son muy útiles para memorizar conceptos clave.',
    },
    {
        'question': '¿Cómo se llama la técnica de estudiar con tarjetas espaciadas?',
        'answer': 'Repetición espaciada',
        'context': 'La repetición espaciada aumenta la retención a largo plazo revisando las tarjetas en intervalos crecientes.',
    },
    {
        'question': '¿Cuáles son los tres modos de estudio disponibles?',
        'answer': 'Estudio, Trivia y Rellenar',
        'context': 'Cada modo pone a prueba tu conocimiento de una forma diferente.',
    },
    {
        'question': '¿Qué hace el modo Trivia?',
        'answer': 'Presenta opciones múltiples para elegir la respuesta correcta.',
        'context': 'Se generan distractores a partir de las otras tarjetas del mazo.',
    },
    {
        'question': '¿Qué hace el modo Rellenar?',
        'answer': 'Solicita escribir la respuesta completa sin ver opciones.',
        'context': 'Solo funciona con tarjetas cuya respuesta es una sola palabra.',
    },
]


def _create_demo_deck(user_id):
    """Create a demo deck with sample cards for a newly registered user."""
    sin_cat, _ = get_or_create_default_categories(user_id)
    deck = Deck(
        name='🎓 Mazo Demo',
        description='Mazo de demostración para explorar la aplicación. ¡Prueba los distintos modos de estudio!',
        user_id=user_id,
        is_public=False,
        category_id=sin_cat.id,
    )
    db.session.add(deck)
    db.session.flush()  # get deck.id before creating cards
    for card_data in _DEMO_CARDS:
        card = Card(
            deck_id=deck.id,
            question=card_data['question'],
            answer=card_data['answer'],
            context=card_data.get('context'),
        )
        db.session.add(card)


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

    is_first_user = User.query.count() == 0

    user = User(
        username=username,
        email=email,
        password_hash=generate_password_hash(password),
    )
    db.session.add(user)
    db.session.flush()  # ensure user.id is available before creating the demo deck

    if is_first_user:
        _create_demo_deck(user.id)

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


