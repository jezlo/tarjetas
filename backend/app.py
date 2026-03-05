from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from config import Config
from models import db


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    JWTManager(app)
    CORS(app, resources={r'/api/*': {'origins': 'http://localhost:3000'}})

    from routes.auth import auth_bp
    from routes.decks import decks_bp
    from routes.cards import cards_bp
    from routes.statistics import statistics_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(decks_bp, url_prefix='/api/decks')
    app.register_blueprint(cards_bp, url_prefix='/api/cards')
    app.register_blueprint(statistics_bp, url_prefix='/api/statistics')

    with app.app_context():
        db.create_all()

    return app

