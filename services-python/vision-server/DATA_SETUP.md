# Data Setup Guide

This guide explains how to acquire and prepare datasets for training the PropVision AI real estate image classifier.

## Directory Structure

The following data directories are **not included** in the repository (they're in `.gitignore`):

```
services-python/vision-server/
├── data/
│   ├── raw/              # Downloaded, unlabeled images
│   ├── labeled/          # Auto-labeled with LM Studio/Claude
│   ├── processed/        # Split into train/val/test sets
│   └── downloads/        # Temporary download files
├── models/               # Trained model checkpoints
└── validation/           # Validation reports and plots
```

**Why excluded?**
- Large files (20K+ images = 5-10GB)
- User-specific datasets
- Regenerated during training

## Quick Start

### Option 1: Pre-labeled Dataset (Recommended)

If someone has already labeled a dataset, ask them to share the `data/labeled/labels.jsonl` file:

```powershell
# 1. Create data directory
New-Item -ItemType Directory -Force data/labeled

# 2. Copy the labels file they shared
Copy-Item "path/to/shared/labels.jsonl" data/labeled/

# 3. Download the images from the same source they used
# Follow "Download Public Datasets" section below
```

### Option 2: Label Your Own Dataset (From Scratch)

Follow the complete workflow:

```powershell
# 1. Download raw images (see below)
# 2. Label with LM Studio (see LM_STUDIO_LABELING_GUIDE.md)
# 3. Validate and review (see LABEL_REVIEW_GUIDE.md)
# 4. Train the model (see README.md)
```

---

## Step 1: Download Public Datasets

### Automated Download (Recommended)

Use the provided download script:

```powershell
# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Download MIT Indoor Scenes dataset (~2,000 images)
python training/download_data.py --dataset mit-indoor

# Download additional datasets (optional)
python training/download_data.py --dataset open-images-home
```

**Available datasets:**
- `mit-indoor` - MIT Indoor Scenes (2K images, 17 room types)
- `open-images-home` - Open Images subset (10K+ home images)
- `places365` - Places365 indoor subset (large, 50K+)

### Manual Download

If automated download fails, manually download from these sources:

#### 1. MIT Indoor Scenes Dataset
- **URL**: http://web.mit.edu/torralba/www/indoor.html
- **Size**: ~2.6GB (15,620 images)
- **License**: Research use
- **Instructions**:
  ```powershell
  # Download and extract
  Invoke-WebRequest -Uri "http://groups.csail.mit.edu/vision/LabelMe/NewImages/indoorCVPR_09.tar" -OutFile "data/downloads/indoor.tar"
  tar -xf data/downloads/indoor.tar -C data/raw/
  ```

#### 2. Open Images Dataset (Home Interior Subset)
- **URL**: https://storage.googleapis.com/openimages/web/index.html
- **Size**: Variable (download what you need)
- **License**: CC BY 4.0
- **Instructions**: Use the Open Images downloader tool
  ```powershell
  pip install openimages
  oi_download_dataset --base_dir data/raw --labels Kitchen Bathroom Bedroom "Living room"
  ```

#### 3. Real Estate Stock Photos (Free Sources)
- **Unsplash**: https://unsplash.com/s/photos/real-estate-interior
- **Pexels**: https://www.pexels.com/search/home%20interior/
- **Pixabay**: https://pixabay.com/images/search/house%20interior/

**Scraping tip**: Use `gallery-dl` to batch download:
```powershell
pip install gallery-dl
gallery-dl "https://unsplash.com/s/photos/real-estate-interior"
```

#### 4. Zillow/Redfin Public Listings
⚠️ **Legal Note**: Only use if you have permission. Many sites prohibit scraping.

If you have access to MLS data or your own property photos, that's ideal.

---

## Step 2: Organize Images

After downloading, organize images into `data/raw/`:

```powershell
# Expected structure
data/raw/
├── image_001.jpg
├── image_002.jpg
├── image_003.jpg
...
```

**Requirements:**
- **Format**: JPG, JPEG, PNG (WEBP may not work with all models)
- **Size**: Any size (will be resized during labeling)
- **Quantity**: Minimum 500 images, recommended 5,000-20,000
- **Diversity**: Include various room types, styles, conditions

**Check your images:**
```powershell
# Count images
Get-ChildItem data/raw -Filter *.jpg -Recurse | Measure-Object

# Verify formats
Get-ChildItem data/raw -Recurse | Group-Object Extension
```

---

## Step 3: Label Images

See [LM_STUDIO_LABELING_GUIDE.md](LM_STUDIO_LABELING_GUIDE.md) for complete labeling workflow.

**Quick start:**
```powershell
# Label 100 images to test
python training/label_with_lmstudio.py \
    --input data/raw \
    --output data/labeled \
    --max-images 100 \
    --model "llava-v1.6-mistral-7b"

# Or use the guided script
.\quick_start_validation.ps1
```

**Output**: `data/labeled/labels.jsonl` (one JSON object per line)

---

## Step 4: Validate Labels

See [LABEL_REVIEW_GUIDE.md](LABEL_REVIEW_GUIDE.md) for validation workflow.

```powershell
# Validate label quality
python training/validate_labels.py \
    --labels data/labeled/labels.jsonl \
    --plot

# Review and correct with GUI
python review_labels.py \
    --labels data/labeled/labels.jsonl
```

---

## Step 5: Split Dataset

```powershell
# Split into train/val/test sets (80/10/10 split)
python training/dataset.py \
    --labels data/labeled/labels.jsonl \
    --output data/processed
```

**Output**:
- `data/processed/train/` (80%)
- `data/processed/val/` (10%)
- `data/processed/test/` (10%)

---

## Sharing Datasets

### To Share Your Labeled Dataset:

```powershell
# Package labels and metadata
$timestamp = Get-Date -Format "yyyy-MM-dd"
Compress-Archive -Path data/labeled/labels.jsonl,data/labeled/metadata.json `
    -DestinationPath "propvision-labels-$timestamp.zip"

# Share:
# 1. The zip file
# 2. Instructions on where to get the source images
# 3. The model you used for labeling
```

### To Use Someone's Labeled Dataset:

```powershell
# 1. Get the labels file
# 2. Download source images to data/raw/
# 3. Verify paths match
python -c "import json; print([json.loads(l)['labeled_image_path'] for l in open('data/labeled/labels.jsonl')][:5])"

# 4. Proceed with validation and training
```

---

## Dataset Requirements

### Minimum Requirements
- **Images**: 500+ (test), 5,000+ (production)
- **Room type diversity**: At least 5 different room types
- **Quality**: Clear, well-lit images
- **Resolution**: 640x480 minimum

### Recommended Dataset
- **Images**: 15,000-25,000
- **Room types**: All 17 types represented
- **Styles**: Mix of modern, traditional, transitional
- **Conditions**: Mix of excellent, good, fair

### Dataset Balance

Check balance with validation script:
```powershell
python training/validate_labels.py --labels data/labeled/labels.jsonl
```

**Target distribution** (example):
- Kitchen: 20-30%
- Bathroom: 15-20%
- Bedroom: 15-20%
- Living room: 15-20%
- Other rooms: 25-35%

---

## Troubleshooting

### "Not enough images"
- Download more datasets
- Use data augmentation during training
- Start with transfer learning (DINOv2 pretrained)

### "Images in wrong format"
Convert with PIL:
```powershell
# Convert WEBP to JPG
python -c "from PIL import Image; import os; [Image.open(f).convert('RGB').save(f.replace('.webp','.jpg')) for f in os.listdir('data/raw') if f.endswith('.webp')]"
```

### "Labels don't match images"
Check paths in labels.jsonl:
```powershell
# Verify first 5 image paths
Get-Content data/labeled/labels.jsonl -First 5 | ConvertFrom-Json | Select-Object labeled_image_path
```

### "Download failed"
- Check internet connection
- Try manual download
- Use alternative dataset sources

---

## Cost Estimate

### Option 1: LM Studio (Local) - **FREE**
- **Cost**: $0
- **Time**: 2-5 hours for 20K images
- **Requirements**: RTX 3090 Ti or equivalent GPU

### Option 2: Claude Vision API - **~$15-20**
- **Cost**: ~$0.001 per image × 20K = $20
- **Time**: 1-2 hours for 20K images
- **Requirements**: Anthropic API key, internet

### Option 3: Manual Labeling - **Very Expensive**
- **Cost**: $0 (your time) or $100-500 (if outsourced)
- **Time**: 40-80 hours for 20K images
- **Not recommended**: Use auto-labeling instead

---

## Next Steps

After setting up data:

1. ✅ **Validate labels**: [LABEL_REVIEW_GUIDE.md](LABEL_REVIEW_GUIDE.md)
2. ✅ **Train model**: [README.md](README.md#training)
3. ✅ **Evaluate**: `python training/evaluate.py`
4. ✅ **Export**: `python training/export_onnx.py`

---

## Quick Reference

```powershell
# Full workflow from scratch
python training/download_data.py                          # Download images
python training/label_with_lmstudio.py --max-images 100  # Test labeling
python training/validate_labels.py --labels data/labeled/labels.jsonl --plot  # Check quality
python review_labels.py --labels data/labeled/labels.jsonl  # Correct errors
python training/label_with_lmstudio.py                    # Label all images
python training/dataset.py --labels data/labeled/labels.jsonl  # Split dataset
python training/train.py                                  # Train model
```

---

*For more details, see:*
- [LM_STUDIO_LABELING_GUIDE.md](LM_STUDIO_LABELING_GUIDE.md) - Labeling workflow
- [LABEL_REVIEW_GUIDE.md](LABEL_REVIEW_GUIDE.md) - Validation and review
- [TROUBLESHOOTING_LM_STUDIO.md](TROUBLESHOOTING_LM_STUDIO.md) - Common issues
- [README.md](README.md) - Main documentation
