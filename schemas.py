from pydantic import BaseModel, Field
from typing import Optional, List

class PostCreate(BaseModel):
    content: str = Field(..., description="Post text content")
    imageUrl: Optional[str] = Field(None, description="Optional image URL")

class PostUpdate(BaseModel):
    content: Optional[str] = Field(None, description="Updated content")
    imageUrl: Optional[str] = Field(None, description="Updated image URL")

class PostPin(BaseModel):
    isPinned: bool = Field(..., description="Pin status for the post")

# Additional schemas can be added here for other endpoints (e.g., recognitions, concerns, admin actions)
