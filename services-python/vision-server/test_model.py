"""
Test script to validate model architecture and functionality.

Tests the DINOv2 classifier without requiring full training setup.
"""

import torch
import yaml
from pathlib import Path

print("=" * 70)
print("Vision Server - Model Architecture Validation")
print("=" * 70)

# Load config
config_path = Path("training/config.yaml")
with open(config_path, 'r') as f:
    config = yaml.safe_load(f)

print(f"\n✓ Config loaded from: {config_path}")
print(f"  Backbone: {config['model']['backbone']}")
print(f"  Image size: {config['data']['image_size']}")
print(f"  Batch size: {config['training']['batch_size']}")

# Test taxonomy
print("\n" + "=" * 70)
print("Testing Taxonomy")
print("=" * 70)

from training.taxonomy import TAXONOMY, get_all_heads, get_total_classes

heads = get_all_heads()
print(f"\n✓ Loaded {len(heads)} classification heads:")

for head_name, head_config in heads.items():
    print(f"\n  {head_name}:")
    print(f"    Type: {head_config.head_type}")
    print(f"    Classes: {head_config.num_classes}")
    print(f"    Examples: {', '.join(head_config.classes[:3])}{'...' if len(head_config.classes) > 3 else ''}")

print(f"\n✓ Total classes across all heads: {get_total_classes()}")

# Test model creation
print("\n" + "=" * 70)
print("Testing Model Architecture")
print("=" * 70)

print("\nCreating model (this may download DINOv2 weights ~330MB)...")

try:
    from training.model import create_model
    
    model = create_model(config)
    
    print(f"\n✓ Model created successfully")
    print(f"  Total parameters: {model.get_num_total_params():,}")
    print(f"  Trainable parameters: {model.get_num_trainable_params():,}")
    
    # Test forward pass
    print("\n" + "=" * 70)
    print("Testing Forward Pass")
    print("=" * 70)
    
    # Create dummy input
    batch_size = 2
    image_size = config['data']['image_size']
    dummy_input = torch.randn(batch_size, 3, image_size, image_size)
    
    print(f"\nTesting with input shape: {list(dummy_input.shape)}")
    
    model.eval()
    with torch.no_grad():
        outputs = model(dummy_input)
    
    print("\n✓ Forward pass successful")
    print("\n  Output shapes (logits):")
    for head_name, output in outputs.items():
        print(f"    {head_name}: {list(output.shape)}")
    
    # Test predictions
    print("\n" + "=" * 70)
    print("Testing Prediction Conversion")
    print("=" * 70)
    
    predictions = model.get_predictions(outputs, confidence_threshold=0.5)
    
    print("\n✓ Predictions generated")
    print("\n  Prediction shapes:")
    for head_name, pred in predictions.items():
        print(f"    {head_name}: {list(pred.shape)}")
    
    # Decode predictions for first sample
    print("\n  Sample predictions (first image):")
    for head_name, pred in predictions.items():
        head_config = TAXONOMY[head_name]
        if head_config.head_type == "single-label":
            class_idx = pred[0].item()
            class_name = head_config.idx_to_class[class_idx]
            print(f"    {head_name}: {class_name}")
        else:
            class_indices = pred[0].nonzero(as_tuple=True)[0].tolist()
            class_names = [head_config.idx_to_class[idx] for idx in class_indices]
            print(f"    {head_name}: {class_names if class_names else '(none)'}")
    
    print("\n" + "=" * 70)
    print("✅ All Model Tests Passed!")
    print("=" * 70)
    
    print("\n📋 Summary:")
    print(f"  • Taxonomy: {len(heads)} heads, {get_total_classes()} total classes")
    print(f"  • Model: {model.get_num_total_params():,} parameters")
    print(f"  • Forward pass: ✓ Working")
    print(f"  • Predictions: ✓ Working")
    
    print("\n✅ Vision server codebase is ready for training!")
    print("\nNext steps:")
    print("  1. Download datasets: python training/download_data.py")
    print("  2. Label with Claude: python training/label_with_claude.py")
    print("  3. Split dataset: python training/dataset.py --labels data/labeled/labels.jsonl")
    print("  4. Train model: python training/train.py")
    
except Exception as e:
    print(f"\n✗ Error during model testing: {e}")
    import traceback
    traceback.print_exc()
    print("\n⚠️  Model creation requires DINOv2 download (~330MB) and may take time.")

print("\n" + "=" * 70)
