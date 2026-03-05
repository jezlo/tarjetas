from flask import Blueprint, request, jsonify
import csv
import os

# Create a blueprint for the deck routes
routes = Blueprint('decks', __name__)

# Route to import decks from a CSV file
@routes.route('/decks/import', methods=['POST'])
def import_decks():
    file = request.files['file']
    if not file:
        return jsonify({'error': 'No file provided'}), 400
    
    decks = []
    try:
        # Read CSV file
        csv_reader = csv.DictReader(file.stream)
        for row in csv_reader:
            decks.append(row)
    except Exception as e:
        return jsonify({'error': str(e)}), 400
    
    return jsonify({'decks': decks}), 201

# Route to manage decks (a basic structure)
@routes.route('/decks', methods=['GET', 'POST'])
def manage_decks():
    if request.method == 'GET':
        return jsonify({'decks': []})  # This should return the list of decks
    elif request.method == 'POST':
        data = request.json
        # Here you would save the new deck (data) into your datastore
        return jsonify({'message': 'Deck created', 'deck': data}), 201
