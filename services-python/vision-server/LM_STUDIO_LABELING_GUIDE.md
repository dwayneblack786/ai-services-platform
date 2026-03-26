# LM Studio Auto-Labeling Guide

## Overview

Use LM Studio with local vision models as a **free alternative** to Claude Vision API for labeling real estate images.

**Benefits:**
- 💰 **Free**: No API costs ($0 vs ~$15 for Claude)
- 🔒 **Private**: All data stays local
- ⚡ **Fast**: 2-5 images/sec on RTX 3090 Ti
- 🎯 **Customizable**: Full control over model and prompts

---

## Setup Instructions

### 1. Install LM Studio

1. Download from: https://lmstudio.ai/
2. Install and launch LM Studio

### 2. Download a Vision Model

**Recommended Models:**

| Model | Size | Quality | Speed | VRAM | Notes |
|-------|------|---------|-------|------|-------|
| **llama-3.2-vision-11b** | 11B | ⭐⭐⭐⭐⭐ | ⚡⚡⚡⚡ | 12GB | Best balance |
| **llava-v1.6-34b** | 34B | ⭐⭐⭐⭐⭐ | ⚡⚡⚡ | 20-24GB | High quality, fits RTX 3090 Ti |
| **llava-v1.6-mistral-7b** | 7B | ⭐⭐⭐⭐ | ⚡⚡⚡⚡⚡ | 8GB | Fast, good quality |
| **bakllava-1-7b** | 7B | ⭐⭐⭐⭐ | ⚡⚡⚡⚡⚡ | 8GB | Optimized variant |
| **cogvlm2-llama3-19b** | 19B | ⭐⭐⭐⭐⭐ | ⚡⚡⚡ | 24GB | Excellent accuracy |

**In LM Studio:**
1. Click **Search** tab
2. Search for "llama-3.2-vision" or "llava"
3. Download your chosen model
4. Click **Load model** when download completes

### 3. Start the Local Server

1. Go to **Server** tab in LM Studio
2. Ensure your vision model is loaded
3. Click **Start Server**
4. Default endpoint: `http://127.0.0.1:1234`
5. Leave LM Studio running

### 4. Install openai Package

```powershell
cd services-python/vision-server
.\venv\Scripts\Activate.ps1
pip install openai
```

---

## Usage

### Test Connection

```powershell
python training/label_with_lmstudio.py --test-connection
```

Expected output:
```
✓ Connected to LM Studio at http://127.0.0.1:1234/v1
✓ Available models: llama-3.2-vision-11b
✓ Vision models found: llama-3.2-vision-11b
```

### Label Images

**Basic usage:**
```powershell
python training/label_with_lmstudio.py --input data/raw --output data/labeled
```

**Custom model name:**
```powershell
# Use the exact model name shown in LM Studio
python training/label_with_lmstudio.py \
    --input data/raw \
    --output data/labeled \
    --model "llama-3.2-vision-11b-Q4_K_M"
```

**Test on small batch first:**
```powershell
# Process only 100 images to verify quality
python training/label_with_lmstudio.py \
    --input data/raw \
    --output data/labeled \
    --max-images 100 \
    --confidence 0.7
```

**Full parameters:**
```powershell
python training/label_with_lmstudio.py \
    --input data/raw \
    --output data/labeled \
    --model "llama-3.2-vision" \
    --base-url "http://127.0.0.1:1234/v1" \
    --confidence 0.8 \
    --batch-size 100 \
    --max-images 20000
```

---

## Performance Expectations

### Speed (RTX 3090 Ti 24GB)

| Model | Images/sec | Time for 20K images |
|-------|------------|---------------------|
| llava-v1.6-34b | 2-3 | ~2 hours |
| llama-3.2-vision-11b | 3-4 | ~1.5 hours |
| llava-v1.6-mistral-7b | 4-5 | ~1 hour |
| bakllava-1-7b | 4-5 | ~1 hour |
| cogvlm2-llama3-19b | 2-3 | ~2 hours |

### Quality

**Expected accuracy** (compared to human labels):
- llava-v1.6-34b: 87-92% ⭐ **Recommended for RTX 3090 Ti**
- llama-3.2-vision: 85-90%
- llava-v1.6-mistral-7b: 80-85%
- bakllava-1: 80-85%
- cogvlm2: 85-92%

**Tips for better quality:**
1. Use higher confidence threshold (0.85-0.9)
2. Manually review 5-10% of samples
3. Filter out low-confidence predictions
4. Use larger models if VRAM allows

---

## Troubleshooting

### "Could not connect to LM Studio"
- ✓ Verify LM Studio is running
- ✓ Check Server tab shows "Running" status
- ✓ Verify endpoint is `http://127.0.0.1:1234`
- ✓ Try accessing `http://127.0.0.1:1234/v1/models` in browser

### "No vision models detected"
- ✓ Ensure you loaded a vision model (not text-only)
- ✓ Model name should contain: vision, llava, bakllava, or cogvlm
- ✓ Click "Load model" in LM Studio

### "JSON decode error"
- Some models wrap JSON in markdown - script handles this
- If persistent, try a different model
- Check model's chat template supports structured output

### Slow performance
- Lower batch size or use quantized models (Q4, Q5)
- Ensure GPU acceleration is enabled in LM Studio settings
- Close other GPU-intensive applications

### Out of memory
- Use smaller model (7B instead of 11B/19B)
- Use more heavily quantized version (Q4_K_M instead of Q8)
- Reduce context length in LM Studio settings

---

## Comparison: LM Studio vs Claude

| Feature | LM Studio | Claude Haiku | Claude Sonnet |
|---------|-----------|--------------|---------------|
| **Cost** | Free | ~$15/20K | ~$100/20K |
| **Speed** | 2-5 img/sec | 10-15 img/sec | 5-8 img/sec |
| **Quality** | 80-90% | 90-95% | 92-97% |
| **Privacy** | Fully local | Cloud | Cloud |
| **Setup** | 15 min | 2 min | 2 min |
| **Hardware** | Requires GPU | None | None |

**Recommendation:**
- **Budget-conscious or privacy-sensitive**: Use LM Studio
- **Need highest quality**: Use Claude Sonnet
- **Quick prototype**: Use Claude Haiku

---

## Next Steps

After labeling:

1. **Review sample outputs:**
   ```powershell
   # Check metadata to see success rate
   Get-Content data/labeled/metadata.json
   ```

2. **Split dataset:**
   ```powershell
   python training/dataset.py --labels data/labeled/labels.jsonl --output data/splits
   ```

3. **Start training:**
   ```powershell
   python training/train.py
   ```

---

## Advanced: Custom Models

If you want to try other vision models:

1. Download any vision-capable model to LM Studio
2. Note the exact model name in LM Studio
3. Use that name with `--model` flag:
   ```powershell
   python training/label_with_lmstudio.py --model "your-model-name"
   ```

**Other compatible models:**
- Qwen2-VL variants
- InternVL2 models
- MiniCPM-V models
- Phi-3-vision

---

*For questions or issues, refer to the main README or training documentation.*
