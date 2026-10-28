# tests · how quality is proved

| Folder | What it checks | Run with |
|---|---|---|
| [`unit/`](unit/) | The calculation engine reproduces a hand-checked answer key: every conversion, every scenario (300 of 300 prices) | `npm test` |
| [`integration/`](integration/) | A new user's workspace is complete, and one account can never read or change another's data | `npm test` (needs the database) |
| [`eval/`](eval/) | The live AI reads the sample replies correctly (129 of 129 prices). Costs a little, so it runs only on demand | `bash scripts/eval-all.sh` |
| [`e2e/`](e2e/) | A first-time user's full journey in a real browser: sign up, compare, check evidence, chase a supplier, ask a what-if, recommend the award, read new replies, send an RFQ, draft new events | `bash scripts/e2e.sh` |

Test accounts are created with throwaway addresses and deleted afterwards.
