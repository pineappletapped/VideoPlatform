"""WebSocket \u2192 Blackmagic ATEM bridge (PyATEMMax) \u2013 direct-connect version

This stripped-down build assumes you already know the ATEM's IP address
and don't need subnet scanning.

Highlights
----------
* Hard-wired default IP **192.168.1.51** (override with `--ip`).
* Heartbeat log every few seconds (`alive/connected`).
* Minimal command parser: `CUT`, `PGM <n>`.
* Adjustable handshake timeout (`--timeout`, default 10 s).

Install
-------
```bash
python3 -m pip install PyATEMMax websockets
```

Run
---
```bash
python3 atem_websocket_bridge.py    # connects to 192.168.1.51
```

(If you ever re-address the switcher, just add `--ip NEW.IP.ADDR` and, if
necessary, tweak `--timeout`.)

Troubleshooting
---------------
* **Handshake fails** \u2192 verify **Enable Ethernet control** in *ATEM Setup*,
  and make sure UDP 9910/9911 aren\u2019t blocked by a firewall.
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import platform
import subprocess
import sys
from typing import Tuple

import PyATEMMax  # type: ignore
import websockets

BRIDGE_HOST = "localhost"
BRIDGE_PORT = 8765
HEARTBEAT_SECONDS = 5
DEFAULT_ATEM_IP = "192.168.1.51"


def ping_host(host: str, count: int = 1, timeout: int = 1) -> bool:
    param = "-n" if platform.system().lower() == "windows" else "-c"
    cmd = ["ping", param, str(count), "-W", str(timeout), host]
    try:
        return subprocess.call(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL) == 0
    except FileNotFoundError:
        return False


async def heartbeat(atem: PyATEMMax.ATEMMax):
    while True:
        print(f"[HB] alive={atem.switcherAlive} | connected={atem.connected}")
        await asyncio.sleep(HEARTBEAT_SECONDS)


async def atem_bridge(websocket, path):
    client: Tuple[str, int] = websocket.remote_address
    print(f"[WS] Client connected from {client}")
    try:
        async for message in websocket:
            print("[WS] Received:", message)
            cmd = message.strip().upper()
            if cmd == "CUT":
                atem.execCut()
                await websocket.send("ACK: CUT")
            elif cmd.startswith("PGM ") and cmd[4:].isdigit():
                atem.setProgramInput(int(cmd[4:]))
                await websocket.send(f"ACK: PROGRAM\u2192{cmd[4:]}")
            else:
                await websocket.send("NACK: UNKNOWN CMD")
    finally:
        print(f"[WS] Client {client} disconnected")


async def main():
    p = argparse.ArgumentParser(description="ATEM WebSocket bridge (direct-connect)")
    p.add_argument("--ip", default=DEFAULT_ATEM_IP, help=f"ATEM IP address (default {DEFAULT_ATEM_IP})")
    p.add_argument("--timeout", type=float, default=10.0, help="Handshake timeout seconds (default 10)")
    p.add_argument("--debug", action="store_true", help="Enable PyATEMMax debug log")
    args = p.parse_args()

    if args.debug:
        logging.basicConfig(level=logging.DEBUG)

    if not ping_host(args.ip):
        print(f"\u26A0\ufe0f  {args.ip} did not answer ping \u2014 continuing anyway \u2026")

    global atem
    atem = PyATEMMax.ATEMMax()
    print(f"Connecting to ATEM at {args.ip} \u2026")
    atem.connect(args.ip)
    if not atem.waitForConnection(infinite=False, timeout=args.timeout):
        raise RuntimeError("Handshake failed \u2014 is Ethernet control enabled and UDP 9910/9911 open?")
    print(f"\u2705 Connected to ATEM at {args.ip}")

    asyncio.create_task(heartbeat(atem))

    async with websockets.serve(atem_bridge, BRIDGE_HOST, BRIDGE_PORT):
        print(f"\U0001F310 Bridge listening on ws://{BRIDGE_HOST}:{BRIDGE_PORT}")
        await asyncio.Future()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nShutting down\u2026")
    except Exception as e:
        print("\u274C", e)
        sys.exit(1)
    finally:
        try:
            atem.disconnect()
        except Exception:
            pass
