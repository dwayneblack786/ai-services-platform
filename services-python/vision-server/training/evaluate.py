"""
Evaluation and metrics for DINOv2 real estate classifier.

Generates:
- Per-head accuracy metrics
- Confusion matrices
- Classification reports
- Visualization of predictions
"""

import argparse
import yaml
from pathlib import Path
from typing import Dict, List
import torch
import numpy as np
from sklearn.metrics import classification_report, confusion_matrix, f1_score
import matplotlib.pyplot as plt
import seaborn as sns
from tqdm import tqdm

from .model import create_model
from .dataset import create_dataloaders
from .taxonomy import TAXONOMY


@torch.no_grad()
def evaluate_model(model, test_loader, device) -> Dict:
    """
    Evaluate model on test set and collect predictions.
    
    Returns:
        Dict with predictions and ground truth for each head
    """
    model.eval()
    
    results = {head: {"predictions": [], "targets": [], "scores": []} for head in TAXONOMY.keys()}
    
    for images, targets in tqdm(test_loader, desc="Evaluating"):
        images = images.to(device)
        
        # Forward pass
        outputs = model(images)
        predictions = model.get_predictions(outputs)
        
        # Collect results for each head
        for head_name in TAXONOMY.keys():
            head_config = TAXONOMY[head_name]
            
            if head_config.head_type == "single-label":
                # Single-label: collect class indices
                results[head_name]["predictions"].extend(predictions[head_name].cpu().numpy())
                results[head_name]["targets"].extend(targets[head_name].cpu().numpy())
                
                # Get softmax scores
                scores = torch.softmax(outputs[head_name], dim=1)
                results[head_name]["scores"].extend(scores.cpu().numpy())
            
            else:  # multi-label
                # Multi-label: collect binary vectors
                results[head_name]["predictions"].extend(predictions[head_name].cpu().numpy())
                results[head_name]["targets"].extend(targets[head_name].cpu().numpy())
                
                # Get sigmoid scores
                scores = torch.sigmoid(outputs[head_name])
                results[head_name]["scores"].extend(scores.cpu().numpy())
    
    # Convert to numpy arrays
    for head_name in results.keys():
        results[head_name]["predictions"] = np.array(results[head_name]["predictions"])
        results[head_name]["targets"] = np.array(results[head_name]["targets"])
        results[head_name]["scores"] = np.array(results[head_name]["scores"])
    
    return results


def compute_metrics(results: Dict) -> Dict:
    """Compute metrics for each classification head."""
    metrics = {}
    
    for head_name, head_results in results.items():
        head_config = TAXONOMY[head_name]
        preds = head_results["predictions"]
        targets = head_results["targets"]
        
        if head_config.head_type == "single-label":
            # Filter out ignored indices (-1)
            mask = targets != -1
            if mask.sum() == 0:
                continue
            
            preds_filtered = preds[mask]
            targets_filtered = targets[mask]
            
            # Accuracy
            accuracy = (preds_filtered == targets_filtered).mean()
            
            # F1 score (macro average)
            f1 = f1_score(targets_filtered, preds_filtered, average='macro', zero_division=0)
            
            # Classification report
            report = classification_report(
                targets_filtered,
                preds_filtered,
                target_names=head_config.classes,
                zero_division=0
            )
            
            # Confusion matrix
            cm = confusion_matrix(targets_filtered, preds_filtered)
            
            metrics[head_name] = {
                "accuracy": accuracy,
                "f1_macro": f1,
                "report": report,
                "confusion_matrix": cm,
                "num_samples": len(preds_filtered)
            }
        
        else:  # multi-label
            # Per-class F1 scores
            f1_per_class = []
            for i in range(head_config.num_classes):
                f1 = f1_score(targets[:, i], preds[:, i], zero_division=0)
                f1_per_class.append(f1)
            
            # Macro average F1
            f1_macro = np.mean(f1_per_class)
            
            # Exact match ratio (all labels correct)
            exact_match = (preds == targets).all(axis=1).mean()
            
            # Hamming accuracy (per-label accuracy)
            hamming_acc = (preds == targets).mean()
            
            metrics[head_name] = {
                "f1_macro": f1_macro,
                "f1_per_class": f1_per_class,
                "exact_match_ratio": exact_match,
                "hamming_accuracy": hamming_acc,
                "num_samples": len(preds)
            }
    
    return metrics


def plot_confusion_matrix(cm, class_names, head_name, save_path):
    """Plot and save confusion matrix."""
    plt.figure(figsize=(12, 10))
    
    sns.heatmap(
        cm,
        annot=True,
        fmt='d',
        cmap='Blues',
        xticklabels=class_names,
        yticklabels=class_names
    )
    
    plt.title(f'Confusion Matrix - {head_name}')
    plt.ylabel('True Label')
    plt.xlabel('Predicted Label')
    plt.xticks(rotation=45, ha='right')
    plt.yticks(rotation=0)
    plt.tight_layout()
    
    plt.savefig(save_path, dpi=150, bbox_inches='tight')
    plt.close()
    
    print(f"✓ Confusion matrix saved: {save_path}")


def plot_f1_scores(metrics: Dict, save_path):
    """Plot F1 scores for all heads."""
    plt.figure(figsize=(10, 6))
    
    head_names = []
    f1_scores = []
    
    for head_name, head_metrics in metrics.items():
        head_names.append(head_name)
        f1_scores.append(head_metrics["f1_macro"])
    
    plt.barh(head_names, f1_scores, color='skyblue')
    plt.xlabel('F1 Score (Macro)')
    plt.title('Classification Performance by Head')
    plt.xlim(0, 1)
    
    # Add value labels
    for i, v in enumerate(f1_scores):
        plt.text(v + 0.01, i, f'{v:.3f}', va='center')
    
    plt.tight_layout()
    plt.savefig(save_path, dpi=150, bbox_inches='tight')
    plt.close()
    
    print(f"✓ F1 scores plot saved: {save_path}")


def print_metrics_summary(metrics: Dict):
    """Print summary of all metrics."""
    print("\n" + "=" * 60)
    print("EVALUATION RESULTS")
    print("=" * 60)
    
    for head_name, head_metrics in metrics.items():
        head_config = TAXONOMY[head_name]
        
        print(f"\n{head_name.upper()} ({head_config.head_type})")
        print("-" * 40)
        
        if head_config.head_type == "single-label":
            print(f"Accuracy:  {head_metrics['accuracy']:.4f}")
            print(f"F1 Score:  {head_metrics['f1_macro']:.4f}")
            print(f"Samples:   {head_metrics['num_samples']}")
            print(f"\n{head_metrics['report']}")
        else:
            print(f"F1 Score (macro):     {head_metrics['f1_macro']:.4f}")
            print(f"Exact Match Ratio:    {head_metrics['exact_match_ratio']:.4f}")
            print(f"Hamming Accuracy:     {head_metrics['hamming_accuracy']:.4f}")
            print(f"Samples:              {head_metrics['num_samples']}")
    
    print("\n" + "=" * 60)


def main():
    parser = argparse.ArgumentParser(description="Evaluate DINOv2 real estate classifier")
    parser.add_argument("--config", type=str, default="training/config.yaml",
                       help="Path to config file")
    parser.add_argument("--checkpoint", type=str, required=True,
                       help="Path to model checkpoint")
    parser.add_argument("--output-dir", type=str, default="./evaluation",
                       help="Directory to save evaluation results")
    
    args = parser.parse_args()
    
    # Load config
    with open(args.config, 'r') as f:
        config = yaml.safe_load(f)
    
    # Set device
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")
    
    # Load model
    print("\nLoading model...")
    model = create_model(config)
    checkpoint = torch.load(args.checkpoint, map_location=device)
    
    if isinstance(checkpoint, dict) and 'model_state_dict' in checkpoint:
        model.load_state_dict(checkpoint['model_state_dict'])
    else:
        model.load_state_dict(checkpoint)
    
    model = model.to(device)
    print(f"✓ Model loaded from: {args.checkpoint}")
    
    # Load test data
    print("\nLoading test dataset...")
    data_root = Path(config["paths"]["data_root"])
    _, _, test_loader = create_dataloaders(config, data_root)
    
    # Evaluate
    print("\nEvaluating model...")
    results = evaluate_model(model, test_loader, device)
    
    # Compute metrics
    print("\nComputing metrics...")
    metrics = compute_metrics(results)
    
    # Print summary
    print_metrics_summary(metrics)
    
    # Create output directory
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Plot confusion matrices for single-label heads
    print("\nGenerating visualizations...")
    for head_name, head_metrics in metrics.items():
        head_config = TAXONOMY[head_name]
        
        if head_config.head_type == "single-label" and "confusion_matrix" in head_metrics:
            cm_path = output_dir / f"confusion_matrix_{head_name}.png"
            plot_confusion_matrix(
                head_metrics["confusion_matrix"],
                head_config.classes,
                head_name,
                cm_path
            )
    
    # Plot F1 scores
    f1_plot_path = output_dir / "f1_scores.png"
    plot_f1_scores(metrics, f1_plot_path)
    
    # Save metrics to file
    import json
    
    # Convert numpy arrays to lists for JSON serialization
    metrics_serializable = {}
    for head_name, head_metrics in metrics.items():
        metrics_serializable[head_name] = {}
        for key, value in head_metrics.items():
            if isinstance(value, (np.ndarray, list)):
                if isinstance(value, np.ndarray):
                    metrics_serializable[head_name][key] = value.tolist()
                else:
                    metrics_serializable[head_name][key] = value
            elif key == "report":
                metrics_serializable[head_name][key] = str(value)
            else:
                metrics_serializable[head_name][key] = float(value) if isinstance(value, (np.floating, float)) else value
    
    metrics_path = output_dir / "metrics.json"
    with open(metrics_path, 'w') as f:
        json.dump(metrics_serializable, f, indent=2)
    
    print(f"\n✓ Metrics saved: {metrics_path}")
    
    print("\n" + "=" * 60)
    print("Evaluation complete!")
    print(f"Results saved to: {output_dir}")
    print("=" * 60)


if __name__ == "__main__":
    main()
