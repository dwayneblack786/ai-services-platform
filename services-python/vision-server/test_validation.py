"""
Test the label validation and review system.

Quick test of validation workflow.
"""

import json
from pathlib import Path
import sys

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from training.taxonomy import TAXONOMY
import random


def create_sample_labels(output_path: Path, num_samples: int = 10):
    """Create sample labeled data for testing."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Sample room types with different confidence levels
    labels = []
    
    room_types = ["kitchen", "bathroom", "bedroom", "living_room", "dining_room"]
    flooring = ["hardwood", "tile", "carpet"]
    design_styles = ["modern", "traditional", "transitional"]
    
    for i in range(num_samples):
        # Vary confidence
        confidence = random.uniform(0.6, 0.98)
        
        label = {
            "labeled_image_path": f"test_images/image_{i:03d}.jpg",
            "confidence": confidence,
            "room_type": random.choice(room_types),
            "flooring": [random.choice(flooring)],
            "countertop": random.choice(["granite", "quartz", "marble", None]),
            "design_style": random.choices(design_styles, k=random.randint(1, 2)),
            "fixtures": random.choices(["pendant_lights", "chandelier", "recessed_lighting"], k=random.randint(0, 2)),
            "materials": ["drywall"],
            "condition": random.choice(["excellent", "good", "fair"])
        }
        
        labels.append(label)
    
    # Save as JSONL
    with open(output_path, 'w') as f:
        for label in labels:
            f.write(json.dumps(label) + '\n')
    
    print(f"✓ Created {num_samples} sample labels: {output_path}")


def test_validation():
    """Test validation script."""
    print("\n" + "="*70)
    print("Testing Label Validation")
    print("="*70)
    
    # Create sample data
    sample_path = Path("test_data/labels.jsonl")
    create_sample_labels(sample_path, num_samples=50)
    
    # Import and test validation
    import sys
    sys.path.insert(0, str(Path(__file__).parent / "training"))
    
    from validate_labels import load_labels, analyze_distribution, detect_anomalies, print_report
    
    print("\nLoading labels...")
    labels = load_labels(sample_path)
    print(f"✓ Loaded {len(labels)} labels")
    
    print("\nAnalyzing distribution...")
    stats = analyze_distribution(labels)
    
    print("\nDetecting anomalies...")
    warnings = detect_anomalies(stats)
    
    print("\nGenerating report...")
    print_report(stats, warnings)
    
    print(f"\n✓ Validation test complete!")
    print(f"\nNext steps:")
    print(f"  1. Label real images:")
    print(f"     python training/label_with_lmstudio.py --max-images 100")
    print(f"  2. Validate:")
    print(f"     python training/validate_labels.py --labels data/labeled/labels.jsonl --plot")
    print(f"  3. Review:")
    print(f"     python review_labels.py --labels data/labeled/labels.jsonl")


if __name__ == "__main__":
    test_validation()
