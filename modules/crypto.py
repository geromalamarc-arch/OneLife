from cryptography.fernet import Fernet
import os
from dotenv import load_dotenv, set_key

# Path to your .env file
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_PATH = os.path.join(BASE_DIR, ".env")

def _load_or_create_key() -> bytes:
    load_dotenv(ENV_PATH, override=True)
    key_str = os.getenv("ENCRYPTION_KEY", "").strip()

    # --- CHECK IF KEY IS ALREADY VALID ---
    try:
        if key_str and key_str != "AUTO_GENERATE":
            # Test if it's a real Fernet key
            test = Fernet(key_str.encode())
            print("🔐 AES-256 Key loaded successfully from .env")
            return key_str.encode()
    except Exception:
        pass  # Invalid key → we make a new one below

    # --- MAKE BRAND NEW VALID KEY + SAVE TO .env ---
    print("\n⚙️  No valid key found — GENERATING NEW AES-256 KEY...")
    new_key = Fernet.generate_key()
    new_key_str = new_key.decode()

    # Write straight into .env automatically
    set_key(ENV_PATH, "ENCRYPTION_KEY", new_key_str)
    load_dotenv(ENV_PATH, override=True)

    print("✅ NEW KEY SAVED TO .env — DO NOT EDIT/DELETE IT!")
    print("⚠️  IF YOU LOSE THIS KEY = ALL ENCRYPTED DATA IS GONE FOREVER\n")
    return new_key

# INIT CIPHER ONCE
_KEY_BYTES = _load_or_create_key()
_cipher = Fernet(_KEY_BYTES)

# -------------------- PUBLIC FUNCTIONS --------------------
def encrypt_text(plain: str) -> str:
    if not plain:
        return ""
    return _cipher.encrypt(plain.encode("utf-8")).decode("utf-8")

def decrypt_text(encrypted: str) -> str:
    if not encrypted:
        return ""
    try:
        return _cipher.decrypt(encrypted.encode("utf-8")).decode("utf-8")
    except Exception:
        return "[🔒 CANNOT DECRYPT — WRONG KEY OR CORRUPTED]"

def generate_new_key() -> str:
    return Fernet.generate_key().decode()