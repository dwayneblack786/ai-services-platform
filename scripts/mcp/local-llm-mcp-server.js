#!/usr/bin/env node

const { stdin, stdout, stderr } = process;

const BASE_URL = process.env.LOCAL_LLM_BASE_URL || "http://127.0.0.1:61682";
const DEFAULT_MODEL = process.env.LOCAL_LLM_MODEL || "GLM-4.7-Flash-UD-Q4_K_XL";
const DEFAULT_TEMPERATURE = Number.parseFloat(process.env.LOCAL_LLM_TEMPERATURE || "0.2");
const DEFAULT_MAX_TOKENS = Number.parseInt(process.env.LOCAL_LLM_MAX_TOKENS || "800", 10);
const DEFAULT__TOP_P = Number.parseFloat(process.env.LOCAL_LLM_TOP_P || "1.0");
const DEFAULT_TIMEOUT_MS = Number.parseInt(process.env.LOCAL_LLM_TIMEOUT_MS || "90000", 10);

let inputBuffer = Buffer.alloc(0);

function logError(message, err) {
  const details = err && err.stack ? err.stack : String(err || "");
  stderr.write(`[local-llm-mcp] ${message}${details ? `\n${details}` : ""}\n`);
}

function writeMessage(message) {
  const json = JSON.stringify(message);
  const body = Buffer.from(json, "utf8");
  const header = Buffer.from(`Content-Length: ${body.length}\r\n\r\n`, "utf8");
  stdout.write(Buffer.concat([header, body]));
}

function sendResponse(id, result) {
  writeMessage({ jsonrpc: "2.0", id, result });
}

function sendError(id, code, message, data) {
  writeMessage({
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
      ...(data === undefined ? {} : { data })
    }
  });
}

function parseContentLength(headerText) {
  const lines = headerText.split(/\r?\n/);
  for (const line of lines) {
    const idx = line.indexOf(":");
    if (idx < 0) {
      continue;
    }
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (key === "content-length") {
      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : -1;
    }
  }
  return -1;
}

function handleInitialize(id, params) {
  const requestedProtocolVersion = params && typeof params.protocolVersion === "string"
    ? params.protocolVersion
    : "2024-11-05";

  sendResponse(id, {
    protocolVersion: requestedProtocolVersion,
    capabilities: {
      tools: {}
    },
    serverInfo: {
      name: "local-llm-mcp",
      version: "0.1.0"
    }
  });
}

function handleToolsList(id) {
  sendResponse(id, {
    tools: [
      {
        name: "local_llm_chat",
        description: "Send a chat request to a local OpenAI-compatible endpoint and return assistant text.",
        inputSchema: {
          type: "object",
          properties: {
            systemPrompt: { type: "string", description: "System instruction for the model." },
            userPrompt: { type: "string", description: "Primary user message." },
            temperature: { type: "number", description: "Sampling temperature." },
            maxTokens: { type: "integer", description: "Maximum output tokens." }
          },
          required: ["userPrompt"],
          additionalProperties: false
        }
      }
    ]
  });
}

async function callLocalLlm(args) {
  const systemPrompt = typeof args.systemPrompt === "string" ? args.systemPrompt : "You are a helpful assistant.";
  const userPrompt = typeof args.userPrompt === "string" ? args.userPrompt : "";
  const model = DEFAULT_MODEL;

  if (!userPrompt.trim()) {
    throw new Error("userPrompt is required and must be non-empty.");
  }

  const temperature = Number.isFinite(args.temperature) ? args.temperature : DEFAULT_TEMPERATURE;
  const topP = Number.isFinite(args.topP) ? args.topP : DEFAULT__TOP_P;
  const maxTokens = Number.isInteger(args.maxTokens) ? args.maxTokens : DEFAULT_MAX_TOKENS;

  const requestBody = {
    model,
    temperature,
    top_p: topP,
    max_tokens: maxTokens,
    stream: false,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${BASE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Local LLM request failed (${response.status}): ${text}`);
  }

  const payload = await response.json();
  const assistantText = payload && payload.choices && payload.choices[0] && payload.choices[0].message
    ? String(payload.choices[0].message.content || "")
    : "";

  return {
    text: assistantText,
    model: payload && payload.model ? payload.model : model,
    usage: payload && payload.usage ? payload.usage : null,
    endpoint: `${BASE_URL}/v1/chat/completions`
  };
}

async function handleToolsCall(id, params) {
  const name = params && params.name;
  const args = (params && (params.arguments || params.input)) || {};

  if (name !== "local_llm_chat") {
    sendError(id, -32601, `Unknown tool: ${name}`);
    return;
  }

  try {
    const result = await callLocalLlm(args);
    sendResponse(id, {
      content: [
        {
          type: "text",
          text: result.text
        }
      ],
      structuredContent: result
    });
  } catch (err) {
    sendError(id, -32000, "Tool execution failed", {
      message: err instanceof Error ? err.message : String(err)
    });
  }
}

async function handleRequest(message) {
  const { id, method, params } = message;

  if (method === "initialize") {
    handleInitialize(id, params);
    return;
  }

  if (method === "notifications/initialized") {
    return;
  }

  if (method === "tools/list") {
    handleToolsList(id);
    return;
  }

  if (method === "tools/call") {
    await handleToolsCall(id, params);
    return;
  }

  if (method === "ping") {
    sendResponse(id, {});
    return;
  }

  if (id !== undefined) {
    sendError(id, -32601, `Method not found: ${method}`);
  }
}

function consumeInput() {
  while (true) {
    const crlfHeaderEnd = inputBuffer.indexOf("\r\n\r\n");
    const lfHeaderEnd = inputBuffer.indexOf("\n\n");
    let headerEnd = -1;
    let separatorLength = 0;

    if (crlfHeaderEnd !== -1 && (lfHeaderEnd === -1 || crlfHeaderEnd < lfHeaderEnd)) {
      headerEnd = crlfHeaderEnd;
      separatorLength = 4;
    } else if (lfHeaderEnd !== -1) {
      headerEnd = lfHeaderEnd;
      separatorLength = 2;
    }

    if (headerEnd === -1) {
      return;
    }

    const headerText = inputBuffer.slice(0, headerEnd).toString("utf8");
    const length = parseContentLength(headerText);
    if (length < 0) {
      logError("Missing or invalid Content-Length header.");
      inputBuffer = Buffer.alloc(0);
      return;
    }

    const messageStart = headerEnd + separatorLength;
    const messageEnd = messageStart + length;
    if (inputBuffer.length < messageEnd) {
      return;
    }

    const messageBody = inputBuffer.slice(messageStart, messageEnd).toString("utf8");
    inputBuffer = inputBuffer.slice(messageEnd);

    let parsed;
    try {
      parsed = JSON.parse(messageBody);
    } catch (err) {
      logError("Failed to parse JSON body.", err);
      continue;
    }

    Promise.resolve(handleRequest(parsed)).catch((err) => {
      logError("Unhandled request error.", err);
      if (parsed && parsed.id !== undefined) {
        sendError(parsed.id, -32000, "Unhandled server error");
      }
    });
  }
}

stdin.on("data", (chunk) => {
  inputBuffer = Buffer.concat([inputBuffer, chunk]);
  consumeInput();
});

stdin.on("error", (err) => {
  logError("stdin error", err);
});

process.on("uncaughtException", (err) => {
  logError("uncaughtException", err);
});

process.on("unhandledRejection", (err) => {
  logError("unhandledRejection", err);
});
