from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash

# Simulated user storage
users = {}

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    if username in users:
        return jsonify({'message': 'User already exists!'}), 400
    users[username] = generate_password_hash(password)
    return jsonify({'message': 'User registered successfully!'}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    user_password = users.get(username)
    if not user_password or not check_password_hash(user_password, password):
        return jsonify({'message': 'Invalid credentials!'}), 401
    return jsonify({'message': 'Login successful!'}), 200

@auth_bp.route('/logout', methods=['POST'])
def logout():
    return jsonify({'message': 'Logout successful!'}), 200

@auth_bp.route('/refresh-token', methods=['POST'])
def refresh_token():
    return jsonify({'message': 'Token refreshed!'}), 200

