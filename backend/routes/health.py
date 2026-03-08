from datetime import datetime, timezone

from flask import Blueprint, jsonify
from sqlalchemy import text

from models import db

health_bp = Blueprint('health', __name__)


@health_bp.route('', methods=['GET'])
def health_check():
    timestamp = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    try:
        db.session.execute(text('SELECT 1'))
        return jsonify({
            'status': 'healthy',
            'database': 'connected',
            'timestamp': timestamp,
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'database': 'disconnected',
            'error': str(e),
            'timestamp': timestamp,
        }), 503
