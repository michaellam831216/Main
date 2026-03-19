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
