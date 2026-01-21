from flask import Flask, request, jsonify
from flask_cors import CORS
import whisper
import base64
import tempfile
import os
import logging

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load Whisper model (base recommended for dev)
MODEL_NAME = os.getenv('WHISPER_MODEL', 'base')
logger.info(f"Loading Whisper model: {MODEL_NAME}")
model = whisper.load_model(MODEL_NAME)
logger.info("Whisper model loaded successfully")

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model': MODEL_NAME,
        'version': whisper.__version__
    }), 200

@app.route('/transcribe', methods=['POST'])
def transcribe():
    """
    Transcribe audio to text.
    
    Request JSON:
    {
        "audio_data": "<base64-encoded-audio>",
        "encoding": "WEBM_OPUS",
        "sample_rate": 16000,
        "language": "en",
        "model": "base"
    }
    
    Response JSON:
    {
        "text": "transcribed text",
        "confidence": 0.95,
        "duration_ms": 2500,
        "language": "en"
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'audio_data' not in data:
            return jsonify({'error': 'Missing audio_data'}), 400
        
        # Decode base64 audio
        audio_base64 = data['audio_data']
        audio_bytes = base64.b64decode(audio_base64)
        
        # Save to temporary file (Whisper needs file input)
        with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as temp_audio:
            temp_audio.write(audio_bytes)
            temp_path = temp_audio.name
        
        try:
            # Transcribe
            language = data.get('language', 'en')
            
            logger.info(f"Transcribing audio: {len(audio_bytes)} bytes, language: {language}")
            
            result = model.transcribe(
                temp_path,
                language=language,
                fp16=False  # CPU compatibility
            )
            
            text = result['text'].strip()
            
            # Calculate confidence (average of segment probabilities)
            segments = result.get('segments', [])
            if segments:
                avg_confidence = sum(seg.get('no_speech_prob', 0) for seg in segments) / len(segments)
                confidence = 1.0 - avg_confidence
            else:
                confidence = 0.95  # Default
            
            logger.info(f"Transcription successful: '{text[:50]}...'")
            
            return jsonify({
                'text': text,
                'confidence': round(confidence, 2),
                'duration_ms': int(result.get('duration', 0) * 1000),
                'language': result.get('language', language)
            }), 200
            
        finally:
            # Clean up temp file
            if os.path.exists(temp_path):
                os.unlink(temp_path)
    
    except Exception as e:
        logger.error(f"Transcription error: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 8000))
    app.run(host='0.0.0.0', port=port, debug=False)
