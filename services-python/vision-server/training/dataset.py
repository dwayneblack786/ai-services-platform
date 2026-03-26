"""
PyTorch Dataset and DataLoader for real estate property classification.

Handles multi-head classification with both single-label and multi-label targets.
"""

import json
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import torch
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from PIL import Image
import yaml

from .taxonomy import TAXONOMY, get_all_heads


class RealEstateDataset(Dataset):
    """
    Dataset for real estate property images with multi-head classification.
    
    Loads labeled data from JSONL file where each line contains:
    {
        "image_path": "path/to/image.jpg",
        "room_type": "kitchen",
        "flooring": ["hardwood", "tile_ceramic"],
        "countertop": "granite",
        ...
    }
    """
    
    def __init__(
        self,
        labels_path: Path,
        images_root: Path,
        transform: Optional[transforms.Compose] = None,
        split: str = "train"
    ):
        """
        Args:
            labels_path: Path to JSONL file with labels
            images_root: Root directory containing images
            transform: Optional torchvision transforms
            split: Dataset split (train/val/test)
        """
        self.labels_path = labels_path
        self.images_root = images_root
        self.transform = transform
        self.split = split
        self.taxonomy = get_all_heads()
        
        # Load labels
        self.samples = self._load_labels()
        
        print(f"Loaded {len(self.samples)} samples for {split} split")
    
    def _load_labels(self) -> List[Dict]:
        """Load and parse JSONL labels file."""
        samples = []
        
        with open(self.labels_path, 'r') as f:
            for line in f:
                if line.strip():
                    sample = json.loads(line)
                    
                    # Validate that image exists
                    image_path = self.images_root / sample["labeled_image_path"]
                    if image_path.exists():
                        samples.append(sample)
        
        return samples
    
    def __len__(self) -> int:
        return len(self.samples)
    
    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, Dict[str, torch.Tensor]]:
        """
        Get a single sample.
        
        Returns:
            image: Tensor of shape (C, H, W)
            targets: Dict with keys for each classification head
                - Single-label heads: LongTensor with class index
                - Multi-label heads: FloatTensor with binary vector
        """
        sample = self.samples[idx]
        
        # Load image
        image_path = self.images_root / sample["labeled_image_path"]
        image = Image.open(image_path).convert("RGB")
        
        if self.transform:
            image = self.transform(image)
        
        # Encode targets for each head
        targets = {}
        
        for head_name, head in self.taxonomy.items():
            if head_name not in sample or sample[head_name] is None:
                # Missing label - use default
                if head.head_type == "single-label":
                    targets[head_name] = torch.tensor(-1, dtype=torch.long)  # Ignore index
                else:
                    targets[head_name] = torch.zeros(head.num_classes, dtype=torch.float32)
                continue
            
            if head.head_type == "single-label":
                # Encode as class index
                class_name = sample[head_name]
                if class_name in head.class_to_idx:
                    targets[head_name] = torch.tensor(head.class_to_idx[class_name], dtype=torch.long)
                else:
                    targets[head_name] = torch.tensor(-1, dtype=torch.long)
            
            else:  # multi-label
                # Encode as binary vector
                label_vector = torch.zeros(head.num_classes, dtype=torch.float32)
                class_names = sample[head_name]
                
                if isinstance(class_names, list):
                    for class_name in class_names:
                        if class_name in head.class_to_idx:
                            label_vector[head.class_to_idx[class_name]] = 1.0
                
                targets[head_name] = label_vector
        
        return image, targets


def get_transforms(config: Dict, split: str = "train") -> transforms.Compose:
    """
    Get transforms for the specified split.
    
    Args:
        config: Configuration dictionary with data.augmentations
        split: train/val/test
    
    Returns:
        Composed transforms
    """
    image_size = config["data"]["image_size"]
    normalize_mean = config["data"]["normalize_mean"]
    normalize_std = config["data"]["normalize_std"]
    
    if split == "train":
        # Training augmentations
        aug_config = config["data"]["augmentations"]
        
        transform_list = [
            transforms.Resize((image_size, image_size)),
            transforms.RandomHorizontalFlip(p=aug_config.get("random_horizontal_flip", 0.5)),
            transforms.RandomRotation(degrees=aug_config.get("random_rotation_degrees", 10)),
            transforms.ColorJitter(
                brightness=aug_config.get("color_jitter_brightness", 0.2),
                contrast=aug_config.get("color_jitter_contrast", 0.2),
                saturation=aug_config.get("color_jitter_saturation", 0.1),
                hue=aug_config.get("color_jitter_hue", 0.05)
            ),
            transforms.RandomResizedCrop(
                size=image_size,
                scale=(
                    aug_config.get("random_resized_crop_min", 0.8),
                    aug_config.get("random_resized_crop_max", 1.0)
                )
            ),
            transforms.ToTensor(),
            transforms.Normalize(mean=normalize_mean, std=normalize_std)
        ]
    else:
        # Val/test: just resize and normalize
        transform_list = [
            transforms.Resize((image_size, image_size)),
            transforms.ToTensor(),
            transforms.Normalize(mean=normalize_mean, std=normalize_std)
        ]
    
    return transforms.Compose(transform_list)


def create_dataloaders(
    config: Dict,
    data_root: Path
) -> Tuple[DataLoader, DataLoader, DataLoader]:
    """
    Create train, validation, and test dataloaders.
    
    Args:
        config: Configuration dictionary
        data_root: Root directory containing splits/
    
    Returns:
        train_loader, val_loader, test_loader
    """
    splits_dir = data_root / "splits"
    images_root = data_root / "labeled" / "images"
    
    # Get transforms
    train_transform = get_transforms(config, "train")
    val_transform = get_transforms(config, "val")
    
    # Create datasets
    train_dataset = RealEstateDataset(
        labels_path=splits_dir / "train.jsonl",
        images_root=images_root,
        transform=train_transform,
        split="train"
    )
    
    val_dataset = RealEstateDataset(
        labels_path=splits_dir / "val.jsonl",
        images_root=images_root,
        transform=val_transform,
        split="val"
    )
    
    test_dataset = RealEstateDataset(
        labels_path=splits_dir / "test.jsonl",
        images_root=images_root,
        transform=val_transform,
        split="test"
    )
    
    # Create dataloaders
    train_loader = DataLoader(
        train_dataset,
        batch_size=config["training"]["batch_size"],
        shuffle=True,
        num_workers=config["data"]["num_workers"],
        pin_memory=config["data"]["pin_memory"]
    )
    
    val_loader = DataLoader(
        val_dataset,
        batch_size=config["training"]["batch_size"],
        shuffle=False,
        num_workers=config["data"]["num_workers"],
        pin_memory=config["data"]["pin_memory"]
    )
    
    test_loader = DataLoader(
        test_dataset,
        batch_size=config["inference"]["batch_size"],
        shuffle=False,
        num_workers=config["data"]["num_workers"],
        pin_memory=config["data"]["pin_memory"]
    )
    
    return train_loader, val_loader, test_loader


def split_dataset(
    labels_path: Path,
    output_dir: Path,
    train_ratio: float = 0.8,
    val_ratio: float = 0.1,
    test_ratio: float = 0.1,
    stratify_by: str = "room_type"
):
    """
    Split labeled dataset into train/val/test sets with stratification.
    
    Args:
        labels_path: Path to JSONL file with all labels
        output_dir: Directory to save split files
        train_ratio: Proportion for training
        val_ratio: Proportion for validation
        test_ratio: Proportion for testing
        stratify_by: Classification head to stratify by (default: room_type)
    """
    from sklearn.model_selection import train_test_split
    
    # Load all samples
    samples = []
    with open(labels_path, 'r') as f:
        for line in f:
            if line.strip():
                samples.append(json.loads(line))
    
    # Extract stratify labels
    stratify_labels = [sample.get(stratify_by, "unknown") for sample in samples]
    
    # Split train / temp (val + test)
    train_samples, temp_samples, _, temp_labels = train_test_split(
        samples,
        stratify_labels,
        test_size=(val_ratio + test_ratio),
        random_state=42,
        stratify=stratify_labels
    )
    
    # Split temp into val / test
    val_samples, test_samples = train_test_split(
        temp_samples,
        test_size=(test_ratio / (val_ratio + test_ratio)),
        random_state=42,
        stratify=temp_labels
    )
    
    # Save splits
    output_dir.mkdir(parents=True, exist_ok=True)
    
    for split_name, split_samples in [("train", train_samples), ("val", val_samples), ("test", test_samples)]:
        split_path = output_dir / f"{split_name}.jsonl"
        with open(split_path, 'w') as f:
            for sample in split_samples:
                f.write(json.dumps(sample) + '\n')
        
        print(f"✓ Saved {len(split_samples)} samples to {split_path}")
    
    print(f"\nDataset split complete:")
    print(f"  Train: {len(train_samples)} ({len(train_samples)/len(samples)*100:.1f}%)")
    print(f"  Val:   {len(val_samples)} ({len(val_samples)/len(samples)*100:.1f}%)")
    print(f"  Test:  {len(test_samples)} ({len(test_samples)/len(samples)*100:.1f}%)")


if __name__ == "__main__":
    # Example: Split dataset
    import argparse
    
    parser = argparse.ArgumentParser(description="Split labeled dataset")
    parser.add_argument("--labels", type=str, required=True, help="Path to labels.jsonl")
    parser.add_argument("--output", type=str, default="./data/splits", help="Output directory")
    parser.add_argument("--train-ratio", type=float, default=0.8)
    parser.add_argument("--val-ratio", type=float, default=0.1)
    parser.add_argument("--test-ratio", type=float, default=0.1)
    
    args = parser.parse_args()
    
    split_dataset(
        labels_path=Path(args.labels),
        output_dir=Path(args.output),
        train_ratio=args.train_ratio,
        val_ratio=args.val_ratio,
        test_ratio=args.test_ratio
    )
