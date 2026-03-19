# CLAUDE.md

## Project Overview

This project is a command-line tool that reads Google Calendar events for the next 7–14 days, extracts location fields, geocodes them, and displays weather forecasts using the Open-Meteo API (no API key required).

## Setup

1. Enable the **Google Calendar API** in [Google Cloud Console](https://console.cloud.google.com/) under APIs & Services.
2. Download OAuth2 credentials and save as `credentials.json` in the project root.
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the script:
   ```bash
   python weather_forecast.py
   ```

On first run, a browser window will open for Google OAuth authentication. A `token.pickle` file is saved locally to cache credentials for future runs.

## Usage

```bash
python weather_forecast.py [--days N]
```

- `--days` — Number of days to look ahead (7–14, default: 14)

## Key Files

| File | Purpose |
|------|---------|
| `weather_forecast.py` | Main script |
| `requirements.txt` | Python dependencies |
| `credentials.json` | Google OAuth2 credentials (not committed) |
| `token.pickle` | Cached OAuth token (auto-generated, not committed) |

## External APIs

- **Google Calendar API** — fetches events from the user's primary calendar (read-only scope)
- **Open-Meteo Geocoding API** — converts location strings to lat/lon coordinates
- **Open-Meteo Forecast API** — retrieves 14-day daily weather forecasts (free, no key needed)

## Architecture

- `get_calendar_service()` — handles Google OAuth2 flow and returns an authenticated service client
- `fetch_events(service, days)` — retrieves upcoming events that have a location field
- `geocode(location)` — resolves a location string to coordinates (cached per session)
- `fetch_forecast(lat, lon)` — fetches daily forecast data keyed by date (cached per session)
- `build_table(events)` — assembles a Rich table with weather data per event

## Dependencies

- `google-api-python-client` — Google Calendar API client
- `google-auth-oauthlib` — OAuth2 authentication flow
- `requests` — HTTP calls to Open-Meteo APIs
- `rich` — terminal table rendering and styled output

## Notes

- Only calendar events with a non-empty `location` field are processed.
- Events whose location cannot be geocoded, or whose date falls outside the 14-day forecast window, are listed as skipped at the end of output.
- Weather data is attributed to Open-Meteo (CC BY 4.0).

---

## Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately – don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes – don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests – then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
