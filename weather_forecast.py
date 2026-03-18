#!/usr/bin/env python3
"""
Weather Forecast from Calendar Locations
-----------------------------------------
Reads your Google Calendar events for the next 7-14 days,
extracts location fields, geocodes them, and displays a
weather forecast using Open-Meteo (no API key needed).

Setup:
  1. Enable Google Calendar API in Google Cloud Console
  2. Download OAuth2 credentials as 'credentials.json'
  3. pip install -r requirements.txt
  4. python weather_forecast.py
"""

import sys
import datetime
import argparse
from zoneinfo import ZoneInfo

import requests
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from rich.console import Console
from rich.table import Table
from rich import box
from rich.text import Text
from pathlib import Path
import pickle

# ── Constants ────────────────────────────────────────────────────────────────

SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"]
TOKEN_FILE = Path("token.pickle")
CREDS_FILE = Path("credentials.json")

WMO_CODES = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Icy fog",
    51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
    61: "Light rain", 63: "Rain", 65: "Heavy rain",
    71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains",
    80: "Light showers", 81: "Showers", 82: "Heavy showers",
    85: "Snow showers", 86: "Heavy snow showers",
    95: "Thunderstorm", 96: "Thunderstorm w/ hail", 99: "Heavy thunderstorm",
}

WEATHER_ICONS = {
    0: "☀️", 1: "🌤", 2: "⛅", 3: "☁️",
    45: "🌫", 48: "🌫",
    51: "🌦", 53: "🌧", 55: "🌧",
    61: "🌧", 63: "🌧", 65: "🌧",
    71: "🌨", 73: "❄️", 75: "❄️", 77: "❄️",
    80: "🌦", 81: "🌧", 82: "⛈",
    85: "🌨", 86: "🌨",
    95: "⛈", 96: "⛈", 99: "⛈",
}

console = Console()


# ── Google Calendar ───────────────────────────────────────────────────────────

def get_calendar_service():
    """Authenticate and return a Google Calendar service object."""
    creds = None
    if TOKEN_FILE.exists():
        with open(TOKEN_FILE, "rb") as f:
            creds = pickle.load(f)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not CREDS_FILE.exists():
                console.print(
                    "[bold red]Error:[/] 'credentials.json' not found.\n"
                    "Download it from Google Cloud Console → APIs & Services → Credentials.",
                    highlight=False,
                )
                sys.exit(1)
            flow = InstalledAppFlow.from_client_secrets_file(str(CREDS_FILE), SCOPES)
            creds = flow.run_local_server(port=0)
        with open(TOKEN_FILE, "wb") as f:
            pickle.dump(creds, f)

    return build("calendar", "v3", credentials=creds)


def fetch_events(service, days: int) -> list[dict]:
    """Fetch calendar events for the next `days` days that have a location."""
    now = datetime.datetime.now(tz=datetime.timezone.utc)
    end = now + datetime.timedelta(days=days)

    result = (
        service.events()
        .list(
            calendarId="primary",
            timeMin=now.isoformat(),
            timeMax=end.isoformat(),
            singleEvents=True,
            orderBy="startTime",
        )
        .execute()
    )

    events = []
    for item in result.get("items", []):
        location = (item.get("location") or "").strip()
        if not location:
            continue
        start = item["start"].get("dateTime") or item["start"].get("date")
        end_dt = item["end"].get("dateTime") or item["end"].get("date")
        events.append(
            {
                "summary": item.get("summary", "(No title)"),
                "location": location,
                "start": start,
                "end": end_dt,
            }
        )
    return events


# ── Geocoding ─────────────────────────────────────────────────────────────────

_geocode_cache: dict[str, dict | None] = {}


def geocode(location: str) -> dict | None:
    """Return {'lat', 'lon', 'name'} for a location string, or None."""
    if location in _geocode_cache:
        return _geocode_cache[location]

    try:
        resp = requests.get(
            "https://geocoding-api.open-meteo.com/v1/search",
            params={"name": location, "count": 1, "language": "en", "format": "json"},
            timeout=10,
        )
        resp.raise_for_status()
        results = resp.json().get("results", [])
        if results:
            r = results[0]
            geo = {
                "lat": r["latitude"],
                "lon": r["longitude"],
                "name": f"{r['name']}, {r.get('country', '')}".strip(", "),
            }
            _geocode_cache[location] = geo
            return geo
    except requests.RequestException as e:
        console.print(f"[yellow]Geocoding failed for '{location}': {e}[/]")

    _geocode_cache[location] = None
    return None


# ── Weather ───────────────────────────────────────────────────────────────────

_weather_cache: dict[tuple, dict] = {}


def fetch_forecast(lat: float, lon: float) -> dict:
    """Fetch 14-day daily forecast from Open-Meteo for given coordinates."""
    key = (round(lat, 4), round(lon, 4))
    if key in _weather_cache:
        return _weather_cache[key]

    resp = requests.get(
        "https://api.open-meteo.com/v1/forecast",
        params={
            "latitude": lat,
            "longitude": lon,
            "daily": [
                "weathercode",
                "temperature_2m_max",
                "temperature_2m_min",
                "precipitation_sum",
                "windspeed_10m_max",
            ],
            "forecast_days": 14,
            "timezone": "auto",
        },
        timeout=10,
    )
    resp.raise_for_status()
    data = resp.json()
    daily = data["daily"]
    by_date = {}
    for i, date_str in enumerate(daily["time"]):
        by_date[date_str] = {
            "code": daily["weathercode"][i],
            "temp_max": daily["temperature_2m_max"][i],
            "temp_min": daily["temperature_2m_min"][i],
            "precip": daily["precipitation_sum"][i],
            "wind": daily["windspeed_10m_max"][i],
        }
    _weather_cache[key] = by_date
    return by_date


# ── Display ───────────────────────────────────────────────────────────────────

def parse_event_date(dt_str: str) -> datetime.date:
    """Parse ISO date or datetime string into a date object."""
    if "T" in dt_str:
        return datetime.datetime.fromisoformat(dt_str).date()
    return datetime.date.fromisoformat(dt_str)


def temp_color(temp: float) -> str:
    if temp >= 35:
        return "bold red"
    if temp >= 25:
        return "yellow"
    if temp >= 15:
        return "green"
    if temp >= 5:
        return "cyan"
    return "bold blue"


def build_table(events: list[dict]) -> Table:
    table = Table(
        title="[bold]Weather Forecast from Your Calendar[/]",
        box=box.ROUNDED,
        show_lines=True,
        expand=True,
    )
    table.add_column("Date", style="bold", min_width=12)
    table.add_column("Event", min_width=20)
    table.add_column("Location", min_width=18)
    table.add_column("Weather", min_width=20)
    table.add_column("Temp (°C)", justify="center", min_width=12)
    table.add_column("Rain (mm)", justify="center", min_width=10)
    table.add_column("Wind (km/h)", justify="center", min_width=11)

    seen_location_date: set[tuple] = set()
    skipped = []

    for event in events:
        geo = geocode(event["location"])
        if geo is None:
            skipped.append(event)
            continue

        event_date = parse_event_date(event["start"])
        date_str = event_date.isoformat()

        forecast = fetch_forecast(geo["lat"], geo["lon"])
        day = forecast.get(date_str)
        if day is None:
            skipped.append(event)
            continue

        code = day["code"]
        icon = WEATHER_ICONS.get(code, "")
        description = WMO_CODES.get(code, f"Code {code}")
        weather_text = f"{icon} {description}"

        temp_max = day["temp_max"]
        temp_min = day["temp_min"]
        temp_str = Text(f"{temp_max:.0f} / {temp_min:.0f}", style=temp_color(temp_max))

        cache_key = (date_str, geo["lat"], geo["lon"])
        already_shown = cache_key in seen_location_date
        seen_location_date.add(cache_key)

        table.add_row(
            event_date.strftime("%a %b %d"),
            event["summary"],
            geo["name"],
            "[dim]↑ same as above[/]" if already_shown else weather_text,
            temp_str if not already_shown else Text("—", style="dim"),
            "—" if already_shown else f"{day['precip']:.1f}",
            "—" if already_shown else f"{day['wind']:.0f}",
        )

    return table, skipped


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Show weather forecast based on your Google Calendar locations."
    )
    parser.add_argument(
        "--days",
        type=int,
        default=14,
        choices=range(7, 15),
        metavar="[7-14]",
        help="Number of days to look ahead (default: 14)",
    )
    args = parser.parse_args()

    console.rule("[bold blue]Calendar Weather Forecast[/]")

    with console.status("[bold green]Connecting to Google Calendar…"):
        service = get_calendar_service()

    with console.status(f"[bold green]Fetching events for next {args.days} days…"):
        events = fetch_events(service, args.days)

    if not events:
        console.print(
            f"[yellow]No events with a location found in the next {args.days} days.[/]"
        )
        return

    console.print(f"[dim]Found {len(events)} event(s) with locations.[/]\n")

    with console.status("[bold green]Fetching weather forecasts…"):
        table, skipped = build_table(events)

    console.print(table)

    if skipped:
        console.print(
            f"\n[yellow]⚠ {len(skipped)} event(s) skipped (location not geocoded or date out of forecast range):[/]"
        )
        for e in skipped:
            console.print(f"  • [dim]{e['summary']}[/] — {e['location']}")

    console.print(
        "\n[dim]Weather data © Open-Meteo.com (CC BY 4.0). "
        "Calendar data from your Google account.[/]"
    )


if __name__ == "__main__":
    main()
