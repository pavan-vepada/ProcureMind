# scripts · one-command helpers

| Script | What it does |
|---|---|
| `migrate.mjs` | Sets up or updates the database (`npm run db:migrate`) |
| `check-env.mjs` | Checks that `.env.local` has every setting, in the right shape, without printing any secret |
| `e2e.sh` | Builds the app and runs the full browser journey |
| `eval-all.sh` | Measures the live AI's reading accuracy on the sample replies |
| `screenshots.mjs` | Retakes the screenshots in `docs/images/` from the running app |
| `cleanup-test-users.mjs` | Deletes the throwaway accounts that tests create |
| `browser-libs.sh` | Installs the libraries the test browser needs, without administrator rights |
| `commit.sh`, `lint-summary.mjs` | Small development helpers |
