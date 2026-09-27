def test_all_records_summary_includes_records_outside_current_month(client, users, account):
    headers = users[0]["headers"]
    for occurred_on, amount in [("2020-01-01", "0.10"), ("2021-12-31", "0.20")]:
        response = client.post("/transactions", headers=headers, json={
            "account_id": account["id"], "type": "expense", "category": "transport",
            "amount": amount, "occurred_on": occurred_on,
        })
        assert response.status_code == 201, response.text
    response = client.get("/analytics/summary?all_time=true", headers=headers)
    assert response.status_code == 200
    assert response.json()["expenses"] == "0.30"
    assert response.json()["transaction_count"] == 2
    assert client.get("/analytics/summary?all_time=true&start_date=2020-01-01", headers=headers).status_code == 422
