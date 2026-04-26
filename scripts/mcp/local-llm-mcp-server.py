#!/usr/bin/env python3
import json
import os
import sys
import traceback
from urllib import request, error

BASE_URL = os.getenv("LOCAL_LLM_BASE_URL", "http://127.0.0.1:61682")
DEFAULT_MODEL = os.getenv("LOCAL_LLM_MODEL", "GLM-4.7-Flash-UD-Q4_K_XL")
DEFAULT_TEMPERATURE = float(os.getenv("LOCAL_LLM_TEMPERATURE", "0.2"))
DEFAULT_TOP_P = float(os.getenv("LOCAL_LLM_TOP_P", "1.0"))
DEFAULT_MAX_TOKENS = int(os.getenv("LOCAL_LLM_MAX_TOKENS", "-1"))
DEFAULT_TIMEOUT_MS = int(os.getenv("LOCAL_LLM_TIMEOUT_MS", "90000"))
DEBUG = os.getenv("LOCAL_LLM_DEBUG", "1") == "1"


def log(msg: str) -> None:
    if DEBUG:
        sys.stderr.write(f"{ (DEFAULT_MODEL).lower()} {msg}\n")
        sys.stderr.flush()


def write_message(message: dict) -> None:
    body = json.dumps(message, ensure_ascii=True).encode("utf-8")
    header = f"Content-Length: {len(body)}\r\n\r\n".encode("utf-8")
    sys.stdout.buffer.write(header + body)
    sys.stdout.buffer.flush()


def send_response(msg_id, result: dict) -> None:
    write_message({"jsonrpc": "2.0", "id": msg_id, "result": result})


def send_error(msg_id, code: int, message: str, data=None) -> None:
    payload = {"code": code, "message": message}
    if data is not None:
        payload["data"] = data
    write_message({"jsonrpc": "2.0", "id": msg_id, "error": payload})


def handle_initialize(msg_id, params: dict) -> None:
    protocol = params.get("protocolVersion") if isinstance(params, dict) else None
    protocol = protocol if isinstance(protocol, str) else "2024-11-05"
    log(f"initialize received, protocol={protocol}")
    send_response(
        msg_id,
        {
            "protocolVersion": protocol,
            "capabilities": {"tools": {}},
            "serverInfo": {"name": "local-llm-mcp", "version": "0.2.0"},
        },
    )


def handle_tools_list(msg_id) -> None:
    send_response(
        msg_id,
        {
            "tools": [
                {
                    "name": "local_llm_chat",
                    "description": "Send a chat request to a local OpenAI-compatible endpoint and return assistant text.",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "systemPrompt": {"type": "string", "description": "System instruction for the model."},
                            "userPrompt": {"type": "string", "description": "Primary user message."},
                            "temperature": {"type": "number", "description": "Sampling temperature."},
                            "maxTokens": {"type": "integer", "description": "Maximum output tokens."},
                        },
                        "required": ["userPrompt"],
                        "additionalProperties": False,
                    },
                }
            ]
        },
    )


def call_local_llm(args: dict) -> dict:
    system_prompt = args.get("systemPrompt", "You are a helpful assistant.")
    user_prompt = args.get("userPrompt", "")
    if not isinstance(user_prompt, str) or not user_prompt.strip():
        raise ValueError("userPrompt is required and must be non-empty.")

    temperature = args.get("temperature", DEFAULT_TEMPERATURE)
    max_tokens = args.get("maxTokens", DEFAULT_MAX_TOKENS)
    top_p = args.get("topP", DEFAULT_TOP_P)

    print(f"Calling local LLM with userPrompt='{user_prompt}', temperature={temperature}, maxTokens={max_tokens}, topP={top_p}", file=sys.stderr)
   
    body = {
        "model": DEFAULT_MODEL,
        "temperature": temperature,
        "top_p": top_p,
        "max_tokens": max_tokens,
        "stream": False,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    }

    endpoint = f"{BASE_URL}/v1/chat/completions"
    req = request.Request(
        endpoint,
        data=json.dumps(body).encode("utf-8"),
        headers={"content-type": "application/json"},
        method="POST",
    )

    timeout_sec = max(DEFAULT_TIMEOUT_MS / 1000.0, 1.0)
    try:
        with request.urlopen(req, timeout=timeout_sec) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except error.HTTPError as ex:
        detail = ex.read().decode("utf-8", errors="replace") if ex.fp else str(ex)
        raise RuntimeError(f"Local LLM request failed ({ex.code}): {detail}") from ex

    assistant_text = ""
    if isinstance(payload, dict):
        choices = payload.get("choices")
        if isinstance(choices, list) and choices:
            msg = choices[0].get("message", {}) if isinstance(choices[0], dict) else {}
            assistant_text = str(msg.get("content", ""))

    return {
        "text": assistant_text,
        "model": payload.get("model", DEFAULT_MODEL) if isinstance(payload, dict) else DEFAULT_MODEL,
        "usage": payload.get("usage") if isinstance(payload, dict) else None,
        "endpoint": endpoint,
    }


def handle_tools_call(msg_id, params: dict) -> None:
    name = params.get("name") if isinstance(params, dict) else None
    args = {}
    if isinstance(params, dict):
        args = params.get("arguments") or params.get("input") or {}

    if name != "local_llm_chat":
        send_error(msg_id, -32601, f"Unknown tool: {name}")
        return

    try:
        result = call_local_llm(args)
        send_response(
            msg_id,
            {
                "content": [{"type": "text", "text": result["text"]}],
                "structuredContent": result,
            },
        )
    except Exception as ex:
        log(f"tools/call failed: {ex}")
        send_error(msg_id, -32000, "Tool execution failed", {"message": str(ex)})


def handle_request(message: dict) -> None:
    msg_id = message.get("id")
    method = message.get("method")
    params = message.get("params")

    log(f"method={method}")

    if method == "initialize":
        handle_initialize(msg_id, params if isinstance(params, dict) else {})
        return

    if method == "notifications/initialized":
        return

    if method == "tools/list":
        handle_tools_list(msg_id)
        return

    if method == "tools/call":
        handle_tools_call(msg_id, params if isinstance(params, dict) else {})
        return

    if method == "ping":
        send_response(msg_id, {})
        return

    if msg_id is not None:
        send_error(msg_id, -32601, f"Method not found: {method}")


def parse_content_length(header_bytes: bytes) -> int:
    try:
        header_text = header_bytes.decode("utf-8", errors="replace")
    except Exception:
        return -1

    for line in header_text.splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        if key.strip().lower() == "content-length":
            try:
                length = int(value.strip())
                return length if length >= 0 else -1
            except ValueError:
                return -1
    return -1


def read_loop() -> None:
    buffer = bytearray()
    stdin = sys.stdin.buffer
    print("Entering read loop, waiting for messages...", file=sys.stderr)
    while True:
        chunk = stdin.read1(65536)
        if not chunk:
            log("stdin closed")
            return

        buffer.extend(chunk)
        print(f"Read {len(chunk)} bytes from stdin, buffer size is now {len(buffer)} bytes", file=sys.stderr)
        while True:
            crlf = buffer.find(b"\r\n\r\n")
            lf = buffer.find(b"\n\n")
            print(f"Looking for message boundary: CRLF at {crlf}, LF at {lf}", file=sys.stderr)
            if crlf == -1 and lf == -1:
                print("No complete message boundary found yet, waiting for more data...", file=sys.stderr)
                break

            if crlf != -1 and (lf == -1 or crlf < lf):
                header_end = crlf
                sep_len = 4
            else:
                header_end = lf
                sep_len = 2
            print(f"Message boundary found at index {header_end} with separator length {sep_len}", file=sys.stderr)
            content_length = parse_content_length(buffer[:header_end])
            if content_length < 0:
                log("invalid content-length header")
                buffer.clear()
                break

            msg_start = header_end + sep_len
            msg_end = msg_start + content_length
            if len(buffer) < msg_end:
                break
            print(f"Complete message found: content length={content_length}, msg start={msg_start}, msg end={msg_end}", file=sys.stderr)
            body = bytes(buffer[msg_start:msg_end])
            del buffer[:msg_end]

            try:
                print(f"Parsing message body: {body.decode('utf-8', errors='replace')}", file=sys.stderr)
                message = json.loads(body.decode("utf-8"))
            except Exception as ex:
                log(f"invalid json body: {ex}")
                continue

            try:
                print(f"Received message: {message}", file=sys.stderr)
                handle_request(message)
            except Exception as ex:
                log(f"unhandled request error: {ex}")
                log(traceback.format_exc())
                msg_id = message.get("id") if isinstance(message, dict) else None
                if msg_id is not None:
                    send_error(msg_id, -32000, "Unhandled server error")


if __name__ == "__main__":
    log("server start")
    read_loop()
