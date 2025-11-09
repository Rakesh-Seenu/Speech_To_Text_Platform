# app.py
import os
import io
import json
from dotenv import load_dotenv
load_dotenv()
from flask import Flask, render_template, request, jsonify, session
from werkzeug.utils import secure_filename

# For session encryption
from datetime import timedelta

# Install the Groq SDK: pip install groq
from groq import Groq

# API key will be provided by the client
# The Groq client will be initialized inside the route with the provided API key.

# Flask app
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100 MB limit
app.config['SECRET_KEY'] = os.urandom(24)  # Generate a random secret key
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=30)  # Session lasts for 30 days

ALLOWED_EXT = {"wav", "mp3", "m4a", "flac", "ogg", "webm", "mp4", "mpeg", "mpga"}

def allowed_filename(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXT

@app.route("/")
def index():
    api_key = session.get('groq_api_key', '')
    return render_template("index.html", api_key=api_key)

@app.route("/api/config", methods=["POST"])
def save_config():
    """Save API key in server session"""
    api_key = request.json.get('api_key')
    if not api_key:
        return jsonify({"error": "API key is required"}), 400
    
    try:
        # Test the API key with a simple call
        client = Groq(api_key=api_key)
        # If no exception is raised, key is valid
        session.permanent = True  # Make session permanent
        session['groq_api_key'] = api_key
        return jsonify({"message": "API key saved successfully"})
    except Exception as e:
        return jsonify({"error": f"Invalid API key: {str(e)}"}), 400

@app.route("/api/config", methods=["GET"])
def get_config():
    """Get saved API key status"""
    api_key = session.get('groq_api_key', '')
    return jsonify({
        "has_api_key": bool(api_key),
        "api_key": "********" if api_key else ""
    })

@app.route("/transcribe", methods=["POST"])
def transcribe():
    """
    Accepts:
      - file: uploaded audio
      - model: optional (default whisper-large-v3-turbo)
      - response_format: optional (default verbose_json)
      - language: optional
    Returns JSON with transcription result and useful metadata.
    """
    # get the file from the request
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400

    f = request.files["file"]
    if f.filename == "":
        return jsonify({"error": "No file selected"}), 400

    if not allowed_filename(f.filename):
        return jsonify({"error": f"Unsupported file type: {f.filename}"}), 400

    filename = secure_filename(f.filename)
    file_bytes = f.read()

    model = request.form.get("model", "whisper-large-v3-turbo")
    response_format = request.form.get("response_format", "verbose_json")  # "text" or "json" or "verbose_json"
    language = "en"  # Force English output
    temperature = float(request.form.get("temperature", "0.0"))

    try:
        # Get API key from session
        api_key = session.get('groq_api_key')
        if not api_key:
            return jsonify({"error": "Please configure your Groq API key first"}), 400

        # Create Groq client with provided API key
        client = Groq(api_key=api_key)

        # Groq SDK sample usage expects file=(filename, bytes) or file=file_obj
        # We'll pass a tuple (filename, bytes) similar to the docs.
        payload = {
            "file": (filename, file_bytes),
            "model": model,
            "response_format": response_format,
            "temperature": temperature,
            "language": language
        }
        # If you want timestamps/word-level data include them and ensure response_format is JSON
        # Example:
        # payload["timestamp_granularities"] = ["segment","word"]

        transcription = client.audio.transcriptions.create(**payload)

        # Convert transcription object to a dictionary with basic Python types
        try:
            if hasattr(transcription, '__dict__'):
                # If it's an object with attributes, convert to dict
                transcription_dict = {
                    key: value for key, value in transcription.__dict__.items() 
                    if not key.startswith('_')  # Skip private attributes
                }
            elif isinstance(transcription, dict):
                # If it's already a dict, use it directly
                transcription_dict = transcription
            else:
                # If it's something else (like a string), wrap it
                transcription_dict = {"text": str(transcription)}

            # Extract text specifically for convenience
            text = transcription_dict.get("text", None)
            if text is None and hasattr(transcription, "text"):
                text = transcription.text

            return jsonify({
                "ok": True,
                "model": model,
                "response_format": response_format,
                "text": text,
                "transcription": transcription_dict
            })
        except Exception as e:
            return jsonify({
                "error": f"Failed to process transcription result: {str(e)}"
            }), 500
    except Exception as e:
        # return error message and log
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    # Use 0.0.0.0 for access from other machines if desired.
    app.run(host="127.0.0.1", port=8000, debug=True)
