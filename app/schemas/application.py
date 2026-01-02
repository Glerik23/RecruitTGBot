from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Any
from app.utils.security import sanitize_html

class ApplicationCreate(BaseModel):
    """Schema for application creation"""
    full_name: str = Field(..., min_length=2, max_length=255, description="Full Name")
    email: str = Field(..., pattern=r'^[^@]+@[^@]+\.[^@]+$', description="Email Address")
    phone: Optional[str] = Field(None, max_length=50, description="Phone Number")
    position: str = Field(..., min_length=2, max_length=255, description="Position")
    experience_years: Optional[float] = Field(None, ge=0, le=70, description="Experience in years")
    skills: Optional[List[dict]] = Field(default_factory=list, description="Detailed skills with experience [{'name': 'Python', 'exp': 3}]")
    english_level: Optional[str] = Field(None, max_length=50, description="English Level")
    education: Optional[str] = Field(None, max_length=1000, description="Education")
    previous_work: Optional[str] = Field(None, max_length=2000, description="Previous work experience")
    portfolio_url: Optional[str] = Field(None, max_length=500, description="Portfolio URL")
    additional_info: Optional[str] = Field(None, max_length=2000, description="Additional Information")
    
    @field_validator('full_name', 'position', 'education', 'previous_work', 'additional_info')
    @classmethod
    def sanitize_strings(cls, v):
        """Sanitize HTML from string fields"""
        if v and isinstance(v, str):
            return sanitize_html(v)
        return v

        return v

    @field_validator('skills')
    @classmethod
    def validate_skills_details(cls, v):
        """Validate experience in skills list"""
        if v:
            for skill in v:
                exp = skill.get('exp', 0)
                if exp < 0 or exp > 70:
                    raise ValueError(f"Experience for {skill.get('name', 'skill')} must be between 0 and 70 years")
        return v
