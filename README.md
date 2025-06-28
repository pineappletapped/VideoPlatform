# VideoPlatform

This project is a web app for managing live graphics, video and music playback. Everything lives under `wwwroot` so it can run from nearly any host that can execute PHP.

Uploaded media is stored on the server under `wwwroot/uploads` while metadata lives in Firebase Realtime Database.

## Running locally

Use PHP's built‑in server:

```bash
php -S localhost:8080 -t wwwroot
```

Make sure the `wwwroot/uploads` directory exists and is writable (e.g. `chmod 777 wwwroot/uploads`). Then open `http://localhost:8080/control.html?event_id=demo` in your browser.

### Optional ATEM bridge

If you need to control a Blackmagic ATEM switcher, generate and run the Python
script shown under **Add ATEM** in `listener.html`. It simply bridges WebSocket
messages from the app to the ATEM using [PyATEMMax]. Run it with Python 3:

```bash
python3 wwwroot/atem_websocket_bridge.py
```

### VT preloading

When you load a VT clip in the control panel, the overlay automatically
preloads the video. Once the clip can play all the way through, the overlay
sets `status/<event>/vtReady` to `true`. The input sources bar highlights the
VT button with a green outline when the clip is buffered and ready to play.
