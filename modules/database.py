from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from .crypto import encrypt_text, decrypt_text

db = SQLAlchemy()

# ==================== USERS ====================
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, raw):
        self.password_hash = generate_password_hash(raw)

    def check_password(self, raw):
        return check_password_hash(self.password_hash, raw)

    def is_active(self): return True
    def is_authenticated(self): return True
    def is_anonymous(self): return False
    def get_id(self): return str(self.id)


# ==================== NOTES — AES-256 ENCRYPTED ====================
class Note(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    _title = db.Column("title", db.Text, nullable=False)
    _body  = db.Column("body",  db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # --- TITLE ---
    @property
    def title(self):
        return decrypt_text(self._title)

    @title.setter
    def title(self, v):
        self._title = encrypt_text(v)

    # --- BODY ---
    @property
    def body(self):
        return decrypt_text(self._body)

    @body.setter
    def body(self, v):
        self._body = encrypt_text(v)

    def to_dict(self):
        return {
            "id": self.id,
            "type": "note",
            "title": self.title,
            "body": self.body,
            "date": self.updated_at.strftime("%Y-%m-%d %H:%M")
        }


# ==================== PASSWORDS — AES-256 ENCRYPTED ====================
class Password(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    _name     = db.Column("name",     db.Text, nullable=False)
    _username = db.Column("username", db.Text, default="")
    _password = db.Column("password", db.Text, nullable=False)
    _website  = db.Column("website",  db.Text, default="")
    _notes    = db.Column("notes",    db.Text, default="")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # --- NAME ---
    @property
    def name(self):
        return decrypt_text(self._name)
    @name.setter
    def name(self, v):
        self._name = encrypt_text(v)

    # --- USERNAME ---
    @property
    def username(self):
        return decrypt_text(self._username)
    @username.setter
    def username(self, v):
        self._username = encrypt_text(v)

    # --- PASSWORD ---
    @property
    def password(self):
        return decrypt_text(self._password)
    @password.setter
    def password(self, v):
        self._password = encrypt_text(v)

    # --- WEBSITE ---
    @property
    def website(self):
        return decrypt_text(self._website)
    @website.setter
    def website(self, v):
        self._website = encrypt_text(v)

    # --- NOTES ---
    @property
    def notes(self):
        return decrypt_text(self._notes)
    @notes.setter
    def notes(self, v):
        self._notes = encrypt_text(v)

    def to_dict(self):
        return {
            "id": self.id,
            "type": "pass",
            "name": self.name,
            "username": self.username,
            "password": self.password,
            "website": self.website,
            "notes": self.notes,
            "date": self.updated_at.strftime("%Y-%m-%d %H:%M")
        }


# ==================== INIT DB — CREATE ALL TABLES ====================
def init_db(app):
    db.init_app(app)
    with app.app_context():
        db.create_all()
        tables = [t.name for t in db.metadata.tables.values()]
        print("✅ DATABASE OK — TABLES CREATED:", tables)