from fastapi.testclient import TestClient

from app.main import create_app


client = TestClient(create_app())


def test_health_endpoint():
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_stock_diagnosis_endpoint():
    response = client.get("/api/v1/diagnosis/600519")

    assert response.status_code == 200
    payload = response.json()
    assert payload["symbol"] == "600519"
    assert "score" in payload
    assert len(payload["evidence"]) > 0


def test_stock_search_endpoint_returns_match_context():
    response = client.get("/api/v1/stocks/search?q=银行")

    assert response.status_code == 200
    payload = response.json()
    assert payload
    assert payload[0]["symbol"] == "000001"
    assert payload[0]["match_reason"] == "名称匹配"
    assert "in_watchlist" in payload[0]
    assert payload[0]["diagnosable"] is True
    assert payload[0]["quality_status"] in {"pass", "warn", "fail"}
    assert isinstance(payload[0]["quality_score"], int)


def test_diagnosis_change_endpoint_returns_baseline_or_change():
    response = client.get("/api/v1/diagnosis-change/600519?horizon=swing")

    assert response.status_code == 200
    payload = response.json()
    assert payload["symbol"] == "600519"
    assert payload["status"] in {"baseline", "improved", "weakened", "changed", "flat"}
    assert {"score_delta", "summary", "changes", "current_rating"}.issubset(payload.keys())
    assert payload["changes"]


def test_concept_heat_endpoint_returns_theme_scores():
    response = client.get("/api/v1/concepts/heat")

    assert response.status_code == 200
    payload = response.json()
    assert payload
    assert {"concept", "heat_score", "reason", "top_symbol"}.issubset(payload[0].keys())


def test_momentum_signals_endpoint_returns_activity_items():
    response = client.get("/api/v1/momentum/signals")

    assert response.status_code == 200
    payload = response.json()
    assert payload
    assert {"signal_score", "signal_level", "reason", "volume_ratio"}.issubset(payload[0].keys())


def test_hotspot_brief_endpoint_returns_market_focus():
    response = client.get("/api/v1/hotspots/brief")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] in {"hot", "warm", "neutral", "cool"}
    assert payload["summary"]
    assert "focus_symbols" in payload


def test_hotspot_candidates_endpoint_returns_ranked_candidates():
    response = client.get("/api/v1/hotspots/candidates?mode=capital")

    assert response.status_code == 200
    payload = response.json()
    assert payload
    assert {"concept", "heat_score", "signal_score", "reason", "next_action"}.issubset(payload[0].keys())


def test_hotspot_review_actions_endpoint_returns_candidate_followups():
    response = client.get("/api/v1/hotspots/review-actions?mode=momentum")

    assert response.status_code == 200
    payload = response.json()
    assert payload["mode"] == "momentum"
    assert payload["candidate_count"] >= len(payload["actions"])
    assert payload["high_count"] + payload["medium_count"] + payload["low_count"] == len(payload["actions"])
    assert payload["pending_count"] + payload["watching_count"] + payload["done_count"] == len(payload["actions"])
    assert {"symbol", "concept", "title", "trigger", "check_window", "status"}.issubset(payload["actions"][0].keys())


def test_hotspot_review_action_status_update_persists():
    plan = client.get("/api/v1/hotspots/review-actions?mode=balanced").json()
    action_id = plan["actions"][0]["id"]

    response = client.patch(f"/api/v1/hotspots/review-actions/{action_id}?mode=balanced", json={"status": "watching"})

    assert response.status_code == 200
    payload = response.json()
    updated = next(item for item in payload["actions"] if item["id"] == action_id)
    assert updated["status"] == "watching"

    client.patch(f"/api/v1/hotspots/review-actions/{action_id}?mode=balanced", json={"status": "pending"})


def test_thesis_endpoint_returns_structured_argument():
    response = client.get("/api/v1/thesis/600519?horizon=swing")

    assert response.status_code == 200
    payload = response.json()
    assert payload["symbol"] == "600519"
    assert payload["stance"] in {"bullish", "balanced", "defensive"}
    assert 0 <= payload["confidence"] <= 100
    assert payload["bull_case"]
    assert payload["bear_case"]
    assert payload["evidence"]
    assert payload["next_checks"]


def test_review_actions_endpoint_returns_prioritized_plan():
    response = client.get("/api/v1/review-actions/600519?horizon=swing")

    assert response.status_code == 200
    payload = response.json()
    assert payload["symbol"] == "600519"
    assert payload["horizon"] == "swing"
    assert payload["items"]
    assert payload["high_count"] + payload["medium_count"] + payload["low_count"] == len(payload["items"])
    assert {"title", "priority", "category", "detail", "source", "status"}.issubset(payload["items"][0].keys())


def test_review_actions_overview_endpoint_summarizes_watchlist():
    response = client.get("/api/v1/review-actions?horizon=swing&scope=watchlist")

    assert response.status_code == 200
    payload = response.json()
    assert payload["scope"] == "watchlist"
    assert payload["horizon"] == "swing"
    assert payload["stock_count"] >= 1
    assert payload["high_count"] + payload["medium_count"] + payload["low_count"] >= len(payload["summaries"])
    assert payload["summaries"]
    assert {"symbol", "name", "item_count", "top_priority", "top_action", "top_detail"}.issubset(
        payload["summaries"][0].keys()
    )


def test_review_action_status_update_persists_on_generated_plan():
    plan = client.get("/api/v1/review-actions/600519?horizon=swing").json()
    action_id = plan["items"][0]["id"]

    response = client.patch(f"/api/v1/review-actions/600519/{action_id}?horizon=swing", json={"status": "done"})

    assert response.status_code == 200
    payload = response.json()
    updated = next(item for item in payload["items"] if item["id"] == action_id)
    assert updated["status"] == "done"

    follow_up = client.get("/api/v1/review-actions/600519?horizon=swing").json()
    persisted = next(item for item in follow_up["items"] if item["id"] == action_id)
    assert persisted["status"] == "done"

    client.patch(f"/api/v1/review-actions/600519/{action_id}?horizon=swing", json={"status": "pending"})


def test_market_overview_endpoint():
    response = client.get("/api/v1/market/overview")

    assert response.status_code == 200
    payload = response.json()
    assert payload["index_name"] == "沪深 300"
    assert len(payload["hot_industries"]) == 3


def test_data_quality_endpoint_returns_field_checks():
    response = client.get("/api/v1/data-quality/600519")

    assert response.status_code == 200
    payload = response.json()
    assert payload["symbol"] == "600519"
    assert payload["status"] in {"pass", "warn", "fail"}
    assert 0 <= payload["score"] <= 100
    assert {"coverage_pct", "issue_count", "checks"}.issubset(payload.keys())
    assert {item["key"] for item in payload["checks"]} == {
        "market",
        "technical",
        "fundamental",
        "capital",
        "risk",
        "as_of",
    }


def test_data_quality_overview_endpoint_summarizes_scope():
    response = client.get("/api/v1/data-quality?scope=watchlist")

    assert response.status_code == 200
    payload = response.json()
    assert payload["scope"] == "watchlist"
    assert payload["stock_count"] >= 1
    assert payload["average_score"] >= 0
    assert payload["pass_count"] + payload["warn_count"] + payload["fail_count"] == payload["stock_count"]
    assert payload["lowest_report"]["symbol"]
    assert len(payload["reports"]) == payload["stock_count"]


def test_system_storage_endpoint_returns_persistence_status():
    response = client.get("/api/v1/system/storage")

    assert response.status_code == 200
    payload = response.json()
    assert payload["backend"] in {"json", "sqlite"}
    assert payload["status"] == "online"
    assert payload["path"]
    assert {"collections", "total_records", "migration_hint"}.issubset(payload.keys())
    assert {item["key"] for item in payload["collections"]} == {
        "watchlist",
        "reports",
        "notes",
        "price_alerts",
        "review_action_statuses",
    }


def test_system_readiness_endpoint_returns_operational_checks():
    response = client.get("/api/v1/system/readiness")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] in {"pass", "warn", "fail"}
    assert 0 <= payload["score"] <= 100
    assert payload["summary"]
    checks = {item["key"]: item for item in payload["checks"]}
    assert {"storage", "connector", "freshness", "refresh_jobs"}.issubset(checks.keys())
    assert checks["storage"]["status"] == "pass"
    assert checks["connector"]["next_action"]


def test_system_export_endpoint_returns_state_snapshot():
    response = client.get("/api/v1/system/export")

    assert response.status_code == 200
    payload = response.json()
    assert payload["backend"] in {"json", "sqlite"}
    assert payload["exported_at"]
    assert {"watchlist", "reports", "notes", "price_alerts"}.issubset(payload.keys())
    assert isinstance(payload["watchlist"], list)
    assert isinstance(payload["reports"], list)


def test_system_import_preview_summarizes_valid_records():
    response = client.post(
        "/api/v1/system/import/preview",
        json={
            "watchlist": ["600519", "unknown", "600519"],
            "reports": [{"id": "r1"}],
            "notes": [{"id": "n1"}],
            "price_alerts": [{"id": "p1"}],
        },
    )

    assert response.status_code == 200
    payload = response.json()
    counts = {item["key"]: item["count"] for item in payload["collections"]}
    assert payload["can_import"] is True
    assert counts["watchlist"] == 1
    assert counts["reports"] == 1
    assert payload["skipped_records"] == 2
    assert any("UNKNOWN" in warning for warning in payload["warnings"])


def test_system_import_replaces_state_and_refreshes_watchlist():
    original = client.get("/api/v1/system/export").json()
    import_payload = {
        "watchlist": ["000001", "bad-symbol"],
        "reports": [],
        "notes": [{"id": "note-1", "symbol": "000001", "body": "迁移测试", "created_at": "2026-07-10T00:00:00Z"}],
        "price_alerts": [],
    }

    try:
        response = client.post("/api/v1/system/import", json=import_payload)

        assert response.status_code == 200
        payload = response.json()
        counts = {item["key"]: item["count"] for item in payload["collections"]}
        assert payload["status"] == "imported"
        assert counts["watchlist"] == 1
        assert counts["notes"] == 1

        watchlist_response = client.get("/api/v1/watchlist")
        assert watchlist_response.status_code == 200
        assert [item["symbol"] for item in watchlist_response.json()] == ["000001"]
    finally:
        restore_payload = {
            "watchlist": original["watchlist"],
            "reports": original["reports"],
            "notes": original["notes"],
            "price_alerts": original["price_alerts"],
        }
        client.post("/api/v1/system/import", json=restore_payload)


def test_watchlist_add_and_remove():
    add_response = client.post("/api/v1/watchlist", json={"symbol": "000001"})

    assert add_response.status_code == 201
    assert any(item["symbol"] == "000001" for item in add_response.json())

    remove_response = client.delete("/api/v1/watchlist/000001")

    assert remove_response.status_code == 200
    assert all(item["symbol"] != "000001" for item in remove_response.json())


def test_watchlist_summary_endpoint():
    response = client.get("/api/v1/watchlist/summary")

    assert response.status_code == 200
    payload = response.json()
    assert payload["stock_count"] >= 1
    assert payload["average_score"] > 0
    assert "industry_exposure" in payload
    assert payload["top_stock"]["symbol"]
    assert payload["highest_risk_alert"]["severity"] in {"high", "medium", "low"}


def test_report_create_list_and_delete():
    create_response = client.post("/api/v1/reports", json={"symbol": "600519", "horizon": "swing"})

    assert create_response.status_code == 201
    report = create_response.json()
    assert report["diagnosis"]["symbol"] == "600519"

    list_response = client.get("/api/v1/reports")

    assert list_response.status_code == 200
    assert any(item["id"] == report["id"] for item in list_response.json())

    delete_response = client.delete(f"/api/v1/reports/{report['id']}")

    assert delete_response.status_code == 204


def test_note_create_list_and_delete():
    create_response = client.post("/api/v1/notes", json={"symbol": "600519", "body": "观察量能是否继续温和放大"})

    assert create_response.status_code == 201
    note = create_response.json()
    assert note["symbol"] == "600519"

    list_response = client.get("/api/v1/notes?symbol=600519")

    assert list_response.status_code == 200
    assert any(item["id"] == note["id"] for item in list_response.json())

    delete_response = client.delete(f"/api/v1/notes/{note['id']}")

    assert delete_response.status_code == 204


def test_price_alert_create_list_and_delete():
    create_response = client.post(
        "/api/v1/price-alerts",
        json={"symbol": "600519", "target_price": 1500, "direction": "above", "label": "突破观察"},
    )

    assert create_response.status_code == 201
    alert = create_response.json()
    assert alert["symbol"] == "600519"
    assert alert["status"] in {"triggered", "watching"}

    list_response = client.get("/api/v1/price-alerts?symbol=600519")

    assert list_response.status_code == 200
    assert any(item["id"] == alert["id"] for item in list_response.json())

    delete_response = client.delete(f"/api/v1/price-alerts/{alert['id']}")

    assert delete_response.status_code == 204


def test_rankings_endpoint_returns_sorted_candidates():
    response = client.get("/api/v1/rankings?sort=total&limit=3")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 3
    assert payload[0]["total_score"] >= payload[1]["total_score"]
    assert {"symbol", "rating", "primary_risk"}.issubset(payload[0].keys())


def test_industry_heat_endpoint_returns_grouped_heatmap():
    response = client.get("/api/v1/industries/heat")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) > 0
    assert {"industry", "average_score", "heat_level", "top_symbol"}.issubset(payload[0].keys())
    assert payload[0]["heat_level"] in {"hot", "warm", "neutral", "cool"}


def test_alerts_endpoint_returns_prioritized_items():
    response = client.get("/api/v1/alerts?scope=all")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) > 0
    assert {"symbol", "severity", "title", "evidence"}.issubset(payload[0].keys())
    assert payload[0]["severity"] in {"high", "medium", "low"}


def test_risk_exposure_endpoint_returns_grouped_risk_categories():
    response = client.get("/api/v1/risk/exposure?scope=all")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) > 0
    assert {"category", "event_count", "severity_score", "top_symbol"}.issubset(payload[0].keys())


def test_screener_endpoint_returns_preset_candidates():
    response = client.get("/api/v1/screeners/strong")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) > 0
    assert {"symbol", "preset", "reason", "risk_note"}.issubset(payload[0].keys())


def test_unknown_screener_preset_returns_404():
    response = client.get("/api/v1/screeners/unknown")

    assert response.status_code == 404


def test_timeline_endpoint_returns_tracking_events():
    response = client.get("/api/v1/timeline?scope=all&limit=8")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) > 0
    assert {"symbol", "due_date", "severity", "trigger", "status"}.issubset(payload[0].keys())
    assert payload[0]["severity"] in {"high", "medium", "low"}


def test_trend_endpoint_returns_series():
    response = client.get("/api/v1/trend/600519?days=30")

    assert response.status_code == 200
    payload = response.json()
    assert payload["symbol"] == "600519"
    assert len(payload["points"]) == 30
    assert {"date", "close", "ma5", "ma20", "volume_ratio"}.issubset(payload["points"][0].keys())


def test_peer_comparison_endpoint_returns_ranked_sample():
    response = client.get("/api/v1/peers/600519?limit=4")

    assert response.status_code == 200
    payload = response.json()
    assert payload["symbol"] == "600519"
    assert payload["sample_size"] >= 1
    assert any(item["relative_label"] == "当前标的" for item in payload["items"])
    assert payload["items"][0]["total_score"] >= payload["items"][-1]["total_score"]
    assert {"pe_ttm", "roe", "main_inflow_million"}.issubset(payload["items"][0].keys())


def test_unknown_symbol_returns_404():
    response = client.get("/api/v1/diagnosis/UNKNOWN")

    assert response.status_code == 404
