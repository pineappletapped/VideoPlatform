# VideoPlatform

This project includes a simple Node server that serves the files in `wwwroot` and provides a local upload endpoint at `/upload`.
Uploaded files are saved under `wwwroot/uploads/` so ensure this directory exists and is writable.

## Running locally

```bash
npm install
npm start
```

Then open `http://localhost:3000/control.html?event_id=demo` in your browser.
