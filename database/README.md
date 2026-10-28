# database · how the data is stored

The files in [`migrations/`](migrations/) set up the database, in numbered order. Each one is applied once, by `npm run db:migrate`.

| File | What it sets up |
|---|---|
| `0001_core.sql` | The first tables |
| `0002_product.sql` | All product tables, file storage, and the **privacy rules**: every row belongs to one user, and the database itself refuses to show it to anyone else |
| `0003_seed_without_storage.sql` | A fix to an early sample-data routine (since retired) |
| `0004_merge_assumption.sql` | A safe way for several replies, read at the same moment, to update shared assumptions without overwriting each other |
| `0005_workspace.sql` | Many sourcing events per user, at different stages |
| `0006_workspace_ready.sql` | A marker that a new user's sample workspace is complete before it's shown |

The tables are described in [How it is built § Data model](../docs/03-how-it-is-built.md#5-data-model).
