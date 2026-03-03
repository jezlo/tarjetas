from flask import Flask
from flask_cors import CORS


def create_app():
    app = Flask(__name__)
    CORS(app)  # Enable CORS for all routes

    with app.app_context():
        # Register blueprints here
        # from .your_blueprint import your_blueprint
        # app.register_blueprint(your_blueprint)

    return app
