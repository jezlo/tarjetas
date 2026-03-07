import os
import warnings
from datetime import timedelta

_DEFAULT_SECRET = 'dev-secret-key-change-in-production'
_DEFAULT_JWT_SECRET = 'dev-jwt-secret-change-in-production'


class Config:
    DEBUG = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'
    TESTING = os.getenv('FLASK_TESTING', 'false').lower() == 'true'
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URI', 'sqlite:///tarjetas.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.getenv('SECRET_KEY', _DEFAULT_SECRET)
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', _DEFAULT_JWT_SECRET)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=int(os.getenv('JWT_TOKEN_DAYS', '30')))

    @classmethod
    def validate(cls):
        if cls.SECRET_KEY == _DEFAULT_SECRET or cls.JWT_SECRET_KEY == _DEFAULT_JWT_SECRET:
            warnings.warn(
                'Using default secret keys. Set SECRET_KEY and JWT_SECRET_KEY environment '
                'variables before deploying to production.',
                stacklevel=2,
            )

