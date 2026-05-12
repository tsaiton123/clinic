from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user, require_admin
from app.core.database import get_db
from app.models.admin_note import AdminNote
from app.models.user import User
from app.schemas import AdminNoteCreate, AdminNoteItem, AdminNoteListResponse, AdminNoteUpdate, CreatedResponse, MessageResponse
from app.services import ensure_client_access


router = APIRouter(tags=["admin-notes"])


@router.get("/clients/{client_id}/admin-notes", response_model=AdminNoteListResponse)
def list_admin_notes(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AdminNoteListResponse:
    ensure_client_access(db, current_user, client_id)
    notes = db.scalars(
        select(AdminNote)
        .options(selectinload(AdminNote.author))
        .where(AdminNote.client_id == client_id)
        .order_by(AdminNote.created_at.desc(), AdminNote.id.desc())
    ).all()
    return AdminNoteListResponse(data=[AdminNoteItem.model_validate(item) for item in notes])


@router.post("/clients/{client_id}/admin-notes", response_model=CreatedResponse, status_code=201)
def create_admin_note(
    client_id: int,
    payload: AdminNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> CreatedResponse:
    ensure_client_access(db, current_user, client_id)
    note = AdminNote(client_id=client_id, author_id=current_user.id, content=payload.content.strip())
    db.add(note)
    db.commit()
    db.refresh(note)
    return CreatedResponse(id=note.id, message="Admin note created successfully")


@router.put("/admin-notes/{note_id}", response_model=MessageResponse)
def update_admin_note(
    note_id: int,
    payload: AdminNoteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> MessageResponse:
    note = db.get(AdminNote, note_id)
    if note is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin note not found")
    ensure_client_access(db, current_user, note.client_id)
    note.content = payload.content.strip()
    db.commit()
    return MessageResponse(message="Admin note updated successfully")
