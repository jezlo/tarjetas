from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    decks = db.relationship('Deck', back_populates='owner', cascade='all, delete-orphan')

    def to_dict(self):
        return {'id': self.id, 'username': self.username, 'email': self.email, 'created_at': self.created_at.isoformat()}


class Deck(db.Model):
    __tablename__ = 'decks'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    description = db.Column(db.String(500), default='')
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    is_public = db.Column(db.Boolean, default=False, nullable=False)
    source_deck_id = db.Column(db.Integer, db.ForeignKey('decks.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    owner = db.relationship('User', back_populates='decks')
    cards = db.relationship('Card', back_populates='deck', cascade='all, delete-orphan')

    def to_dict(self, include_cards=False, include_owner=False):
        data = {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'user_id': self.user_id,
            'is_public': self.is_public,
            'created_at': self.created_at.isoformat(),
            'card_count': len(self.cards),
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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    deck = db.relationship('Deck', back_populates='cards')
    statistics = db.relationship('CardStatistic', back_populates='card', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'deck_id': self.deck_id,
            'question': self.question,
            'answer': self.answer,
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

    card = db.relationship('Card', back_populates='statistics')

    def to_dict(self):
        return {
            'id': self.id,
            'card_id': self.card_id,
            'user_id': self.user_id,
            'correct_count': self.correct_count,
            'wrong_count': self.wrong_count,
            'last_reviewed': self.last_reviewed.isoformat(),
        }

