from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.api.deps import get_current_user, get_db
from app.models.character import Character
from app.models.user import User
from app.schemas.character import CharacterCreate, CharacterUpdate, CharacterResponse

router = APIRouter()


@router.get("", response_model=List[CharacterResponse])
async def list_characters(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Character).filter(Character.user_id == current_user.id).all()


@router.post("", response_model=CharacterResponse, status_code=status.HTTP_201_CREATED)
async def create_character(
    data: CharacterCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    character = Character(
        user_id=current_user.id,
        name=data.name,
        persona=data.persona,
        tone=data.tone,
        catchphrase=data.catchphrase,
        custom_prompt=data.custom_prompt,
        avatar_url=data.avatar_url,
    )
    db.add(character)
    db.commit()
    db.refresh(character)
    return character


@router.get("/{character_id}", response_model=CharacterResponse)
async def get_character(
    character_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    character = (
        db.query(Character)
        .filter(Character.id == character_id, Character.user_id == current_user.id)
        .first()
    )
    if not character:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Character not found")
    return character


@router.put("/{character_id}", response_model=CharacterResponse)
async def update_character(
    character_id: str,
    data: CharacterUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    character = (
        db.query(Character)
        .filter(Character.id == character_id, Character.user_id == current_user.id)
        .first()
    )
    if not character:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Character not found")

    if data.name is not None:
        character.name = data.name
    if data.persona is not None:
        character.persona = data.persona
    if data.tone is not None:
        character.tone = data.tone
    if data.catchphrase is not None:
        character.catchphrase = data.catchphrase
    if data.custom_prompt is not None:
        character.custom_prompt = data.custom_prompt
    if data.avatar_url is not None:
        character.avatar_url = data.avatar_url

    db.commit()
    db.refresh(character)
    return character


@router.delete("/{character_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_character(
    character_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    character = (
        db.query(Character)
        .filter(Character.id == character_id, Character.user_id == current_user.id)
        .first()
    )
    if not character:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Character not found")

    db.delete(character)
    db.commit()
