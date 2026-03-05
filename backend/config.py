import os

class Config:
    DEBUG = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'
    TESTING = os.getenv('FLASK_TESTING', 'false').lower() == 'true'
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URI', 'sqlite:///tarjetas.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'dev-jwt-secret-change-in-production')

