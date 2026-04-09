#!/usr/bin/env node

function extractPath(payload) {
    if (!payload || typeof payload !== "object") {
      return "";
    }
  
    const toolInput = payload.tool_input;
    if (toolInput && typeof toolInput === "object") {
      const candidates = [toolInput.file_path, toolInput.path];
      for (const candidate of candidates) {
        if (typeof candidate === "string" && candidate.trim().length > 0) {
          return candidate;
        }
      }
    }
  
    const topLevelCandidates = [payload.file_path, payload.path];
    for (const candidate of topLevelCandidates) {
      if (typeof candidate === "string" && candidate.trim().length > 0) {
        return candidate;
      }
    }
  
    return "";
  }
  
  function isSensitive(filePath) {
    const normalized = filePath.replace(/\\/g, "/");
    const basename = normalized.split("/").pop() || "";
    const lowered = basename.toLowerCase();
  
    if (lowered === ".env" || lowered.startsWith(".env.")) {
      return true;
    }
  
    if (/\.(pem|key|p12|pfx)$/i.test(lowered)) {
      return true;
    }
  
    const sensitiveNamePatterns = [
      /(^|[._-])secret([._-]|$)/,
      /(^|[._-])token([._-]|$)/,
      /(^|[._-])credential(s)?([._-]|$)/,
      /(^|[._-])private([._-]|$)/,
    ];
  
    return sensitiveNamePatterns.some((pattern) => pattern.test(lowered));
  }
  
  let buffered = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => {
    buffered += chunk;
  });
  process.stdin.on("end", () => {
    const raw = buffered.trim();
    if (!raw) {
      process.exit(0);
    }
  
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      process.exit(0);
    }
  
    const filePath = extractPath(payload);
    if (!filePath) {
      process.exit(0);
    }
  
    if (isSensitive(filePath)) {
      process.stderr.write(
        `Read/Grep blocked by policy: sensitive file path detected (${filePath}).\n`,
      );
      process.exit(2);
    }
  
    process.exit(0);
  });