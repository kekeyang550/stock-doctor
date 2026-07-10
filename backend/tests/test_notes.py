from app.services.notes import ResearchNoteService
from app.services.storage import JsonStateStore


def test_note_service_saves_filters_and_deletes_notes(tmp_path):
    service = ResearchNoteService(JsonStateStore(tmp_path / "state.json"))

    first = service.add_note("600519", "观察量能是否继续温和放大")
    service.add_note("300750", "复核资金流向")

    notes = service.list_notes(symbol="600519")

    assert len(notes) == 1
    assert notes[0].id == first.id
    assert notes[0].body == "观察量能是否继续温和放大"
    assert service.delete_note(first.id) is True
    assert service.list_notes(symbol="600519") == []
