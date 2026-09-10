import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse

from app import store

router = APIRouter()


@router.websocket("/stream")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            payload = {
                "status": "ACTIVE",
                "drift_detected": any(d.severity.value in {"Critical", "High"} and d.status.value == "Open" for d in store.discrepancies),
                "events": [e.model_dump(mode="json") for e in store.events[:20]],
                "stats": store.stats().model_dump(),
            }
            await websocket.send_json(payload)
            await asyncio.sleep(3)
    except WebSocketDisconnect:
        return


@router.get("/feed")
async def event_feed():
    async def generate():
        while True:
            import json

            body = json.dumps(
                {
                    "events": [e.model_dump(mode="json") for e in store.events[:25]],
                    "stats": store.stats().model_dump(),
                },
                default=str,
            )
            yield f"data: {body}\n\n"
            await asyncio.sleep(3)

    return StreamingResponse(generate(), media_type="text/event-stream")
