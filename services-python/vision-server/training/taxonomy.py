"""
Classification taxonomy for real estate property attributes.

Defines 7 classification heads with their categories and metadata.
"""

from typing import Dict, List, Literal

# Classification head types
HeadType = Literal["single-label", "multi-label"]

class ClassificationHead:
    """Defines a classification head with its categories and type."""
    
    def __init__(self, name: str, head_type: HeadType, classes: List[str], description: str = ""):
        self.name = name
        self.head_type = head_type
        self.classes = classes
        self.num_classes = len(classes)
        self.description = description
        self.class_to_idx = {cls: idx for idx, cls in enumerate(classes)}
        self.idx_to_class = {idx: cls for idx, cls in enumerate(classes)}
    
    def encode(self, labels: List[str]) -> List[int]:
        """Convert class names to indices."""
        return [self.class_to_idx[label] for label in labels if label in self.class_to_idx]
    
    def decode(self, indices: List[int]) -> List[str]:
        """Convert indices back to class names."""
        return [self.idx_to_class[idx] for idx in indices if idx in self.idx_to_class]


# Define all 7 classification heads
TAXONOMY = {
    "room_type": ClassificationHead(
        name="room_type",
        head_type="single-label",
        classes=[
            "kitchen", "bathroom", "bedroom", "living_room", "dining_room",
            "office", "garage", "laundry", "hallway", "closet", "basement",
            "attic", "patio", "pool", "exterior_front", "exterior_back", "aerial"
        ],
        description="Primary room or space type (17 classes)"
    ),
    
    "flooring": ClassificationHead(
        name="flooring",
        head_type="multi-label",
        classes=[
            "hardwood", "laminate", "tile_ceramic", "tile_porcelain",
            "natural_stone", "marble", "vinyl_plank", "carpet", "concrete",
            "brick", "terrazzo"
        ],
        description="Flooring materials visible in the image (11 classes)"
    ),
    
    "countertop": ClassificationHead(
        name="countertop",
        head_type="single-label",
        classes=[
            "granite", "marble", "quartz", "quartzite", "butcher_block",
            "laminate", "concrete", "soapstone", "stainless_steel", "tile"
        ],
        description="Countertop material (10 classes, primarily for kitchens/bathrooms)"
    ),
    
    "design_style": ClassificationHead(
        name="design_style",
        head_type="multi-label",
        classes=[
            "modern", "contemporary", "traditional", "farmhouse", "mid_century",
            "industrial", "coastal", "mediterranean", "craftsman", "minimalist",
            "bohemian", "art_deco", "transitional"
        ],
        description="Interior design style themes (13 classes)"
    ),
    
    "fixtures": ClassificationHead(
        name="fixtures",
        head_type="multi-label",
        classes=[
            "pendant_lights", "recessed_lighting", "chandelier", "sconces",
            "track_lighting", "stainless_appliances", "black_appliances",
            "white_appliances", "freestanding_tub", "walk_in_shower",
            "double_vanity", "crown_molding", "wainscoting", "shiplap",
            "exposed_beams"
        ],
        description="Architectural and fixture details (15 classes)"
    ),
    
    "materials": ClassificationHead(
        name="materials",
        head_type="multi-label",
        classes=[
            "brick", "stone", "stucco", "wood_siding", "vinyl_siding",
            "metal", "glass", "concrete", "cedar_shake"
        ],
        description="Structural and exterior materials (9 classes)"
    ),
    
    "condition": ClassificationHead(
        name="condition",
        head_type="single-label",
        classes=[
            "excellent", "good", "fair", "needs_renovation", "new_construction"
        ],
        description="Overall property condition (5 classes)"
    )
}


def get_all_heads() -> Dict[str, ClassificationHead]:
    """Return all classification heads."""
    return TAXONOMY


def get_head(name: str) -> ClassificationHead:
    """Get a specific classification head by name."""
    if name not in TAXONOMY:
        raise ValueError(f"Unknown head: {name}. Available: {list(TAXONOMY.keys())}")
    return TAXONOMY[name]


def get_total_classes() -> int:
    """Return total number of classes across all heads."""
    return sum(head.num_classes for head in TAXONOMY.values())


# Export for easy imports
__all__ = ["TAXONOMY", "ClassificationHead", "get_all_heads", "get_head", "get_total_classes"]
