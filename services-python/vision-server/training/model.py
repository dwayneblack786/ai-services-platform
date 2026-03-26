"""
DINOv2-based multi-head classifier for real estate property attributes.

Architecture:
- Backbone: DINOv2 ViT-B/14 (86M params, 768-dim embeddings)
- 7 classification heads (shared architecture per head)
- Mixed single-label and multi-label heads
"""

import torch
import torch.nn as nn
from typing import Dict, Optional
from .taxonomy import TAXONOMY, get_all_heads


class RealEstateClassifier(nn.Module):
    """
    Multi-head classifier for real estate property attributes.
    
    Uses DINOv2 ViT-B/14 as frozen feature extractor, then trains
    7 classification heads for different property attributes.
    """
    
    def __init__(
        self,
        backbone_name: str = "dinov2_vitb14",
        freeze_backbone: bool = True,
        unfreeze_last_n_blocks: int = 0,
        dropout: float = 0.3,
        hidden_dim: int = 256
    ):
        """
        Args:
            backbone_name: DINOv2 model name
            freeze_backbone: Whether to freeze backbone initially
            unfreeze_last_n_blocks: Number of final transformer blocks to unfreeze (0 = all frozen)
            dropout: Dropout rate for classification heads
            hidden_dim: Hidden dimension for classification heads
        """
        super().__init__()
        
        # Load DINOv2 backbone
        self.backbone = torch.hub.load('facebookresearch/dinov2', backbone_name)
        self.embed_dim = 768  # ViT-B/14 embedding dimension
        
        # Freeze backbone if specified
        if freeze_backbone:
            for param in self.backbone.parameters():
                param.requires_grad = False
            
            # Optionally unfreeze last n transformer blocks
            if unfreeze_last_n_blocks > 0:
                self._unfreeze_last_n_blocks(unfreeze_last_n_blocks)
        
        # Create classification heads
        self.heads = nn.ModuleDict()
        taxonomy = get_all_heads()
        
        for head_name, head_config in taxonomy.items():
            self.heads[head_name] = self._create_head(
                input_dim=self.embed_dim,
                hidden_dim=hidden_dim,
                output_dim=head_config.num_classes,
                dropout=dropout
            )
        
        self.taxonomy = taxonomy
    
    def _create_head(
        self,
        input_dim: int,
        hidden_dim: int,
        output_dim: int,
        dropout: float
    ) -> nn.Module:
        """Create a classification head with shared architecture."""
        return nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(inplace=True),
            nn.Dropout(p=dropout),
            nn.Linear(hidden_dim, output_dim)
        )
    
    def _unfreeze_last_n_blocks(self, n: int):
        """Unfreeze the last n transformer blocks for fine-tuning."""
        # DINOv2 ViT-B has 12 transformer blocks
        total_blocks = 12
        
        if n > total_blocks:
            n = total_blocks
        
        # Unfreeze the specified blocks
        # In DINOv2, blocks are in self.backbone.blocks
        for i in range(total_blocks - n, total_blocks):
            for param in self.backbone.blocks[i].parameters():
                param.requires_grad = True
        
        print(f"Unfroze last {n} transformer blocks for fine-tuning")
    
    def forward(self, x: torch.Tensor) -> Dict[str, torch.Tensor]:
        """
        Forward pass through backbone and all classification heads.
        
        Args:
            x: Input images of shape (B, C, H, W)
        
        Returns:
            Dict mapping head names to logits (not probabilities)
            - Single-label heads: shape (B, num_classes)
            - Multi-label heads: shape (B, num_classes)
        """
        # Extract features from DINOv2 backbone
        with torch.set_grad_enabled(self.training):
            features = self.backbone(x)  # (B, embed_dim)
        
        # Pass through each classification head
        outputs = {}
        for head_name, head in self.heads.items():
            outputs[head_name] = head(features)
        
        return outputs
    
    def get_predictions(
        self,
        outputs: Dict[str, torch.Tensor],
        confidence_threshold: float = 0.5
    ) -> Dict[str, torch.Tensor]:
        """
        Convert raw logits to predictions.
        
        Args:
            outputs: Raw logits from forward()
            confidence_threshold: Threshold for multi-label predictions
        
        Returns:
            Dict with predictions:
            - Single-label: class indices (B,)
            - Multi-label: binary vectors (B, num_classes)
        """
        predictions = {}
        
        for head_name, logits in outputs.items():
            head_config = self.taxonomy[head_name]
            
            if head_config.head_type == "single-label":
                # Argmax for single-label classification
                predictions[head_name] = torch.argmax(logits, dim=1)
            else:
                # Sigmoid + threshold for multi-label classification
                probs = torch.sigmoid(logits)
                predictions[head_name] = (probs > confidence_threshold).long()
        
        return predictions
    
    def get_num_trainable_params(self) -> int:
        """Get number of trainable parameters."""
        return sum(p.numel() for p in self.parameters() if p.requires_grad)
    
    def get_num_total_params(self) -> int:
        """Get total number of parameters."""
        return sum(p.numel() for p in self.parameters())


def create_model(config: Dict) -> RealEstateClassifier:
    """
    Create model from configuration.
    
    Args:
        config: Configuration dictionary with model settings
    
    Returns:
        Initialized model
    """
    model_config = config["model"]
    
    model = RealEstateClassifier(
        backbone_name=model_config["backbone"],
        freeze_backbone=model_config["freeze_backbone"],
        unfreeze_last_n_blocks=model_config["unfreeze_last_n_blocks"],
        dropout=0.3,
        hidden_dim=256
    )
    
    # Print parameter counts
    print(f"Model created:")
    print(f"  Total parameters: {model.get_num_total_params():,}")
    print(f"  Trainable parameters: {model.get_num_trainable_params():,}")
    
    return model


if __name__ == "__main__":
    # Test model creation
    import yaml
    from pathlib import Path
    
    config_path = Path(__file__).parent / "config.yaml"
    
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)
    
    print("Creating model...")
    model = create_model(config)
    
    # Test forward pass
    dummy_input = torch.randn(2, 3, 518, 518)
    
    print("\nTesting forward pass...")
    with torch.no_grad():
        outputs = model(dummy_input)
    
    print("\nOutput shapes:")
    for head_name, output in outputs.items():
        print(f"  {head_name}: {output.shape}")
    
    print("\n✓ Model test successful")
