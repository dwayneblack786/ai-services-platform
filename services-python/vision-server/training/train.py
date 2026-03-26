"""
Training loop for DINOv2 real estate classifier.

Supports:
- Multi-head classification (single-label and multi-label)
- Mixed precision training (AMP)
- Gradient accumulation
- Early stopping
- Checkpointing
"""

import os
import yaml
import argparse
from pathlib import Path
from typing import Dict
import torch
import torch.nn as nn
from torch.utils.tensorboard import SummaryWriter
from tqdm import tqdm

from .model import create_model, RealEstateClassifier
from .dataset import create_dataloaders
from .taxonomy import TAXONOMY


def create_loss_functions(taxonomy: Dict) -> Dict[str, nn.Module]:
    """Create loss functions for each classification head."""
    losses = {}
    
    for head_name, head_config in taxonomy.items():
        if head_config.head_type == "single-label":
            # CrossEntropyLoss for single-label classification
            losses[head_name] = nn.CrossEntropyLoss(ignore_index=-1)
        else:
            # BCEWithLogitsLoss for multi-label classification
            losses[head_name] = nn.BCEWithLogitsLoss()
    
    return losses


def train_epoch(
    model: RealEstateClassifier,
    train_loader,
    optimizer,
    loss_functions: Dict,
    loss_weights: Dict,
    device: torch.device,
    scaler,
    config: Dict,
    epoch: int,
    writer: SummaryWriter
):
    """Train for one epoch."""
    model.train()
    
    epoch_losses = {head: 0.0 for head in loss_functions.keys()}
    epoch_losses["total"] = 0.0
    
    pbar = tqdm(train_loader, desc=f"Epoch {epoch}")
    
    for batch_idx, (images, targets) in enumerate(pbar):
        # Move to device
        images = images.to(device)
        targets = {k: v.to(device) for k, v in targets.items()}
        
        # Forward pass with mixed precision
        with torch.cuda.amp.autocast(enabled=config["device"]["mixed_precision"]):
            outputs = model(images)
            
            # Compute losses for each head
            losses = {}
            total_loss = 0.0
            
            for head_name in loss_functions.keys():
                head_loss = loss_functions[head_name](outputs[head_name], targets[head_name])
                weight = loss_weights.get(head_name, 1.0)
                weighted_loss = head_loss * weight
                
                losses[head_name] = head_loss.item()
                total_loss += weighted_loss
            
            losses["total"] = total_loss.item()
        
        # Backward pass
        optimizer.zero_grad()
        scaler.scale(total_loss).backward()
        
        # Gradient clipping
        if config["training"]["gradient_clip_norm"] > 0:
            scaler.unscale_(optimizer)
            torch.nn.utils.clip_grad_norm_(
                model.parameters(),
                config["training"]["gradient_clip_norm"]
            )
        
        scaler.step(optimizer)
        scaler.update()
        
        # Update epoch losses
        for head_name in losses.keys():
            epoch_losses[head_name] += losses[head_name]
        
        # Update progress bar
        pbar.set_postfix({"loss": f"{losses['total']:.4f}"})
        
        # Log to tensorboard
        if batch_idx % config["logging"]["log_interval"] == 0:
            global_step = epoch * len(train_loader) + batch_idx
            for head_name, loss_value in losses.items():
                writer.add_scalar(f"train/loss_{head_name}", loss_value, global_step)
    
    # Average losses
    for head_name in epoch_losses.keys():
        epoch_losses[head_name] /= len(train_loader)
    
    return epoch_losses


@torch.no_grad()
def validate(
    model: RealEstateClassifier,
    val_loader,
    loss_functions: Dict,
    loss_weights: Dict,
    device: torch.device,
    config: Dict
):
    """Validate model."""
    model.eval()
    
    epoch_losses = {head: 0.0 for head in loss_functions.keys()}
    epoch_losses["total"] = 0.0
    
    for images, targets in tqdm(val_loader, desc="Validating"):
        # Move to device
        images = images.to(device)
        targets = {k: v.to(device) for k, v in targets.items()}
        
        # Forward pass
        outputs = model(images)
        
        # Compute losses
        total_loss = 0.0
        
        for head_name in loss_functions.keys():
            head_loss = loss_functions[head_name](outputs[head_name], targets[head_name])
            weight = loss_weights.get(head_name, 1.0)
            weighted_loss = head_loss * weight
            
            epoch_losses[head_name] += head_loss.item()
            total_loss += weighted_loss
        
        epoch_losses["total"] += total_loss.item()
    
    # Average losses
    for head_name in epoch_losses.keys():
        epoch_losses[head_name] /= len(val_loader)
    
    return epoch_losses


def main():
    parser = argparse.ArgumentParser(description="Train DINOv2 real estate classifier")
    parser.add_argument("--config", type=str, default="training/config.yaml",
                       help="Path to config file")
    parser.add_argument("--resume", type=str, default=None,
                       help="Path to checkpoint to resume from")
    parser.add_argument("--unfreeze-last-n", type=int, default=None,
                       help="Override config: unfreeze last N transformer blocks")
    
    args = parser.parse_args()
    
    # Load config
    config_path = Path(args.config)
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)
    
    # Override unfreeze if specified
    if args.unfreeze_last_n is not None:
        config["model"]["unfreeze_last_n_blocks"] = args.unfreeze_last_n
    
    print("=" * 60)
    print("DINOv2 Real Estate Classifier Training")
    print("=" * 60)
    print(f"Config: {config_path}")
    print(f"Backbone: {config['model']['backbone']}")
    print(f"Frozen backbone: {config['model']['freeze_backbone']}")
    print(f"Unfreeze last N blocks: {config['model']['unfreeze_last_n_blocks']}")
    print("=" * 60)
    
    # Set device
    device = torch.device("cuda" if torch.cuda.is_available() and config["device"]["use_cuda"] else "cpu")
    print(f"\nUsing device: {device}")
    
    if device.type == "cuda":
        print(f"GPU: {torch.cuda.get_device_name(0)}")
        print(f"VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB")
    
    # Create model
    print("\nCreating model...")
    model = create_model(config)
    model = model.to(device)
    
    # Create dataloaders
    print("\nLoading datasets...")
    data_root = Path(config["paths"]["data_root"])
    train_loader, val_loader, test_loader = create_dataloaders(config, data_root)
    
    # Loss functions
    loss_functions = create_loss_functions(TAXONOMY)
    loss_weights = config["training"]["loss_weights"]
    
    # Optimizer
    if config["model"]["unfreeze_last_n_blocks"] > 0:
        # Separate learning rates for backbone and heads
        params = [
            {"params": model.heads.parameters(), "lr": config["training"]["learning_rate"]},
            {"params": model.backbone.parameters(), "lr": config["training"]["learning_rate_backbone"]}
        ]
    else:
        params = model.parameters()
    
    optimizer = torch.optim.AdamW(
        params,
        lr=config["training"]["learning_rate"],
        weight_decay=config["training"]["weight_decay"]
    )
    
    # Learning rate scheduler
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
        optimizer,
        T_max=config["training"]["epochs"],
        eta_min=1e-6
    )
    
    # Mixed precision scaler
    scaler = torch.cuda.amp.GradScaler(enabled=config["device"]["mixed_precision"])
    
    # Tensorboard writer
    log_dir = Path(config["paths"]["logs"]) / "train"
    log_dir.mkdir(parents=True, exist_ok=True)
    writer = SummaryWriter(log_dir)
    
    # Training loop
    print(f"\nStarting training for {config['training']['epochs']} epochs...")
    best_val_loss = float('inf')
    patience_counter = 0
    
    for epoch in range(1, config["training"]["epochs"] + 1):
        print(f"\nEpoch {epoch}/{config['training']['epochs']}")
        
        # Train
        train_losses = train_epoch(
            model, train_loader, optimizer, loss_functions, loss_weights,
            device, scaler, config, epoch, writer
        )
        
        # Validate
        val_losses = validate(
            model, val_loader, loss_functions, loss_weights, device, config
        )
        
        # Log to tensorboard
        for head_name in train_losses.keys():
            writer.add_scalar(f"epoch/train_loss_{head_name}", train_losses[head_name], epoch)
            writer.add_scalar(f"epoch/val_loss_{head_name}", val_losses[head_name], epoch)
        
        writer.add_scalar("learning_rate", optimizer.param_groups[0]["lr"], epoch)
        
        # Print epoch summary
        print(f"\nTrain Loss: {train_losses['total']:.4f}")
        print(f"Val Loss:   {val_losses['total']:.4f}")
        
        # Learning rate step
        scheduler.step()
        
        # Save checkpoint
        if epoch % config["logging"]["save_checkpoint_every"] == 0:
            checkpoint_path = Path(config["paths"]["models"]) / f"checkpoint_epoch_{epoch}.pt"
            checkpoint_path.parent.mkdir(parents=True, exist_ok=True)
            
            torch.save({
                'epoch': epoch,
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'scheduler_state_dict': scheduler.state_dict(),
                'train_losses': train_losses,
                'val_losses': val_losses,
                'config': config
            }, checkpoint_path)
            
            print(f"✓ Checkpoint saved: {checkpoint_path}")
        
        # Early stopping
        if val_losses['total'] < best_val_loss:
            best_val_loss = val_losses['total']
            patience_counter = 0
            
            # Save best model
            best_model_path = Path(config["paths"]["models"]) / "best_model.pt"
            torch.save(model.state_dict(), best_model_path)
            print(f"✓ New best model saved: {best_model_path}")
        else:
            patience_counter += 1
            
            if patience_counter >= config["training"]["early_stopping_patience"]:
                print(f"\nEarly stopping triggered after {epoch} epochs")
                break
    
    # Save final model
    final_model_path = Path(config["paths"]["models"]) / "realestate_classifier_v1.pt"
    torch.save(model.state_dict(), final_model_path)
    print(f"\n✓ Final model saved: {final_model_path}")
    
    writer.close()
    print("\n" + "=" * 60)
    print("Training complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
