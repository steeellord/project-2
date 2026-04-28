import os, json, sqlite3, hashlib, time
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import numpy as np
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder='dist', static_url_path='')
CORS(app)

# ─── Model loading (optional – graceful fallback if TF not installed) ──────────
MODEL = None
try:
    import tensorflow as tf
    MODEL = tf.keras.models.load_model('model.h5', compile=False)
    print("[INFO] Model loaded successfully.")
except Exception as e:
    print(f"[WARN] Could not load TF model: {e}")
    print("[WARN] /predict will return a mock result until tensorflow is installed.")

with open('classes.json') as f:
    CLASS_NAMES = json.load(f)   # { "0": "Apple___Apple_scab", ... }

# ─── Gemini chat client ────────────────────────────────────────────────────────
from google import genai

GEMINI_KEY = os.getenv('GEMINI_API_KEY', '')
_genai_client = None
if GEMINI_KEY:
    try:
        _genai_client = genai.Client(api_key=GEMINI_KEY)
        print("[INFO] Gemini client ready.")
    except Exception as e:
        print(f"[WARN] Gemini setup failed: {e}")

# ─── Database ─────────────────────────────────────────────────────────────────
DB_PATH = 'capstone.db'

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT    UNIQUE NOT NULL,
        name     TEXT    NOT NULL,
        email    TEXT,
        password TEXT    NOT NULL
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS scans (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id   INTEGER NOT NULL,
        plant     TEXT,
        disease   TEXT,
        confidence REAL,
        timestamp TEXT DEFAULT (datetime('now'))
    )''')
    conn.commit()
    conn.close()

init_db()

# ─── Helpers ──────────────────────────────────────────────────────────────────
def hash_pw(pw):
    return hashlib.sha256(pw.encode()).hexdigest()

def preprocess_image(img: Image.Image):
    img = img.convert('RGB').resize((224, 224))
    arr = np.array(img, dtype=np.float32) / 255.0
    return np.expand_dims(arr, 0)

def parse_label(label_str):
    """'Apple___Apple_scab'  ->  plant='Apple', disease='Apple scab'"""
    parts = label_str.split('___')
    plant = parts[0].replace('_', ' ')
    disease = parts[1].replace('_', ' ') if len(parts) > 1 else 'Unknown'
    return plant, disease

# ─── Routes ───────────────────────────────────────────────────────────────────

@app.route('/signup', methods=['POST'])
def signup():
    data = request.get_json(force=True)
    username = (data.get('username') or '').strip()
    name     = (data.get('name')     or '').strip()
    password = (data.get('password') or '').strip()
    email    = (data.get('email')    or '').strip()

    if not username or not password or not name:
        return jsonify({'error': 'Username, name and password are required'}), 400

    conn = get_db()
    try:
        conn.execute(
            'INSERT INTO users (username, name, email, password) VALUES (?,?,?,?)',
            (username, name, email, hash_pw(password))
        )
        conn.commit()
        row = conn.execute('SELECT id, name, email FROM users WHERE username=?', (username,)).fetchone()
        return jsonify({'userId': row['id'], 'name': row['name'], 'email': row['email']}), 201
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Username already taken'}), 409
    finally:
        conn.close()


@app.route('/login', methods=['POST'])
def login():
    data = request.get_json(force=True)
    username = (data.get('username') or '').strip()
    password = (data.get('password') or '').strip()

    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400

    conn = get_db()
    row = conn.execute(
        'SELECT id, name, email, password FROM users WHERE username=?', (username,)
    ).fetchone()
    conn.close()

    if not row or row['password'] != hash_pw(password):
        return jsonify({'error': 'Invalid username or password'}), 401

    return jsonify({'userId': row['id'], 'name': row['name'], 'email': row['email']})


@app.route('/predict', methods=['POST'])
def predict():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']
    try:
        img = Image.open(file.stream)
    except Exception:
        return jsonify({'error': 'Invalid image file'}), 400

    if MODEL is None:
        # Graceful mock – lets the UI work even without tensorflow
        label = CLASS_NAMES.get('0', 'Apple___Apple_scab')
        plant, disease = parse_label(label)
        return jsonify({
            'plant': plant,
            'disease': disease,
            'confidence': 0.0,
            'warning': 'TensorFlow not installed – mock result returned'
        })

    arr = preprocess_image(img)
    preds = MODEL.predict(arr)
    idx = int(np.argmax(preds[0]))
    conf = float(np.max(preds[0]))
    label = CLASS_NAMES.get(str(idx), 'Unknown___Unknown')
    plant, disease = parse_label(label)

    return jsonify({'plant': plant, 'disease': disease, 'confidence': round(conf * 100, 2)})


@app.route('/chat', methods=['POST'])
def chat():
    data = request.get_json(force=True)
    message  = data.get('message', '').strip()
    plant    = data.get('plant', '')
    disease  = data.get('disease', '')
    language = data.get('language', 'en')

    if not message:
        return jsonify({'error': 'Empty message'}), 400

    lang_map = {'hi': 'Hindi', 'ta': 'Tamil', 'en': 'English'}
    lang_name = lang_map.get(language, 'English')

    system = (
        f"You are an expert agricultural assistant. "
        f"{'The user is asking about a ' + plant + ' plant affected by ' + disease + '. ' if plant and disease else ''}"
        f"Reply concisely in {lang_name}. Keep responses under 200 words."
    )

    if _genai_client is None:
        return jsonify({'reply': 'AI chat unavailable – GEMINI_API_KEY not configured.'}), 200

    try:
        import time as _time
        # Try models in order, falling back on quota/overload/not-found errors
        models_to_try = [
            'gemini-2.0-flash-lite',
            'gemini-2.0-flash',
            'gemini-2.5-flash',
            'gemini-2.0-flash-001',
            'gemini-flash-latest',
        ]
        resp = None
        last_err = None
        RETRYABLE = ('429', '503', 'RESOURCE_EXHAUSTED', 'UNAVAILABLE', 'NOT_FOUND', '404')
        for model_name in models_to_try:
            try:
                resp = _genai_client.models.generate_content(
                    model=model_name,
                    contents=f"{system}\n\nUser: {message}"
                )
                break
            except Exception as model_err:
                last_err = model_err
                err_str = str(model_err)
                if any(code in err_str for code in RETRYABLE):
                    _time.sleep(0.5)
                    continue
                raise model_err
        if resp is None:
            raise last_err
        reply = resp.text.strip()
    except Exception as e:
        reply = f'Sorry, AI service error: {str(e)}'

    return jsonify({'reply': reply})


@app.route('/save_scan', methods=['POST'])
def save_scan():
    data    = request.get_json(force=True)
    user_id = data.get('userId')
    plant   = data.get('plant', 'Unknown')
    disease = data.get('disease', 'Unknown')
    conf    = data.get('confidence', 0)

    if not user_id:
        return jsonify({'error': 'userId required'}), 400

    conn = get_db()
    conn.execute(
        'INSERT INTO scans (user_id, plant, disease, confidence) VALUES (?,?,?,?)',
        (user_id, plant, disease, conf)
    )
    conn.commit()
    conn.close()
    return jsonify({'status': 'saved'}), 201


@app.route('/get_scans', methods=['POST'])
def get_scans():
    data    = request.get_json(force=True)
    user_id = data.get('userId')

    if not user_id:
        return jsonify({'error': 'userId required'}), 400

    conn = get_db()
    rows = conn.execute(
        'SELECT id, plant, disease, confidence, timestamp FROM scans WHERE user_id=? ORDER BY id DESC LIMIT 50',
        (user_id,)
    ).fetchall()
    conn.close()

    scans = [dict(r) for r in rows]
    return jsonify({'scans': scans})


@app.route('/update_profile', methods=['PUT'])
def update_profile():
    data    = request.get_json(force=True)
    user_id = data.get('userId')
    name    = (data.get('name')  or '').strip()
    email   = (data.get('email') or '').strip()

    if not user_id:
        return jsonify({'error': 'userId required'}), 400

    conn = get_db()
    conn.execute('UPDATE users SET name=?, email=? WHERE id=?', (name, email, user_id))
    conn.commit()
    conn.close()
    return jsonify({'status': 'updated'})


# Serve React app for all other routes (SPA fallback)
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    full = os.path.join(app.static_folder, path)
    if path and os.path.exists(full):
        return app.send_static_file(path)
    return app.send_static_file('index.html')


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
