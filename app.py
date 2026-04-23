import os
import json
import numpy as np
from PIL import Image
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
import datetime

try:
    from tensorflow.keras.models import load_model
    TF_AVAILABLE = True
except ImportError:
    TF_AVAILABLE = False

from google import genai
from dotenv import load_dotenv

load_dotenv()
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY", ""))

app = Flask(__name__, static_folder='dist', static_url_path='/')
CORS(app)

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.errorhandler(404)
def not_found(e):
    return send_from_directory(app.static_folder, 'index.html')

def init_db():
    conn = sqlite3.connect('capstone.db')
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            name TEXT,
            email TEXT,
            password TEXT
        )
    ''')
    try:
        c.execute('ALTER TABLE users ADD COLUMN email TEXT')
    except sqlite3.OperationalError:
        pass
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS scans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            plant TEXT,
            disease TEXT,
            confidence REAL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    conn.commit()
    conn.close()

init_db()

import threading

model = None
model_loading = False
model_load_error = None
model_load_traceback = None

def load_model_bg():
    global model, model_loading, model_load_error, model_load_traceback
    if TF_AVAILABLE and os.path.exists("model.h5"):
        try:
            model = load_model("model.h5")
        except Exception as e:
            model_load_error = str(e)
            import traceback
            model_load_traceback = traceback.format_exc()
    model_loading = False

model_loading = True
threading.Thread(target=load_model_bg, daemon=True).start()

if os.path.exists("classes.json"):
    with open("classes.json", "r") as f:
        class_indices = json.load(f)
else:
    class_indices = {}

@app.route("/predict", methods=["POST"])
def predict():
    if not TF_AVAILABLE:
        return jsonify({"error": "TensorFlow is not installed. Please try again in 2 minutes when pip finishes."}), 500
    if model_loading:
        return jsonify({"error": "AI Model is still warming up... Please wait about 30 seconds and try again!"}), 503
    if model is None:
        if model_load_error:
            return jsonify({"error": f"Model exist but failed to load! Error: {model_load_error} | Trace: {model_load_traceback}"}), 500
        return jsonify({"error": "The Custom CNN Model (model.h5) is not generated yet! Please run train.py"}), 500

    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
        
    file = request.files["file"]
    try:
        img = Image.open(file).convert("RGB")
        
        # PRE-CHECK: Is it a leaf?
        prompt = (
            "Analyze this image. Is it a plant leaf? If yes, what plant and disease? "
            "If healthy, set disease to 'Healthy'. "
            "Respond ONLY with a JSON object in this exact format: "
            '{"is_leaf": true, "plant": "Name", "disease": "Name", "confidence": 0.95}'
        )
        ai_data = {}
        try:
            ai_response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=[img, prompt]
            )
            ai_text = ai_response.text.strip().removeprefix('```json').removesuffix('```').strip()
            import json
            ai_data = json.loads(ai_text)
            
            if not ai_data.get("is_leaf", True):
                return jsonify({"error": "This does not look like a plant leaf. Please scan a clear image of a leaf."}), 400
        except Exception as e:
            print("Gemini API error:", e)
            
        img_resized = img.resize((224, 224))
        img_array = np.array(img_resized) / 255.0
        img_array = np.expand_dims(img_array, axis=0)
        
        preds = model.predict(img_array)
        class_idx = str(np.argmax(preds[0]))
        confidence = float(np.max(preds[0]))
        
        class_name = class_indices.get(class_idx, "Unknown___Unknown")
        parts = class_name.split("___")
        plant = parts[0].replace("_", " ") if len(parts) > 0 else "Unknown"
        disease = parts[1].replace("_", " ") if len(parts) > 1 else "Unknown"
        
        response_data = {
            "plant": plant,
            "disease": disease,
            "confidence": confidence,
            "source": "CNN"
        }
        
        if (confidence < 0.80 or plant == "Unknown" or disease == "Unknown") and ai_data:
            response_data["ai_fallback"] = {
                "plant": ai_data.get("plant", "Unknown"),
                "disease": ai_data.get("disease", "Unknown"),
                "confidence": ai_data.get("confidence", 0.9)
            }
            
        return jsonify(response_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/chat", methods=["POST"])
def chat():
    data = request.json
    language_map = {"en": "English", "hi": "Hindi", "ta": "Tamil"}
    lang_name = language_map.get(data.get("lang", "en"), "English")
    
    clean_directive = f"RESPOND STRICTLY AND ONLY IN THE {lang_name.upper()} LANGUAGE. You are a warm, empathetic, and highly knowledgeable agricultural expert helping a farmer out. Provide an exceptionally clear explanation, structural solutions, and helpful suggestions. Format everything neatly in simple paragraphs using bold text for key terms. DO NOT use complex markdown headers like '#' or '*' for titles."
    
    if "query" in data:
        prompt = f"{clean_directive}\n\nFarmer's Request: {data['query']}"
    else:
        plant = data.get("plant", "Unknown")
        disease = data.get("disease", "Unknown")
        prompt = f"{clean_directive}\n\nDetected {disease} on {plant}. Give 1 cause, 1 treatment, and 1 prevention method."

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
        return jsonify({"response": response.text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/signup", methods=["POST"])
def signup():
    data = request.json
    username = data.get("username")
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    
    if not username or not name or not password:
        return jsonify({"error": "Missing required fields"}), 400
        
    try:
        conn = sqlite3.connect('capstone.db')
        c = conn.cursor()
        c.execute('INSERT INTO users (username, name, email, password) VALUES (?, ?, ?, ?)', (username, name, email, password))
        conn.commit()
        user_id = c.lastrowid
        conn.close()
        return jsonify({"message": "User created successfully", "userId": user_id, "name": name}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "Username already exists"}), 409
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    
    conn = sqlite3.connect('capstone.db')
    c = conn.cursor()
    c.execute('SELECT id, name, email FROM users WHERE (username = ? OR email = ?) AND password = ?', (username, username, password))
    user = c.fetchone()
    conn.close()
    
    if user:
        return jsonify({"message": "Login successful", "userId": user[0], "name": user[1], "email": user[2]}), 200
    else:
        return jsonify({"error": "Invalid username or password"}), 401

@app.route("/update_profile", methods=["PUT"])
def update_profile():
    data = request.json
    user_id = data.get("userId")
    name = data.get("name")
    email = data.get("email")
    
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400
        
    try:
        conn = sqlite3.connect('capstone.db')
        c = conn.cursor()
        c.execute('UPDATE users SET name = ?, email = ? WHERE id = ?', (name, email, user_id))
        conn.commit()
        conn.close()
        return jsonify({"message": "Profile updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/save_scan", methods=["POST"])
def save_scan():
    data = request.json
    user_id = data.get("userId")
    plant = data.get("plant")
    disease = data.get("disease")
    confidence = data.get("confidence")
    
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400
        
    try:
        conn = sqlite3.connect('capstone.db')
        c = conn.cursor()
        c.execute('INSERT INTO scans (user_id, plant, disease, confidence) VALUES (?, ?, ?, ?)', 
                 (user_id, plant, disease, confidence))
        conn.commit()
        conn.close()
        return jsonify({"message": "Scan saved successfully"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/get_scans", methods=["POST"])
def get_scans():
    data = request.json
    user_id = data.get("userId")
    
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400
        
    conn = sqlite3.connect('capstone.db')
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute('SELECT id, plant, disease, confidence, timestamp FROM scans WHERE user_id = ? ORDER BY timestamp DESC', (user_id,))
    rows = c.fetchall()
    conn.close()
    
    scans = [dict(row) for row in rows]
    return jsonify({"scans": scans}), 200

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=False)
