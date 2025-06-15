from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

def get_engine(database_url: str):
    return create_engine(database_url)

def init_db(database_url: str):
    engine = get_engine(database_url)
    Base.metadata.create_all(engine)
    return engine 