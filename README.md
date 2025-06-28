# VideoPlatform

This project is a web app for managing live graphics, video and music playback. Everything lives under `wwwroot` so it can run from nearly any host that can execute PHP.

Uploaded media is stored on the server under `wwwroot/uploads` while metadata lives in Firebase Realtime Database.

## Running locally

Use PHP's built‑in server:

```bash
php -S localhost:8080 -t wwwroot
```

Make sure the `wwwroot/uploads` directory exists and is writable (e.g. `chmod 777 wwwroot/uploads`). Then open `http://localhost:8080/index.html`.

## Login & Events

The landing page is an event dashboard. Sign up or log in and create events. Each
event row offers links to the main control panel, a simplified **Graphics** panel,
the listener and the overlay page. Login sessions last for eight hours and are
required for all control panels, but the overlay page itself stays public so it
can be embedded in OBS without timing out.

If Firebase registration isn't available you can log in using the built‑in admin
account `ryanadmin` with password `password`.

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

### Graphics-only panel

Use the **Graphics** link from the dashboard if you only need to operate the
overlay. This stripped down panel removes OBS and ATEM options and embeds side‑by‑side Preview and Program monitors so you can rehearse a graphic before taking it live.

### Preview workflow

Each graphic item has **Preview** and **Live** buttons. Previewing sends the
graphic only to the left monitor, allowing you to check positioning. Taking it
live removes it from preview and displays it in the right monitor as well as on
`overlay.html`. The **Cut** button above the preview monitor promotes anything in
preview to live in one click.

### Admin panel & billing

Logging in as `ryanadmin` reveals an **Admin** button on the dashboard. This
opens a simple admin panel showing all users and their billing tier. Plans are:

- **single** – Single Event £3.75/month
- **three** – 3 Events £6/month
- **eight** – 8 Events £15/month

Regular users can manage their default branding from **Brand Settings** in the
account menu. Uploaded logos are stored under `uploads/user_<id>/branding/`.
