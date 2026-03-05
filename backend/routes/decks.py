from flask import Blueprint, request, jsonify
import csv
import os

# Initialize blueprint for deck management
api = Blueprint('decks', __name__)

# Sample in-memory storage for decks (this can be replaced with a database)
decks = {}

@api.route('/decks', methods=['GET'])
def get_decks():
    return jsonify(decks), 200

@api.route('/decks/<deck_id>', methods=['GET'])
def get_deck(deck_id):
    deck = decks.get(deck_id)
    if deck:
        return jsonify(deck), 200
    return jsonify({'error': 'Deck not found'}), 404

@api.route('/decks', methods=['POST'])
def create_deck():
    deck_data = request.json
    deck_id = str(len(decks) + 1)
    decks[deck_id] = deck_data
    return jsonify({'id': deck_id}), 201

@api.route('/decks/<deck_id>', methods=['PUT'])
def update_deck(deck_id):
    if deck_id in decks:
        decks[deck_id] = request.json
        return jsonify({'message': 'Deck updated'}), 200
    return jsonify({'error': 'Deck not found'}), 404

@api.route('/decks/<deck_id>', methods=['DELETE'])
def delete_deck(deck_id):
    if deck_id in decks:
        del decks[deck_id]
        return jsonify({'message': 'Deck deleted'}), 204
    return jsonify({'error': 'Deck not found'}), 404

@api.route('/decks/import', methods=['POST'])
def import_decks():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if file and allowed_file(file.filename):
        reader = csv.DictReader(file.stream.read().decode('UTF-8').splitlines())
        for row in reader:
            deck_id = str(len(decks) + 1)
            decks[deck_id] = row
        return jsonify({'message': 'Decks imported', 'total': len(decks)}), 201
    return jsonify({'error': 'Invalid file format'}), 400

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ['csv']