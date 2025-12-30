from pydantic import BaseModel, Field, field_validator
from typing import Optional, List

class ApplicationCreate(BaseModel):
    """Schema for application creation"""
    full_name: str = Field(..., min_length=2, max_length=255, description="Full Name")
    email: str = Field(..., pattern=r'^[^@]+@[^@]+\.[^@]+$', description="Email Address")
    phone: Optional[str] = Field(None, max_length=50, description="Phone Number")
    position: str = Field(..., min_length=2, max_length=255, description="Position")
    experience_years: Optional[int] = Field(None, ge=0, le=50, description="Experience in years")
    skills: Optional[List[str]] = Field(default_factory=list, description="List of skills")
    education: Optional[str] = Field(None, max_length=1000, description="Education")
    previous_work: Optional[str] = Field(None, max_length=2000, description="Previous work experience")
    portfolio_url: Optional[str] = Field(None, max_length=500, description="Portfolio URL")
    additional_info: Optional[str] = Field(None, max_length=2000, description="Additional Information")
    
    @field_validator('skills')
    @classmethod
    def validate_skills(cls, v):
        """Validate skills list length"""
        if v and len(v) > 50:
            raise ValueError('Too many skills (max 50)')
        return v
