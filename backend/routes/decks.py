from flask import Blueprint, request, jsonify
from flask_sqlalchemy import SQLAlchemy

# Assuming you have SQLAlchemy set up
# Initialize SQLAlchemy instance
# db = SQLAlchemy()

# Blueprint for decks
blueprint = Blueprint('decks', __name__)

class Deck(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(300))  # Optional description
    # Add any other fields you need

@blueprint.route('/decks', methods=['POST'])
def create_deck():
    data = request.get_json()
    new_deck = Deck(name=data['name'], description=data.get('description'))
    db.session.add(new_deck)
    db.session.commit()
    return jsonify({'message': 'Deck created', 'deck': {'id': new_deck.id, 'name': new_deck.name}}), 201

@blueprint.route('/decks/<int:id>', methods=['GET'])
def get_deck(id):
    deck = Deck.query.get_or_404(id)
    return jsonify({'id': deck.id, 'name': deck.name, 'description': deck.description})

@blueprint.route('/decks/<int:id>', methods=['PUT'])
def update_deck(id):
    deck = Deck.query.get_or_404(id)
    data = request.get_json()
    deck.name = data['name']
    deck.description = data.get('description', deck.description)
    db.session.commit()
    return jsonify({'message': 'Deck updated', 'deck': {'id': deck.id, 'name': deck.name}})

@blueprint.route('/decks/<int:id>', methods=['DELETE'])
def delete_deck(id):
    deck = Deck.query.get_or_404(id)
    db.session.delete(deck)
    db.session.commit()
    return jsonify({'message': 'Deck deleted'})

@blueprint.route('/decks', methods=['GET'])
def list_decks():
    decks = Deck.query.all()
    return jsonify([{'id': deck.id, 'name': deck.name} for deck in decks])

# Make sure to register the blueprint in your app
# app.register_blueprint(blueprint, url_prefix='/api')
