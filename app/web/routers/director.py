from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.database import get_db
from app.services.user_service import UserService
from app.web.dependencies import require_role, get_bot_username
from app.models.user import UserRole

router = APIRouter(prefix="/director", tags=["director"])

@router.get("/roles")
async def get_roles_management(
    request: Request,
    user = Depends(require_role(UserRole.DIRECTOR)),
    db: Session = Depends(get_db)
):
    """Get role management data"""
    invites = UserService.get_all_invites(db, user.id)
    bot_username = get_bot_username(request)
    
    invites_data = []
    for invite in invites:
        invite_url = f"https://t.me/{bot_username}?start={invite.token}"
        invites_data.append({
            "id": invite.id,
            "role": invite.role.value,
            "token": invite.token,
            "invite_url": invite_url,
            "is_used": invite.is_used,
            "used_at": invite.used_at.isoformat() if invite.used_at else None,
            "created_at": invite.created_at.isoformat() if invite.created_at else None,
            "expires_at": invite.expires_at.isoformat() if invite.expires_at else None
        })
    
    return {
        "invites": invites_data
    }


@router.post("/invite/create")
async def create_invite(
    request: Request,
    data: Dict[str, Any],
    user = Depends(require_role(UserRole.DIRECTOR)),
    db: Session = Depends(get_db)
):
    """Create a new invite link"""
    role_name = data.get("role")
    role_map = {
        "hr": UserRole.HR,
        "analyst": UserRole.ANALYST,
        "director": UserRole.DIRECTOR
    }
    
    role = role_map.get(role_name)
    if not role:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    invite = UserService.create_invite_link(db, role, user.id)
    bot_username = get_bot_username(request)
    invite_url = f"https://t.me/{bot_username}?start={invite.token}"
    
    return {
        "success": True,
        "invite": {
            "id": invite.id,
            "role": invite.role.value,
            "token": invite.token,
            "invite_url": invite_url,
            "expires_at": invite.expires_at.isoformat() if invite.expires_at else None
        }
    }


@router.delete("/invite/{invite_id}")
async def delete_invite(
    invite_id: int,
    user = Depends(require_role(UserRole.DIRECTOR)),
    db: Session = Depends(get_db)
):
    """Delete an invite link"""
    
    success = UserService.delete_invite(db, invite_id, user.id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Failed to delete invite")
    
    return {"success": True}
