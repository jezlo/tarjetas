import os

class Config:
    DEBUG = os.getenv('FLASK_DEBUG', False)
    TESTING = os.getenv('FLASK_TESTING', False)
    DATABASE_URI = os.getenv('DATABASE_URI', 'sqlite:///default.db')
    SECRET_KEY = os.getenv('SECRET_KEY', 'your_secret_key_here')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your_jwt_secret_key_here')
