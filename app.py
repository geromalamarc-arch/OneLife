from flask import Flask, render_template, redirect, url_for, request, flash, jsonify
from flask_login import LoginManager, login_user, login_required, logout_user, current_user
from dotenv import load_dotenv
import os, traceback

from modules.database import db, init_db, User, Note, Password

load_dotenv()

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "OneLife-BSIT-2026-FIXED")
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///" + os.path.join(os.path.abspath(os.path.dirname(__file__)), "onelife.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SQLALCHEMY_ECHO"] = False  # set True to see every SQL query

# INIT
init_db(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "login"

@login_manager.user_loader
def load_user(uid): return db.session.get(User, int(uid))

# ==================== PAGES ====================
@app.route("/")
def index():
    if current_user.is_authenticated: return redirect(url_for("vault"))
    return render_template("index.html")

@app.route("/signup", methods=["GET","POST"])
def signup():
    if current_user.is_authenticated: return redirect(url_for("vault"))
    if request.method == "POST":
        email = request.form["email"].strip().lower()
        pw = request.form["password"]
        if len(pw) < 6: flash("❌ Password min 6 chars"); return redirect(url_for("signup"))
        if User.query.filter_by(email=email).first(): flash("❌ Email exists — login"); return redirect(url_for("login"))
        u = User(email=email); u.set_password(pw)
        db.session.add(u); db.session.commit()
        login_user(u); flash("✅ Account created!")
        return redirect(url_for("vault"))
    return render_template("signup.html")

@app.route("/login", methods=["GET","POST"])
def login():
    if current_user.is_authenticated: return redirect(url_for("vault"))
    if request.method == "POST":
        u = User.query.filter_by(email=request.form["email"].strip().lower()).first()
        if u and u.check_password(request.form["password"]):
            login_user(u); return redirect(url_for("vault"))
        flash("❌ Wrong email/password")
    return render_template("login.html")

@app.route("/logout")
@login_required
def logout(): logout_user(); return redirect(url_for("index"))

@app.route("/vault")
@login_required
def vault(): return render_template("vault.html", email=current_user.email)

# ==================== API: NOTES ====================
@app.route("/api/notes")
@login_required
def api_notes():
    return jsonify([n.to_dict() for n in Note.query.filter_by(user_id=current_user.id).order_by(Note.updated_at.desc()).all()])

@app.route("/api/notes/save", methods=["POST"])
@login_required
def api_note_save():
    try:
        d = request.get_json(force=True)
        nid = d.get("id")
        if nid:
            n = Note.query.filter_by(id=nid, user_id=current_user.id).first()
            if not n: return jsonify({"ok":0,"error":"Not found"}), 404
        else:
            n = Note(user_id=current_user.id)
            db.session.add(n)
        n.title = d["title"]; n.body = d["body"]
        db.session.commit()
        print("✅ NOTE SAVED id=", n.id)
        return jsonify({"ok":1,"id":n.id})
    except Exception as e:
        print("❌ NOTE SAVE ERROR:\n", traceback.format_exc())
        return jsonify({"ok":0,"error":str(e)}), 500

@app.route("/api/notes/delete/<int:nid>", methods=["POST"])
@login_required
def api_note_delete(nid):
    n = Note.query.filter_by(id=nid, user_id=current_user.id).first()
    if n: db.session.delete(n); db.session.commit(); print("🗑️ Note",nid,"deleted")
    return jsonify({"ok":1})

# ==================== API: PASSWORDS ====================
@app.route("/api/passwords")
@login_required
def api_passwords():
    return jsonify([p.to_dict() for p in Password.query.filter_by(user_id=current_user.id).order_by(Password.updated_at.desc()).all()])

@app.route("/api/all")
@login_required
def api_all():
    nn = [n.to_dict() for n in Note.query.filter_by(user_id=current_user.id).all()]
    pp = [p.to_dict() for p in Password.query.filter_by(user_id=current_user.id).all()]
    return jsonify({"notes":nn,"passwords":pp,"count":len(nn)+len(pp)})

@app.route("/api/passwords/save", methods=["POST"])
@login_required
def api_pass_save():
    try:
        d = request.get_json(force=True)
        if d.get("id"):
            p = Password.query.filter_by(id=d["id"], user_id=current_user.id).first()
            if not p: return jsonify({"ok":0}), 404
        else:
            p = Password(user_id=current_user.id)
            db.session.add(p)
        p.name=d["name"]; p.username=d.get("username","")
        p.password=d["password"]; p.website=d.get("website",""); p.notes=d.get("notes","")
        db.session.commit()
        print("✅ PASSWORD SAVED id=", p.id)
        return jsonify({"ok":1,"id":p.id})
    except Exception as e:
        print("❌ PASS SAVE ERROR:\n", traceback.format_exc())
        return jsonify({"ok":0,"error":str(e)}), 500

@app.route("/api/passwords/delete/<int:pid>", methods=["POST"])
@login_required
def api_pass_delete(pid):
    p = Password.query.filter_by(id=pid, user_id=current_user.id).first()
    if p: db.session.delete(p); db.session.commit(); print("🗑️ Pass",pid,"deleted")
    return jsonify({"ok":1})

if __name__ == "__main__":
    app.run(debug=True)