from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.database import get_db
from app.services.user_service import UserService
from app.web.dependencies import require_role, get_bot_username
from app.models.user import User, UserRole

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
        "director": UserRole.DIRECTOR,
        "interviewer": UserRole.INTERVIEWER
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


@router.get("/staff")
async def get_staff_list(
    user = Depends(require_role(UserRole.DIRECTOR)),
    db: Session = Depends(get_db)
):
    """Get list of all staff members (non-candidates)"""
    roles = [UserRole.HR, UserRole.INTERVIEWER, UserRole.ANALYST, UserRole.DIRECTOR]
    staff = []
    
    for role in roles:
        users = UserService.get_users_by_role(db, role)
        for u in users:
            staff.append({
                "id": u.id,
                "telegram_id": u.telegram_id,
                "username": u.username,
                "full_name": f"{u.first_name or ''} {u.last_name or ''}".strip() or u.username or str(u.telegram_id),
                "role": u.role.value,
                "created_at": u.created_at.isoformat() if u.created_at else None
            })
            
    return {"staff": staff}


@router.post("/staff/{user_id}/reset")
async def reset_user_role(
    user_id: int,
    user = Depends(require_role(UserRole.DIRECTOR)),
    db: Session = Depends(get_db)
):
    """Reset user role to candidate"""
    # Prevent director from resetting themselves or others (for safety, but mostly to follow the "reset staff" rule)
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if target_user.role == UserRole.DIRECTOR:
        raise HTTPException(status_code=403, detail="Cannot reset Director role via this endpoint")
        
    success = UserService.assign_role(db, user_id, UserRole.CANDIDATE)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to reset role")
        
    return {"success": True}

@router.post("/staff/assign")
async def assign_role_by_id(
    data: Dict[str, Any],
    user = Depends(require_role(UserRole.DIRECTOR)),
    db: Session = Depends(get_db)
):
    """Assign role by telegram ID or internal ID"""
    target_id_str = str(data.get("id", ""))
    role_name = data.get("role")
    
    if not target_id_str or not role_name:
        raise HTTPException(status_code=400, detail="ID and Role are required")
        
    role_map = {
        "hr": UserRole.HR,
        "analyst": UserRole.ANALYST,
        "director": UserRole.DIRECTOR,
        "interviewer": UserRole.INTERVIEWER,
        "candidate": UserRole.CANDIDATE
    }
    
    role = role_map.get(role_name)
    if not role:
        raise HTTPException(status_code=400, detail="Invalid role")
        
    # Try to find user by telegram_id first, then by internal id
    target_user = None
    if target_id_str.isdigit():
        target_user = db.query(User).filter(User.telegram_id == int(target_id_str)).first()
        
    if not target_user:
        target_user = db.query(User).filter(User.id == (int(target_id_str) if target_id_str.isdigit() else -1)).first()
        
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    success = UserService.assign_role(db, target_user.id, role)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to assign role")
        
    return {"success": True}
