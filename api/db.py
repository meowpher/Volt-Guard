from __future__ import annotations
import os
import time
from datetime import datetime
from typing import List, Optional
from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, DateTime, Text
from sqlalchemy.orm import declarative_base, relationship, sessionmaker, Session

DB_PATH = os.environ.get("DB_PATH", os.path.join(os.path.dirname(__file__), "app.db"))
engine = create_engine(f"sqlite:///{DB_PATH}", echo=False, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    sensors = relationship("Sensor", back_populates="user", cascade="all, delete-orphan")

class Sensor(Base):
    __tablename__ = "sensors"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(120), nullable=False)
    room = Column(String(120), nullable=False)
    type = Column(String(120), default="meter")

    user = relationship("User", back_populates="sensors")
    readings = relationship("Reading", back_populates="sensor", cascade="all, delete-orphan")

class Reading(Base):
    __tablename__ = "readings"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, index=True, nullable=False)
    sensor_id = Column(Integer, ForeignKey("sensors.id"), nullable=False, index=True)
    timestamp = Column(Float, default=lambda: time.time(), index=True)
    v1 = Column(Float, nullable=False)
    v2 = Column(Float, nullable=False)
    v3 = Column(Float, nullable=False)

    sensor = relationship("Sensor", back_populates="readings")

class Anomaly(Base):
    __tablename__ = "anomalies"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, index=True, nullable=False)
    sensor_id = Column(Integer, index=True, nullable=True)
    timestamp = Column(Float, default=lambda: time.time(), index=True)
    score = Column(Float, nullable=False)
    explanation = Column(Text, default="")


def init_db():
    Base.metadata.create_all(bind=engine)


def get_session() -> Session:
    return SessionLocal()

