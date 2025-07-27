export function isCanvas(payload: unknown): payload is HTMLCanvasElement {
  return (
    !!payload &&
    typeof payload === "object" &&
    "getContext" in payload &&
    typeof payload.getContext === "function" &&
    "height" in payload &&
    "width" in payload
  );
}

export function isScript(payload: unknown): payload is HTMLScriptElement {
  return (
    !!payload &&
    typeof payload === "object" &&
    "type" in payload &&
    typeof payload.type === "string"
  );
}
