import "server-only";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { nanoid } from "nanoid";

const STORAGE_ROOT = path.join(process.cwd(), "storage", "materials");

export async function saveMaterialFile(file: File): Promise<string> {
  await mkdir(STORAGE_ROOT, { recursive: true });

  const ext = path.extname(file.name);
  const key = `${nanoid()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await writeFile(path.join(STORAGE_ROOT, key), buffer);
  return key;
}

export function resolveMaterialFilePath(key: string) {
  return path.join(STORAGE_ROOT, key);
}

const LESSON_STORAGE_ROOT = path.join(process.cwd(), "storage", "lessons");

export async function saveLessonFile(file: File): Promise<string> {
  await mkdir(LESSON_STORAGE_ROOT, { recursive: true });

  const ext = path.extname(file.name);
  const key = `${nanoid()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await writeFile(path.join(LESSON_STORAGE_ROOT, key), buffer);
  return key;
}

export function resolveLessonFilePath(key: string) {
  return path.join(LESSON_STORAGE_ROOT, key);
}
