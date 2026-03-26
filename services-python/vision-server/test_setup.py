"""Quick setup verification script."""

import sys

print("=" * 60)
print("Vision Server Setup Verification")
print("=" * 60)

# Check Python version
print(f"\n✓ Python {sys.version.split()[0]}")

# Check PyTorch
try:
    import torch
    print(f"✓ PyTorch {torch.__version__}")
    print(f"  CUDA available: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"  CUDA version: {torch.version.cuda}")
        print(f"  GPU: {torch.cuda.get_device_name(0)}")
        print(f"  VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB")
except ImportError:
    print("✗ PyTorch not installed")
    print("  Run: pip install -r requirements.txt")

# Check other dependencies
deps = [
    ("torchvision", "torchvision"),
    ("PIL", "Pillow"),
    ("yaml", "PyYAML"),
    ("anthropic", "anthropic"),
    ("sklearn", "scikit-learn"),
    ("matplotlib", "matplotlib"),
    ("seaborn", "seaborn"),
]

print("\nDependency Status:")
for module, package in deps:
    try:
        __import__(module)
        print(f"  ✓ {package}")
    except ImportError:
        print(f"  ✗ {package} (not installed)")

# Test taxonomy import
print("\nTesting project modules:")
try:
    from training.taxonomy import TAXONOMY, get_total_classes
    print(f"  ✓ taxonomy.py - {len(TAXONOMY)} heads, {get_total_classes()} total classes")
except Exception as e:
    print(f"  ✗ taxonomy.py - {e}")

print("\n" + "=" * 60)
print("Setup verification complete")
print("=" * 60)
