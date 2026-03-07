from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from config import Config
from models import db


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    config_class.validate()

    db.init_app(app)
    JWTManager(app)
    CORS(app, resources={r'/api/*': {'origins': 'http://localhost:3000'}})

    from routes.auth import auth_bp
    from routes.decks import decks_bp
    from routes.cards import cards_bp
    from routes.statistics import statistics_bp
    from routes.sessions import sessions_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(decks_bp, url_prefix='/api/decks')
    app.register_blueprint(cards_bp, url_prefix='/api/cards')
    app.register_blueprint(statistics_bp, url_prefix='/api/statistics')
    app.register_blueprint(sessions_bp, url_prefix='/api/sessions')

    with app.app_context():
        db.create_all()
        _migrate_db(db)

    return app


def _migrate_db(db):
    """Apply lightweight schema migrations for columns added after initial release."""
    from sqlalchemy import text, inspect
    inspector = inspect(db.engine)
    decks_columns = [col['name'] for col in inspector.get_columns('decks')]
    if 'is_public' not in decks_columns:
        with db.engine.connect() as conn:
            # SQLite represents booleans as integers; DEFAULT 0 means False
            conn.execute(text('ALTER TABLE decks ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT 0'))
            conn.commit()
    if 'source_deck_id' not in decks_columns:
        with db.engine.connect() as conn:
            conn.execute(text('ALTER TABLE decks ADD COLUMN source_deck_id INTEGER REFERENCES decks(id)'))
            conn.commit()
    card_statistics_columns = [col['name'] for col in inspector.get_columns('card_statistics')]
    if 'is_known' not in card_statistics_columns:
        with db.engine.connect() as conn:
            conn.execute(text('ALTER TABLE card_statistics ADD COLUMN is_known BOOLEAN NOT NULL DEFAULT 0'))
            conn.commit()
    if 'is_marked' not in card_statistics_columns:
        with db.engine.connect() as conn:
            conn.execute(text('ALTER TABLE card_statistics ADD COLUMN is_marked BOOLEAN NOT NULL DEFAULT 0'))
            conn.commit()

