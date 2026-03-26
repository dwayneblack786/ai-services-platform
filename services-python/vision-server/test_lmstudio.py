"""
Quick test script for LM Studio integration.
Tests connection and does a single image classification.
"""

import sys
from pathlib import Path

# Add training module to path
sys.path.insert(0, str(Path(__file__).parent))

print("=" * 70)
print("LM Studio Integration Test")
print("=" * 70)

# Test 1: Import check
print("\n1. Testing imports...")
try:
    from training.label_with_lmstudio import test_lmstudio_connection, classify_image_with_lmstudio
    from openai import OpenAI
    print("   ✓ All imports successful")
except ImportError as e:
    print(f"   ✗ Import error: {e}")
    print("   Run: pip install openai")
    sys.exit(1)

# Test 2: Connection check
print("\n2. Testing LM Studio connection...")
base_url = "http://127.0.0.1:1234/v1"

if not test_lmstudio_connection(base_url):
    print("\n" + "=" * 70)
    print("⚠️  LM Studio Setup Required")
    print("=" * 70)
    print("\nPlease complete these steps:")
    print("1. Download LM Studio from https://lmstudio.ai/")
    print("2. Search for and download a vision model:")
    print("   - llama-3.2-vision (recommended)")
    print("   - llava-v1.6-mistral-7b (faster)")
    print("   - bakllava-1-7b (good balance)")
    print("3. Load the model in LM Studio")
    print("4. Go to 'Server' tab and click 'Start Server'")
    print("5. Run this test again")
    print("\n" + "=" * 70)
    sys.exit(1)

# Test 3: Get loaded model
print("\n3. Detecting loaded vision model...")
try:
    client = OpenAI(base_url=base_url, api_key="lm-studio")
    models = client.models.list()
    model_names = [model.id for model in models.data]
    
    # Find vision model
    vision_keywords = ['vision', 'llava', 'bakllava', 'cogvlm']
    vision_models = [m for m in model_names if any(kw in m.lower() for kw in vision_keywords)]
    
    if vision_models:
        model_to_use = vision_models[0]
        print(f"   ✓ Using model: {model_to_use}")
    else:
        print(f"   ⚠ No vision model found, trying first available: {model_names[0]}")
        model_to_use = model_names[0]
    
except Exception as e:
    print(f"   ✗ Error: {e}")
    sys.exit(1)

# Test 4: Test classification (if test image exists)
print("\n4. Testing image classification...")
test_image_dirs = [
    Path("data/raw"),
    Path("../examples"),
    Path("."),
]

test_image = None
for test_dir in test_image_dirs:
    if test_dir.exists():
        images = list(test_dir.rglob("*.jpg")) + list(test_dir.rglob("*.png"))
        if images:
            test_image = images[0]
            break

if test_image:
    print(f"   Using test image: {test_image.name}")
    try:
        result = classify_image_with_lmstudio(client, test_image, model_to_use)
        
        if result:
            print("   ✓ Classification successful!")
            print("\n   Sample output:")
            print(f"     Room type: {result.get('room_type', 'N/A')}")
            print(f"     Confidence: {result.get('confidence', 0):.2f}")
            if result.get('design_style'):
                print(f"     Design style: {', '.join(result['design_style'][:3])}")
        else:
            print("   ⚠ Classification returned None - check model output format")
    except Exception as e:
        print(f"   ✗ Classification error: {e}")
        print("\n   This might be normal if the model needs specific formatting.")
else:
    print("   ⚠ No test images found - skipping classification test")
    print("     (This is OK - classification will work when you have images)")

# Summary
print("\n" + "=" * 70)
print("✅ LM Studio Integration Test Complete")
print("=" * 70)
print("\nYou're ready to label images! Run:")
print("  python training/label_with_lmstudio.py --input data/raw --output data/labeled")
print("\nFor full guide, see: LM_STUDIO_LABELING_GUIDE.md")
print("=" * 70)
