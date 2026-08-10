"""One-off: create the Paystack plans that `app.services.plans.PLANS` expects to exist.

Paystack's POST /plan endpoint does NOT accept a custom plan_code — it always
generates one (e.g. "PLN_xxxxxxxxxxxx") and returns it in the response. The
`paystack_plan_code` values hardcoded in plans.py ("starter-monthly", etc.) were
never real Paystack codes, so `transaction/initialize` has been 404ing with
"Plan not found" regardless of test/live mode.

This script creates one Paystack plan per entry in PLANS (skipping any whose
name already exists, so it's safe to re-run) and prints the real plan_code
Paystack assigns. Copy those into plans.py's `paystack_plan_code` fields.

Usage (from inside the backend container):
    python -m scripts.create_paystack_plans
"""

import httpx

from app.database import SessionLocal
from app.services import paystack_config
from app.services.plans import PLANS

PAYSTACK_BASE_URL = "https://api.paystack.co"


def main() -> None:
    db = SessionLocal()
    try:
        keys = paystack_config.get_keys(db)
        if not keys:
            print("Paystack isn't configured (no DB row and no env keys). Set it in Admin > Integrations first.")
            return
        secret_key, _public_key = keys
        headers = {"Authorization": f"Bearer {secret_key}", "Content-Type": "application/json"}

        with httpx.Client(timeout=15) as client:
            existing = client.get(f"{PAYSTACK_BASE_URL}/plan", headers=headers, params={"perPage": 100})
            existing.raise_for_status()
            existing_by_name = {p["name"]: p["plan_code"] for p in existing.json()["data"]}

            for plan in PLANS.values():
                if plan.name in existing_by_name:
                    print(f"{plan.code}: already exists as {existing_by_name[plan.name]!r} — reusing")
                    continue

                resp = client.post(
                    f"{PAYSTACK_BASE_URL}/plan",
                    headers=headers,
                    json={
                        "name": plan.name,
                        "amount": plan.price_usd * 100,
                        "interval": "monthly",
                        "currency": "USD",
                    },
                )
                if resp.status_code >= 400:
                    print(f"{plan.code}: FAILED ({resp.status_code}): {resp.text}")
                    continue

                data = resp.json()["data"]
                print(f"{plan.code}: created {data['plan_code']!r} (was {plan.paystack_plan_code!r} in plans.py)")
    finally:
        db.close()


if __name__ == "__main__":
    main()
