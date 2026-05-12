import sys
print("Python:", sys.version)
try:
    import sqlalchemy
    print("SQLAlchemy:", sqlalchemy.__version__)
except Exception as e:
    print("SQLAlchemy error:", e)

try:
    from database import Base, engine
    print("Database import OK")
    Base.metadata.create_all(bind=engine)
    print("Tables created OK")
except Exception as e:
    print("Database error:", e)
