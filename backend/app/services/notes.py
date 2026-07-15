from datetime import datetime, timezone
from uuid import uuid4

from app.schemas.diagnosis import ResearchNote
from app.services.storage import StateStore, create_state_store
from app.services.symbols import normalize_a_share_symbol


class ResearchNoteService:
    def __init__(self, state_store: StateStore | None = None) -> None:
        self._state_store = state_store or create_state_store()

    def list_notes(self, symbol: str | None = None, limit: int = 20) -> list[ResearchNote]:
        normalized = normalize_a_share_symbol(symbol) if symbol else None
        notes = [ResearchNote.model_validate(item) for item in self._state_store.load_notes()]
        if normalized:
            notes = [note for note in notes if normalize_a_share_symbol(note.symbol) == normalized]
        return sorted(notes, key=lambda item: item.created_at, reverse=True)[:limit]

    def add_note(self, symbol: str, body: str) -> ResearchNote:
        note = ResearchNote(
            id=uuid4().hex,
            symbol=normalize_a_share_symbol(symbol),
            body=body.strip(),
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        notes = self._state_store.load_notes()
        notes.insert(0, note.model_dump(mode="json"))
        self._state_store.save_notes(notes[:200])
        return note

    def delete_note(self, note_id: str) -> bool:
        notes = self._state_store.load_notes()
        next_notes = [item for item in notes if item.get("id") != note_id]
        self._state_store.save_notes(next_notes)
        return len(next_notes) != len(notes)
