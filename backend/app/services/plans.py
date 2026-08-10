from dataclasses import dataclass


@dataclass(frozen=True)
class Plan:
    code: str
    name: str
    price_usd: int
    max_sites: int
    max_posts_per_month: int
    max_flyers_per_month: int
    schedule_horizon_days: int
    paystack_plan_code: str


# `paystack_plan_code` values are the real codes Paystack assigned when these plans
# were created via `scripts/create_paystack_plans.py` (POST /plan) — Paystack always
# generates its own PLN_xxx code, it never accepts a custom one, so these must be
# copied from that script's output whenever a plan is recreated (e.g. new Paystack
# account, or amount changes since Paystack plans are immutable once created).
PLANS: dict[str, Plan] = {
    "starter": Plan(
        code="starter",
        name="Starter",
        price_usd=20,
        max_sites=1,
        max_posts_per_month=30,
        max_flyers_per_month=10,
        schedule_horizon_days=7,
        paystack_plan_code="PLN_l2fi7r3inv28c4f",
    ),
    "growth": Plan(
        code="growth",
        name="Growth",
        price_usd=49,
        max_sites=3,
        max_posts_per_month=120,
        max_flyers_per_month=40,
        schedule_horizon_days=14,
        paystack_plan_code="PLN_evyy306bynu6szd",
    ),
    "agency": Plan(
        code="agency",
        name="Agency",
        price_usd=149,
        max_sites=10,
        max_posts_per_month=400,
        max_flyers_per_month=150,
        schedule_horizon_days=30,
        paystack_plan_code="PLN_8lgzcohetotmaws",
    ),
}

TRIAL_PLAN_CODE = "growth"
TRIAL_DAYS = 5

# All 3 tiers currently get access to all 3 supported platforms (Twitter, LinkedIn,
# Reddit) — there's no per-tier accounts-linked cap in practice since that's the entire
# platform catalog. Revisit if the platform count grows.


def get_plan(code: str) -> Plan | None:
    return PLANS.get(code)
