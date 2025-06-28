# VideoPlatform

This project is a static web app for managing live graphics, video and music playback. All files live under `wwwroot` and can be served by any simple web host.

Media uploaded from the control panel is stored in Firebase Storage and metadata is saved in Firebase Realtime Database.

## Running locally

Use any static HTTP server, e.g. Python's `http.server`:

```bash
python3 -m http.server -d wwwroot 8080
```

Then open `http://localhost:8080/control.html?event_id=demo` in your browser.
