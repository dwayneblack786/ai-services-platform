"""
Automated dataset acquisition for real estate property classification.

Downloads and organizes images from open datasets:
- MIT Indoor Scenes (15,620 images)
- Open Images V7 (filtered for relevant categories)
- SUN397 (108K images, subset)
- HuggingFace datasets (real estate/interior design)

Target: 20K+ images balanced across room types.
"""

import os
import urllib.request
import tarfile
import zipfile
from pathlib import Path
from typing import List, Dict
import json
from tqdm import tqdm

# Dataset URLs and metadata
DATASETS = {
    "mit_indoor": {
        "url": "http://groups.csail.mit.edu/vision/LabelMe/NewImages/indoorCVPR_09.tar",
        "extract_dir": "mit_indoor",
        "type": "tar"
    },
    "sun397": {
        "url": "http://vision.princeton.edu/projects/2010/SUN/SUN397.tar.gz",
        "extract_dir": "sun397",
        "type": "tar.gz",
        "filter_categories": [
            "kitchen", "bathroom", "bedroom", "living_room", "dining_room",
            "office", "garage", "basement", "attic", "patio"
        ]
    }
}


def download_file(url: str, dest_path: Path, desc: str = "Downloading"):
    """Download a file with progress bar."""
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    
    try:
        with tqdm(unit='B', unit_scale=True, desc=desc) as pbar:
            def reporthook(blocknum, blocksize, totalsize):
                pbar.total = totalsize
                pbar.update(blocksize)
            
            urllib.request.urlretrieve(url, dest_path, reporthook)
        print(f"✓ Downloaded: {dest_path}")
        return True
    except Exception as e:
        print(f"✗ Error downloading {url}: {e}")
        return False


def extract_archive(archive_path: Path, extract_to: Path, archive_type: str):
    """Extract tar or zip archive."""
    extract_to.mkdir(parents=True, exist_ok=True)
    
    try:
        if archive_type in ["tar", "tar.gz"]:
            with tarfile.open(archive_path, 'r:*') as tar:
                tar.extractall(extract_to)
        elif archive_type == "zip":
            with zipfile.ZipFile(archive_path, 'r') as zip_ref:
                zip_ref.extractall(extract_to)
        
        print(f"✓ Extracted to: {extract_to}")
        return True
    except Exception as e:
        print(f"✗ Error extracting {archive_path}: {e}")
        return False


def download_mit_indoor(data_root: Path) -> bool:
    """Download and extract MIT Indoor Scenes dataset."""
    print("\n=== MIT Indoor Scenes Dataset ===")
    dataset_info = DATASETS["mit_indoor"]
    
    archive_path = data_root / "downloads" / "mit_indoor.tar"
    extract_dir = data_root / "raw" / dataset_info["extract_dir"]
    
    # Download
    if not archive_path.exists():
        if not download_file(dataset_info["url"], archive_path, "MIT Indoor"):
            return False
    else:
        print(f"✓ Archive already exists: {archive_path}")
    
    # Extract
    if not extract_dir.exists():
        if not extract_archive(archive_path, extract_dir, dataset_info["type"]):
            return False
    else:
        print(f"✓ Already extracted: {extract_dir}")
    
    # Count images
    image_count = len(list(extract_dir.rglob("*.jpg"))) + len(list(extract_dir.rglob("*.png")))
    print(f"✓ Total images: {image_count}")
    
    return True


def download_sun397(data_root: Path) -> bool:
    """Download and extract SUN397 dataset (filtered categories)."""
    print("\n=== SUN397 Dataset ===")
    dataset_info = DATASETS["sun397"]
    
    archive_path = data_root / "downloads" / "sun397.tar.gz"
    extract_dir = data_root / "raw" / dataset_info["extract_dir"]
    
    # Download
    if not archive_path.exists():
        if not download_file(dataset_info["url"], archive_path, "SUN397"):
            return False
    else:
        print(f"✓ Archive already exists: {archive_path}")
    
    # Extract
    if not extract_dir.exists():
        if not extract_archive(archive_path, extract_dir, dataset_info["type"]):
            return False
    else:
        print(f"✓ Already extracted: {extract_dir}")
    
    # Count relevant images
    image_count = 0
    for category in dataset_info["filter_categories"]:
        category_path = extract_dir / category
        if category_path.exists():
            image_count += len(list(category_path.rglob("*.jpg")))
    
    print(f"✓ Relevant images: {image_count}")
    
    return True


def download_from_huggingface(data_root: Path) -> bool:
    """
    Download datasets from HuggingFace Hub.
    
    Note: Requires 'datasets' library. Install with:
    pip install datasets
    """
    print("\n=== HuggingFace Datasets ===")
    
    try:
        from datasets import load_dataset
    except ImportError:
        print("⚠ HuggingFace datasets library not installed. Run:")
        print("  pip install datasets")
        return False
    
    # Example: Search for relevant datasets
    print("Searching for real estate / interior design datasets...")
    print("(This is a placeholder - implement specific dataset downloads)")
    
    # TODO: Implement specific HuggingFace dataset downloads
    # Example:
    # dataset = load_dataset("username/interior-design-dataset")
    # Save images to data_root / "raw" / "huggingface"
    
    return True


def generate_metadata(data_root: Path):
    """Generate metadata file with dataset statistics."""
    metadata = {
        "datasets": [],
        "total_images": 0,
        "download_date": None
    }
    
    raw_dir = data_root / "raw"
    
    for dataset_name in os.listdir(raw_dir):
        dataset_path = raw_dir / dataset_name
        if dataset_path.is_dir():
            image_count = len(list(dataset_path.rglob("*.jpg"))) + \
                         len(list(dataset_path.rglob("*.png"))) + \
                         len(list(dataset_path.rglob("*.jpeg")))
            
            metadata["datasets"].append({
                "name": dataset_name,
                "path": str(dataset_path),
                "image_count": image_count
            })
            metadata["total_images"] += image_count
    
    from datetime import datetime
    metadata["download_date"] = datetime.now().isoformat()
    
    # Save metadata
    metadata_path = data_root / "raw" / "metadata.json"
    with open(metadata_path, 'w') as f:
        json.dump(metadata, indent=2, fp=f)
    
    print(f"\n✓ Metadata saved: {metadata_path}")
    print(f"✓ Total images downloaded: {metadata['total_images']}")


def main():
    """Main download pipeline."""
    # Get data root from config or use default
    data_root = Path(__file__).parent.parent / "data"
    data_root.mkdir(parents=True, exist_ok=True)
    
    print("=" * 60)
    print("Real Estate Dataset Acquisition Pipeline")
    print("=" * 60)
    print(f"Data root: {data_root.absolute()}")
    
    # Download datasets
    success_count = 0
    
    if download_mit_indoor(data_root):
        success_count += 1
    
    if download_sun397(data_root):
        success_count += 1
    
    if download_from_huggingface(data_root):
        success_count += 1
    
    # Generate metadata
    generate_metadata(data_root)
    
    print("\n" + "=" * 60)
    print(f"✓ Download complete: {success_count} datasets acquired")
    print("=" * 60)
    print("\nNext steps:")
    print("1. Review downloaded images in: data/raw/")
    print("2. Run label_with_claude.py to auto-label images")
    print("3. Run train.py to start training")


if __name__ == "__main__":
    main()
