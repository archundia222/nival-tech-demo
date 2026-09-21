# Nival Puntos V1 — isolated QA

Target database: `nival-tech-puntos-test` (`wwuihvpudtsowjeaityr`).

Verified on 2026-09-21:
- Preview diagnostic resolves the test project ref, not production.
- Single-use scan token: first claim succeeds; replay is rejected.
- Cross-business claim is rejected without consuming the token; the correct business can still claim it.
- Expired and invented tokens are rejected.
- A second award on the same scan session is rejected.
- With exactly 10 points, the first redemption succeeds and a later redemption is rejected for insufficient balance.
- Staff sees zero direct customer/account/visit/ledger rows under RLS and therefore cannot read phone numbers.
- Ledger UPDATE is rejected by the immutability trigger.
- Point reversal creates a compensating ledger movement and derives the new balance from the ledger.
- Public rate limiter allows the configured quota and rejects the next request.
- Owner metrics RPC returns visits today, new customers, returning customers, and rewards redeemed.

Concurrency safety is implemented at the database boundary:
- scan claim uses one conditional UPDATE with `used_at is null`;
- award/redeem lock the scan-session row and loyalty-account row;
- each scan session stores one award timestamp and one redemption timestamp;
- balance is recomputed from the immutable ledger inside the locked transaction.

Production was not modified during QA.
