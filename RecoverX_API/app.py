from flask import Flask, request, jsonify
from flask_cors import CORS
from ultralytics import YOLO
import numpy as np
from PIL import Image

app = Flask(__name__)
CORS(app)

# Load model once
model = YOLO("models/bag_wallet_best.pt")

CONF_THRESHOLD = 0.5  # adjust if needed

CLASS_NAMES = {
    0: "bag",
    1: "wallet"
}

@app.route("/")
def home():
    return "API Running Successfully 🚀"

@app.route("/predict", methods=["POST"])
def predict():
    if "image" not in request.files:
        return jsonify({"error": "No image uploaded"}), 400

    file = request.files["image"]

    # Read image
    image = Image.open(file.stream).convert("RGB")

    # Predict
    results = model(image)

    boxes = results[0].boxes

    if boxes is None or len(boxes) == 0:
        return jsonify({
            "prediction": "uncertain",
            "confidence": 0
        })

    # Get best detection
    confidences = boxes.conf.cpu().numpy()
    classes = boxes.cls.cpu().numpy()

    best_idx = np.argmax(confidences)
    best_conf = float(confidences[best_idx])
    best_class = int(classes[best_idx])

    if best_conf < CONF_THRESHOLD:
        return jsonify({
            "prediction": "uncertain",
            "confidence": best_conf
        })

    return jsonify({
        "prediction": CLASS_NAMES[best_class],
        "confidence": best_conf
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)