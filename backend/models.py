from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os

db = SQLAlchemy()

CATEGORY_SIN_CATEGORIA = 'Sin Categoría'
CATEGORY_GENERAL = 'General'
_RESERVED_CATEGORY_NAMES = frozenset({CATEGORY_SIN_CATEGORIA, CATEGORY_GENERAL})


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_admin = db.Column(db.Boolean, default=False, nullable=False)
    last_login = db.Column(db.DateTime, nullable=True)
    language = db.Column(db.String(10), default='es', server_default='es', nullable=False)

    decks = db.relationship('Deck', back_populates='owner', cascade='all, delete-orphan')
    categories = db.relationship('DeckCategory', back_populates='user', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'created_at': self.created_at.isoformat() + 'Z',
            'is_admin': self.is_admin,
            'last_login': (self.last_login.isoformat() + 'Z') if self.last_login else None,
            'language': self.language,
        }


class DeckCategory(db.Model):
    __tablename__ = 'deck_categories'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    is_default = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', back_populates='categories')
    decks = db.relationship('Deck', back_populates='category')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'user_id': self.user_id,
            'is_default': self.is_default,
            'created_at': self.created_at.isoformat(),
        }


class Deck(db.Model):
    __tablename__ = 'decks'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    description = db.Column(db.String(500), default='')
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    is_public = db.Column(db.Boolean, default=False, nullable=False)
    source_deck_id = db.Column(db.Integer, db.ForeignKey('decks.id'), nullable=True)
    import_count = db.Column(db.Integer, default=0, nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey('deck_categories.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    owner = db.relationship('User', back_populates='decks')
    cards = db.relationship('Card', back_populates='deck', cascade='all, delete-orphan')
    likes = db.relationship('DeckLike', back_populates='deck', cascade='all, delete-orphan')
    category = db.relationship('DeckCategory', back_populates='decks')

    def to_dict(self, include_cards=False, include_owner=False):
        data = {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'user_id': self.user_id,
            'is_public': self.is_public,
            'created_at': self.created_at.isoformat(),
            'card_count': len(self.cards),
            'import_count': self.import_count,
            'like_count': len(self.likes),
            'category_id': self.category_id,
        }
        if include_owner:
            data['owner_username'] = self.owner.username if self.owner else None
        if include_cards:
            data['cards'] = [c.to_dict() for c in self.cards]
        return data


class Card(db.Model):
    __tablename__ = 'cards'

    id = db.Column(db.Integer, primary_key=True)
    deck_id = db.Column(db.Integer, db.ForeignKey('decks.id'), nullable=False)
    question = db.Column(db.Text, nullable=False)
    answer = db.Column(db.Text, nullable=False)
    context = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    deck = db.relationship('Deck', back_populates='cards')
    statistics = db.relationship('CardStatistic', back_populates='card', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'deck_id': self.deck_id,
            'question': self.question,
            'answer': self.answer,
            'context': self.context,
            'created_at': self.created_at.isoformat(),
        }


class CardStatistic(db.Model):
    __tablename__ = 'card_statistics'

    id = db.Column(db.Integer, primary_key=True)
    card_id = db.Column(db.Integer, db.ForeignKey('cards.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    correct_count = db.Column(db.Integer, default=0)
    wrong_count = db.Column(db.Integer, default=0)
    last_reviewed = db.Column(db.DateTime, default=datetime.utcnow)
    is_known = db.Column(db.Boolean, default=False, nullable=False)
    is_marked = db.Column(db.Boolean, default=False, nullable=False)

    card = db.relationship('Card', back_populates='statistics')

    def to_dict(self):
        return {
            'id': self.id,
            'card_id': self.card_id,
            'user_id': self.user_id,
            'correct_count': self.correct_count,
            'wrong_count': self.wrong_count,
            'last_reviewed': self.last_reviewed.isoformat(),
            'is_known': self.is_known,
            'is_marked': self.is_marked,
        }


class StudySession(db.Model):
    __tablename__ = 'study_sessions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    deck_id = db.Column(db.Integer, db.ForeignKey('decks.id'), nullable=False)
    correct_count = db.Column(db.Integer, default=0)
    wrong_count = db.Column(db.Integer, default=0)
    session_type = db.Column(db.String(20), nullable=False, default='study')
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    ended_at = db.Column(db.DateTime, nullable=True)

    deck = db.relationship('Deck')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'deck_id': self.deck_id,
            'deck_name': self.deck.name if self.deck else None,
            'correct_count': self.correct_count,
            'wrong_count': self.wrong_count,
            'session_type': self.session_type,
            'started_at': self.started_at.isoformat() + 'Z',
            'ended_at': (self.ended_at.isoformat() + 'Z') if self.ended_at else None,
        }


class AppSettings(db.Model):
    __tablename__ = 'app_settings'

    id = db.Column(db.Integer, primary_key=True)
    registration_enabled = db.Column(db.Boolean, default=True, nullable=False)
    timezone = db.Column(db.String(50), default='UTC', nullable=False, server_default='UTC')

    @classmethod
    def get(cls):
        """Return the singleton settings row, creating it if it does not exist."""
        settings = cls.query.first()
        if settings is None:
            enabled = os.getenv('REGISTRATION_ENABLED', 'true').lower() != 'false'
            settings = cls(registration_enabled=enabled)
            db.session.add(settings)
            db.session.commit()
        return settings


class DeckLike(db.Model):
    __tablename__ = 'deck_likes'

    id = db.Column(db.Integer, primary_key=True)
    deck_id = db.Column(db.Integer, db.ForeignKey('decks.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (db.UniqueConstraint('deck_id', 'user_id', name='uq_deck_like'),)

    deck = db.relationship('Deck', back_populates='likes')


class SessionPreferences(db.Model):
    __tablename__ = 'session_preferences'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    preferences = db.Column(db.Text, nullable=False, default='{}')
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        import json
        try:
            prefs = json.loads(self.preferences)
        except (ValueError, TypeError):
            prefs = {}
        return prefs


def get_or_create_default_categories(user_id):
    """Ensure 'Sin Categoría' and 'General' exist for the user.

    Returns a tuple (sin_categoria, general).  The function calls
    ``db.session.flush()`` internally so that IDs are available on the returned
    objects even before the caller issues a commit.  The caller is still
    responsible for calling ``db.session.commit()`` to persist the changes.
    """
    sin_cat = DeckCategory.query.filter_by(user_id=user_id, name=CATEGORY_SIN_CATEGORIA).first()
    if not sin_cat:
        sin_cat = DeckCategory(name=CATEGORY_SIN_CATEGORIA, user_id=user_id, is_default=True)
        db.session.add(sin_cat)

    general = DeckCategory.query.filter_by(user_id=user_id, name=CATEGORY_GENERAL).first()
    if not general:
        general = DeckCategory(name=CATEGORY_GENERAL, user_id=user_id, is_default=True)
        db.session.add(general)

    db.session.flush()
    return sin_cat, general

