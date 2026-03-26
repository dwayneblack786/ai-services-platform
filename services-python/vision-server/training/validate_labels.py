"""
Validate label quality by checking consistency and providing metrics.

Checks:
- Label distribution (are classes balanced?)
- Confidence scores distribution
- Missing labels
- Suspicious patterns (too many of same class)
"""

import json
from pathlib import Path
from typing import Dict, List
import argparse
from collections import Counter
import matplotlib.pyplot as plt
import numpy as np

from .taxonomy import TAXONOMY


def load_labels(labels_path: Path) -> List[Dict]:
    """Load labels from JSONL file."""
    labels = []
    with open(labels_path, 'r') as f:
        for line in f:
            if line.strip():
                labels.append(json.loads(line))
    return labels


def analyze_distribution(labels: List[Dict]) -> Dict:
    """Analyze label distributions."""
    stats = {
        "total_images": len(labels),
        "heads": {}
    }
    
    for head_name, head_config in TAXONOMY.items():
        head_stats = {
            "type": head_config.head_type,
            "distribution": Counter(),
            "missing_count": 0,
            "avg_confidence": []
        }
        
        for label in labels:
            # Confidence
            if "confidence" in label:
                head_stats["avg_confidence"].append(label["confidence"])
            
            # Check if head exists
            if head_name not in label or label[head_name] is None:
                head_stats["missing_count"] += 1
                continue
            
            # Count distribution
            if head_config.head_type == "single-label":
                head_stats["distribution"][label[head_name]] += 1
            else:  # multi-label
                for class_name in label[head_name]:
                    head_stats["distribution"][class_name] += 1
        
        # Calculate average confidence
        if head_stats["avg_confidence"]:
            head_stats["avg_confidence"] = np.mean(head_stats["avg_confidence"])
        else:
            head_stats["avg_confidence"] = 0.0
        
        stats["heads"][head_name] = head_stats
    
    return stats


def detect_anomalies(stats: Dict) -> List[str]:
    """Detect potential labeling issues."""
    warnings = []
    
    for head_name, head_stats in stats["heads"].items():
        head_config = TAXONOMY[head_name]
        
        # Check for missing labels
        missing_pct = (head_stats["missing_count"] / stats["total_images"]) * 100
        if missing_pct > 10:
            warnings.append(f"⚠️  {head_name}: {missing_pct:.1f}% missing labels")
        
        # Check for imbalanced distribution (single-label only)
        if head_config.head_type == "single-label":
            dist = head_stats["distribution"]
            if dist:
                most_common = dist.most_common(1)[0]
                most_common_pct = (most_common[1] / stats["total_images"]) * 100
                
                if most_common_pct > 60:
                    warnings.append(f"⚠️  {head_name}: '{most_common[0]}' appears in {most_common_pct:.1f}% of images (possible bias)")
        
        # Check for low confidence
        if head_stats["avg_confidence"] < 0.7:
            warnings.append(f"⚠️  {head_name}: Low average confidence ({head_stats['avg_confidence']:.2f})")
    
    return warnings


def print_report(stats: Dict, warnings: List[str]):
    """Print validation report."""
    print("\n" + "=" * 70)
    print("Label Quality Validation Report")
    print("=" * 70)
    
    print(f"\n📊 Overview:")
    print(f"  Total images: {stats['total_images']}")
    
    # Print per-head statistics
    for head_name, head_stats in stats["heads"].items():
        head_config = TAXONOMY[head_name]
        print(f"\n{'='*70}")
        print(f"{head_name.upper()} ({head_config.head_type})")
        print(f"{'='*70}")
        
        print(f"  Missing labels: {head_stats['missing_count']} ({head_stats['missing_count']/stats['total_images']*100:.1f}%)")
        print(f"  Avg confidence: {head_stats['avg_confidence']:.3f}")
        
        # Show distribution
        dist = head_stats["distribution"]
        if dist:
            print(f"\n  Top {min(5, len(dist))} classes:")
            for class_name, count in dist.most_common(5):
                pct = (count / stats['total_images']) * 100
                bar = "█" * int(pct / 2)
                print(f"    {class_name:20s}: {count:4d} ({pct:5.1f}%) {bar}")
    
    # Print warnings
    if warnings:
        print(f"\n{'='*70}")
        print("⚠️  WARNINGS")
        print(f"{'='*70}")
        for warning in warnings:
            print(f"  {warning}")
    else:
        print(f"\n{'='*70}")
        print("✅ No major issues detected!")
        print(f"{'='*70}")
    
    print()


def plot_distribution(stats: Dict, output_dir: Path):
    """Plot label distributions."""
    output_dir.mkdir(parents=True, exist_ok=True)
    
    for head_name, head_stats in stats["heads"].items():
        head_config = TAXONOMY[head_name]
        dist = head_stats["distribution"]
        
        if not dist:
            continue
        
        # Create plot
        fig, ax = plt.subplots(figsize=(12, 6))
        
        classes = [k for k, v in dist.most_common(20)]
        counts = [v for k, v in dist.most_common(20)]
        
        ax.barh(classes, counts, color='skyblue')
        ax.set_xlabel('Count')
        ax.set_title(f'{head_name} Distribution ({head_config.head_type})')
        ax.invert_yaxis()
        
        plt.tight_layout()
        plt.savefig(output_dir / f"distribution_{head_name}.png", dpi=150, bbox_inches='tight')
        plt.close()
    
    print(f"✓ Distribution plots saved to: {output_dir}")


def suggest_review_samples(labels: List[Dict], n_samples: int = 50) -> List[str]:
    """Suggest which images to manually review."""
    # Prioritize low confidence images
    low_confidence = sorted(labels, key=lambda x: x.get("confidence", 1.0))[:n_samples//2]
    
    # Add random samples
    import random
    random_samples = random.sample(labels, min(n_samples//2, len(labels)))
    
    review_samples = low_confidence + random_samples
    return [sample["labeled_image_path"] for sample in review_samples if "labeled_image_path" in sample]


def main():
    parser = argparse.ArgumentParser(description="Validate label quality")
    parser.add_argument("--labels", type=str, required=True,
                       help="Path to labels.jsonl file")
    parser.add_argument("--output-dir", type=str, default="./validation",
                       help="Output directory for plots and reports")
    parser.add_argument("--plot", action="store_true",
                       help="Generate distribution plots")
    parser.add_argument("--suggest-review", type=int, default=0,
                       help="Suggest N images for manual review")
    
    args = parser.parse_args()
    
    labels_path = Path(args.labels)
    output_dir = Path(args.output_dir)
    
    if not labels_path.exists():
        print(f"✗ Labels file not found: {labels_path}")
        return
    
    print("=" * 70)
    print("Loading labels...")
    labels = load_labels(labels_path)
    
    print(f"✓ Loaded {len(labels)} labeled images")
    
    # Analyze
    print("\nAnalyzing label distribution...")
    stats = analyze_distribution(labels)
    
    # Detect issues
    warnings = detect_anomalies(stats)
    
    # Print report
    print_report(stats, warnings)
    
    # Save JSON report
    output_dir.mkdir(parents=True, exist_ok=True)
    report_path = output_dir / "validation_report.json"
    
    # Convert Counter objects to dicts for JSON serialization
    json_stats = stats.copy()
    for head_name in json_stats["heads"]:
        json_stats["heads"][head_name]["distribution"] = dict(json_stats["heads"][head_name]["distribution"])
    
    with open(report_path, 'w') as f:
        json.dump({
            "stats": json_stats,
            "warnings": warnings
        }, f, indent=2)
    
    print(f"✓ Report saved: {report_path}")
    
    # Plot distributions
    if args.plot:
        print("\nGenerating distribution plots...")
        plot_distribution(stats, output_dir)
    
    # Suggest review samples
    if args.suggest_review > 0:
        print(f"\nSuggesting {args.suggest_review} images for manual review...")
        review_samples = suggest_review_samples(labels, args.suggest_review)
        
        review_file = output_dir / "review_list.txt"
        with open(review_file, 'w') as f:
            for sample in review_samples:
                f.write(f"{sample}\n")
        
        print(f"✓ Review list saved: {review_file}")
        print(f"  These images have low confidence or were randomly selected")
        print(f"  Use the review GUI to verify: python review_labels.py --input {review_file}")


if __name__ == "__main__":
    main()
