from __future__ import annotations
import json
from typing import Any
from fastapi import WebSocket, WebSocketDisconnect


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket

    def disconnect(self, client_id: str):
        self.active_connections.pop(client_id, None)

    async def send_personal_message(self, message: dict, client_id: str):
        ws = self.active_connections.get(client_id)
        if ws:
            await ws.send_json(message)

    async def broadcast(self, message: dict, exclude: str | None = None):
        for client_id, ws in self.active_connections.items():
            if client_id == exclude:
                continue
            try:
                await ws.send_json(message)
            except Exception:
                pass

    async def handle_playback_event(self, client_id: str, event: dict) -> dict:
        event_type = event.get("type")
        payload = {"client_id": client_id, "type": event_type, "data": event.get("data", {})}
        await self.broadcast(payload, exclude=client_id)
        return {"status": "ok", "event": event_type}

    async def handle_recognition_progress(self, client_id: str, progress: dict):
        payload = {"type": "recognition_progress", "client_id": client_id, "data": progress}
        await self.send_personal_message(payload, client_id)


manager = ConnectionManager()


async def websocket_handler(websocket: WebSocket):
    client_id = websocket.query_params.get("client_id", "anon")
    await manager.connect(websocket, client_id)
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
                msg_type = data.get("type", "")
                if msg_type in ("play", "pause", "seek", "next", "prev"):
                    await manager.handle_playback_event(client_id, data)
                elif msg_type == "ping":
                    await manager.send_personal_message({"type": "pong"}, client_id)
            except json.JSONDecodeError:
                await manager.send_personal_message({"type": "error", "detail": "Invalid JSON"}, client_id)
    except WebSocketDisconnect:
        manager.disconnect(client_id)
    except Exception:
        manager.disconnect(client_id)
