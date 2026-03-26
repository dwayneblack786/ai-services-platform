# Vision Server - PropVision AI

Computer vision training and inference server for real estate property attribute classification using DINOv2.

## Overview

This service fine-tunes DINOv2 (Vision Transformer) to classify property attributes from listing photos:
- **Room types** (17 classes): kitchen, bathroom, bedroom, living room, etc.
- **Flooring** (11 classes): hardwood, tile, marble, carpet, etc.
- **Countertops** (10 classes): granite, quartz, marble, etc.
- **Design styles** (13 classes): modern, traditional, farmhouse, etc.
- **Fixtures** (15 classes): pendant lights, stainless appliances, etc.
- **Materials** (9 classes): brick, stone, stucco, etc.
- **Condition** (5 classes): excellent, good, fair, needs renovation, new construction

## Hardware Requirements

- **GPU**: NVIDIA RTX 3090 Ti (24GB VRAM) or equivalent
- **RAM**: 32GB+ recommended
- **Storage**: 50GB+ for datasets and model checkpoints

## Phase 1: Training Pipeline (Current)

### Setup

```powershell
# Create environment and install dependencies
.\start-vision.ps1

# Verify CUDA
python -c "import torch; print(torch.cuda.is_available())"
```

### Dataset Acquisition

```powershell
# Download open datasets (MIT Indoor, Open Images, etc.)
python training/download_data.py
```

### Auto-Labeling

**Option A: LM Studio (Local, Free) - Recommended**
```powershell
# 1. Download and start LM Studio with a vision model
# 2. Label images locally (cost: $0, 2-5 images/sec on GPU)
python training/label_with_lmstudio.py --input data/raw --output data/labeled

# Test connection first
python training/label_with_lmstudio.py --test-connection
```

**Option B: Claude Vision API (Cloud, Paid)**
```powershell
# Label images using Claude Haiku (cost: ~$15 for 20K images)
python training/label_with_claude.py --input data/raw --output data/labeled
```

📖 **See [LM_STUDIO_LABELING_GUIDE.md](LM_STUDIO_LABELING_GUIDE.md) for detailed LM Studio setup**

### Label Validation & Review

```powershell
# 1. Start with 100 images
python training/label_with_lmstudio.py --input data/raw --output data/labeled --max-images 100

# 2. Validate quality and get statistics
python training/validate_labels.py --labels data/labeled/labels.jsonl --plot --suggest-review 20

# 3. Review and correct labels using GUI
python review_labels.py --labels data/labeled/labels.jsonl

# 4. Continue labeling (auto-resumes from progress)
python training/label_with_lmstudio.py --input data/raw --output data/labeled

# Quick Start Script
.\quick_start_validation.ps1
```

📖 **See [LABEL_REVIEW_GUIDE.md](LABEL_REVIEW_GUIDE.md) for complete validation workflow**

**Features:**
- ✓ **Progress tracking** - Resume labeling automatically
- ✓ **Quality validation** - Statistics, warnings, distribution plots
- ✓ **GUI review tool** - View, edit, and correct labels
- ✓ **Sample suggestions** - Auto-identify low-confidence images
- ✓ **Accuracy metrics** - Track corrections and review progress

### Training

```powershell
# Step 1: Train classification heads (frozen backbone)
python training/train.py --config training/config.yaml

# Step 2: Fine-tune last 3 transformer blocks
python training/train.py --config training/config.yaml --unfreeze-last-n 3
```

### Evaluation

```powershell
# Generate metrics and confusion matrices
python training/evaluate.py --checkpoint models/realestate_classifier_v1.pt
```

### ONNX Export

```powershell
# Export for optimized inference
python training/export_onnx.py --checkpoint models/realestate_classifier_v1.pt
```

## Phase 2: Inference Server (Upcoming)

Flask server with gRPC interface for real-time classification.

## Directory Structure

```
vision-server/
├── server.py              # Flask inference server (Phase 2)
├── requirements.txt       # Python dependencies
├── start-vision.ps1       # Setup and launch script
├── training/              # Training pipeline
├── models/                # Model checkpoints
├── data/                  # Dataset storage
├── proto/                 # gRPC definitions (Phase 2)
└── README.md              # This file
```

## References

- **Base Model**: [DINOv2 ViT-B/14](https://github.com/facebookresearch/dinov2)
- **Parent Plan**: `plans/phase-1-dinov2-training-pipeline.md`
