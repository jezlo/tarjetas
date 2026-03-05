from flask import Blueprint, request, jsonify
import csv

# Define the blueprint
blueprint = Blueprint('decks', __name__)

# In-memory storage for decks
decks = []

@blueprint.route('/decks', methods=['GET'])
def get_decks():
    return jsonify(decks)

@blueprint.route('/decks', methods=['POST'])
def add_deck():
    data = request.json
    decks.append(data)
    return jsonify(data), 201

@blueprint.route('/decks/import', methods=['POST'])
def import_decks():
    file = request.files['file']
    if not file:
        return 'No file provided', 400

    csv_data = csv.reader(file.stream)  # Read CSV file
    for row in csv_data:
        deck = {'name': row[0], 'cards': row[1:]}  # Assuming CSV format
        decks.append(deck)
    return jsonify(decks), 201
