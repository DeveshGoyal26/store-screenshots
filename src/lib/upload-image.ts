import { setImage } from "./image-cache";

export type UploadCategory = "screenshot" | "frame";

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
    reader.readAsDataURL(file);
  });
}

export async function uploadDataUrl(
  dataUrl: string,
  category: UploadCategory = "screenshot",
): Promise<string | null> {
  try {
    const resp = await fetch("/api/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dataUrl, category }),
    });
    const json = (await resp.json()) as { ok?: boolean; path?: string };
    if (!json.ok || !json.path) return null;
    setImage(json.path, dataUrl);
    return json.path;
  } catch {
    return null;
  }
}
