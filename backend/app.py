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
    from routes.admin import admin_bp
    from routes.categories import categories_bp
    from routes.health import health_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(decks_bp, url_prefix='/api/decks')
    app.register_blueprint(cards_bp, url_prefix='/api/cards')
    app.register_blueprint(statistics_bp, url_prefix='/api/statistics')
    app.register_blueprint(sessions_bp, url_prefix='/api/sessions')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(categories_bp, url_prefix='/api/categories')
    app.register_blueprint(health_bp, url_prefix='/api/health')

    with app.app_context():
        db.create_all()
        _migrate_db(db)

    return app


def _assign_existing_decks_to_default_category(db):
    """After adding category_id column, assign all existing decks to their user's 'Sin Categoría'."""
    from models import Deck, get_or_create_default_categories
    from sqlalchemy import text

    user_ids = [row[0] for row in db.session.execute(text('SELECT DISTINCT user_id FROM decks')).fetchall()]
    for user_id in user_ids:
        sin_cat, _ = get_or_create_default_categories(user_id)
        db.session.flush()
        db.session.execute(
            text('UPDATE decks SET category_id = :cat_id WHERE user_id = :uid AND category_id IS NULL'),
            {'cat_id': sin_cat.id, 'uid': user_id},
        )
    db.session.commit()


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
    if 'import_count' not in decks_columns:
        with db.engine.connect() as conn:
            conn.execute(text('ALTER TABLE decks ADD COLUMN import_count INTEGER NOT NULL DEFAULT 0'))
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
    users_columns = [col['name'] for col in inspector.get_columns('users')]
    if 'is_admin' not in users_columns:
        with db.engine.connect() as conn:
            conn.execute(text('ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT 0'))
            conn.commit()
    if 'last_login' not in users_columns:
        with db.engine.connect() as conn:
            conn.execute(text('ALTER TABLE users ADD COLUMN last_login DATETIME'))
            conn.commit()
    if 'language' not in users_columns:
        with db.engine.connect() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN language VARCHAR(10) NOT NULL DEFAULT 'es'"))
            conn.commit()
    cards_columns = [col['name'] for col in inspector.get_columns('cards')]
    if 'context' not in cards_columns:
        with db.engine.connect() as conn:
            conn.execute(text('ALTER TABLE cards ADD COLUMN context TEXT'))
            conn.commit()
    decks_columns = [col['name'] for col in inspector.get_columns('decks')]
    if 'category_id' not in decks_columns:
        # deck_categories table already exists at this point because db.create_all() ran first
        with db.engine.connect() as conn:
            conn.execute(text('ALTER TABLE decks ADD COLUMN category_id INTEGER REFERENCES deck_categories(id)'))
            conn.commit()
        _assign_existing_decks_to_default_category(db)
    if 'study_sessions' in inspector.get_table_names():
        session_columns = [col['name'] for col in inspector.get_columns('study_sessions')]
        if 'session_type' not in session_columns:
            with db.engine.connect() as conn:
                conn.execute(text("ALTER TABLE study_sessions ADD COLUMN session_type VARCHAR(20) NOT NULL DEFAULT 'study'"))
                conn.commit()
    if 'app_settings' in inspector.get_table_names():
        app_settings_columns = [col['name'] for col in inspector.get_columns('app_settings')]
        if 'timezone' not in app_settings_columns:
            with db.engine.connect() as conn:
                conn.execute(text("ALTER TABLE app_settings ADD COLUMN timezone VARCHAR(50) NOT NULL DEFAULT 'UTC'"))
                conn.commit()
    # Ensure the singleton AppSettings row exists (initialised from env var).
    from models import AppSettings
    AppSettings.get()

