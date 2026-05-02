import { ENV } from './_core/env';
import fs from 'fs';
import path from 'path';

type StorageConfig = { baseUrl: string; apiKey: string };

function getForgeConfig(): StorageConfig | null {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;
  if (!baseUrl || !apiKey) return null;
  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

// ── Local storage ────────────────────────────────────────────────────────────

function getUploadsDir(): string {
  const dir = path.resolve(process.cwd(), "uploads");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getPublicBaseUrl(): string {
  if (!process.env.APP_URL) {
    console.warn("[Storage] AVISO: APP_URL não definida no .env — imagens salvas com URL localhost não funcionarão na VPS. Defina APP_URL=https://seudominio.com.br");
  }
  const port = process.env.PORT || "3000";
  const host = process.env.APP_URL || `http://localhost:${port}`;
  return host.replace(/\/+$/, "");
}

async function localPut(
  relKey: string,
  data: Buffer | Uint8Array | string
): Promise<{ key: string; url: string }> {
  const uploadsDir = getUploadsDir();
  // flatten the key into a safe filename (replace slashes with underscores)
  const fileName = relKey.replace(/\//g, "_");
  const filePath = path.join(uploadsDir, fileName);
  fs.writeFileSync(filePath, data as any);
  const url = `${getPublicBaseUrl()}/uploads/${fileName}`;
  return { key: relKey, url };
}

// ── Forge storage ────────────────────────────────────────────────────────────

function buildUploadUrl(baseUrl: string, relKey: string): URL {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}

async function buildDownloadUrl(
  baseUrl: string,
  relKey: string,
  apiKey: string
): Promise<string> {
  const downloadApiUrl = new URL(
    "v1/storage/downloadUrl",
    ensureTrailingSlash(baseUrl)
  );
  downloadApiUrl.searchParams.set("path", normalizeKey(relKey));
  const response = await fetch(downloadApiUrl, {
    method: "GET",
    headers: buildAuthHeaders(apiKey),
  });
  return (await response.json()).url;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function toFormData(
  data: Buffer | Uint8Array | string,
  contentType: string,
  fileName: string
): FormData {
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}

function buildAuthHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const forge = getForgeConfig();

  if (!forge) {
    console.log("[Storage] Forge credentials not set — using local disk storage.");
    return localPut(relKey, data);
  }

  const key = normalizeKey(relKey);
  const uploadUrl = buildUploadUrl(forge.baseUrl, key);
  const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: buildAuthHeaders(forge.apiKey),
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Storage upload failed (${response.status} ${response.statusText}): ${message}`
    );
  }
  const url = (await response.json()).url;
  return { key, url };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const forge = getForgeConfig();

  if (!forge) {
    const fileName = relKey.replace(/\//g, "_");
    const url = `${getPublicBaseUrl()}/uploads/${fileName}`;
    return { key: relKey, url };
  }

  const key = normalizeKey(relKey);
  return {
    key,
    url: await buildDownloadUrl(forge.baseUrl, key, forge.apiKey),
  };
}
