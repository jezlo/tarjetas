from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from models import (
    db,
    Deck,
    DeckCategory,
    get_or_create_default_categories,
    CATEGORY_GENERAL,
    _RESERVED_CATEGORY_NAMES,
)

categories_bp = Blueprint('categories', __name__)


@categories_bp.route('', methods=['GET'])
@jwt_required()
def get_categories():
    user_id = int(get_jwt_identity())
    get_or_create_default_categories(user_id)
    db.session.commit()
    categories = DeckCategory.query.filter_by(user_id=user_id).order_by(DeckCategory.created_at.asc()).all()
    return jsonify([c.to_dict() for c in categories]), 200


@categories_bp.route('', methods=['POST'])
@jwt_required()
def create_category():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'message': 'name is required'}), 400
    if name in _RESERVED_CATEGORY_NAMES:
        return jsonify({'message': f'"{name}" is a reserved category name'}), 400

    category = DeckCategory(name=name, user_id=user_id, is_default=False)
    db.session.add(category)
    db.session.commit()
    return jsonify(category.to_dict()), 201


@categories_bp.route('/<int:category_id>', methods=['PUT'])
@jwt_required()
def update_category(category_id):
    user_id = int(get_jwt_identity())
    category = DeckCategory.query.filter_by(id=category_id, user_id=user_id).first_or_404()
    if category.is_default:
        return jsonify({'message': 'Default categories cannot be modified'}), 403

    data = request.get_json()
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'message': 'name is required'}), 400
    if name in _RESERVED_CATEGORY_NAMES:
        return jsonify({'message': f'"{name}" is a reserved category name'}), 400

    category.name = name
    db.session.commit()
    return jsonify(category.to_dict()), 200


@categories_bp.route('/<int:category_id>', methods=['DELETE'])
@jwt_required()
def delete_category(category_id):
    user_id = int(get_jwt_identity())
    category = DeckCategory.query.filter_by(id=category_id, user_id=user_id).first_or_404()
    if category.is_default:
        return jsonify({'message': 'Default categories cannot be deleted'}), 403

    sin_cat, _ = get_or_create_default_categories(user_id)
    db.session.flush()

    Deck.query.filter_by(user_id=user_id, category_id=category_id).update({'category_id': sin_cat.id})
    db.session.delete(category)
    db.session.commit()
    return jsonify({'message': 'Category deleted'}), 200


@categories_bp.route('/<int:category_id>/decks', methods=['GET'])
@jwt_required()
def get_decks_by_category(category_id):
    user_id = int(get_jwt_identity())
    category = DeckCategory.query.filter_by(id=category_id, user_id=user_id).first_or_404()

    if category.name == CATEGORY_GENERAL:
        decks = Deck.query.filter_by(user_id=user_id).order_by(Deck.created_at.desc()).all()
    else:
        decks = Deck.query.filter_by(user_id=user_id, category_id=category_id).order_by(Deck.created_at.desc()).all()

    return jsonify([d.to_dict() for d in decks]), 200


@categories_bp.route('/<int:category_id>/decks/<int:deck_id>', methods=['PUT'])
@jwt_required()
def assign_deck_to_category(category_id, deck_id):
    user_id = int(get_jwt_identity())
    category = DeckCategory.query.filter_by(id=category_id, user_id=user_id).first_or_404()
    if category.name == CATEGORY_GENERAL:
        return jsonify({'message': 'Cannot assign decks to the "General" category'}), 400
    deck = Deck.query.filter_by(id=deck_id, user_id=user_id).first_or_404()
    deck.category_id = category.id
    db.session.commit()
    return jsonify(deck.to_dict()), 200
