"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { saveMaterialFile } from "@/lib/storage";

const MaterialSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().min(1, "Description is required"),
  priceDollars: z.coerce.number().min(0, "Price can't be negative"),
  externalFileUrl: z.string().trim().url().optional().or(z.literal("")),
  published: z.boolean(),
});

export type MaterialFormState = { error?: string } | undefined;

async function saveImageIfProvided(image: File | null): Promise<string | undefined> {
  if (!image || image.size === 0) return undefined;

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "materials");
  await mkdir(uploadsDir, { recursive: true });

  const ext = path.extname(image.name);
  const filename = `${nanoid()}${ext}`;
  const buffer = Buffer.from(await image.arrayBuffer());
  await writeFile(path.join(uploadsDir, filename), buffer);

  return `/uploads/materials/${filename}`;
}

async function parseAndValidate(formData: FormData) {
  const parsed = MaterialSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    priceDollars: formData.get("priceDollars") || 0,
    externalFileUrl: formData.get("externalFileUrl") || "",
    published: formData.get("published") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" } as const;
  }

  const file = formData.get("file");
  const image = formData.get("image");

  return {
    data: parsed.data,
    file: file instanceof File && file.size > 0 ? file : null,
    image: image instanceof File && image.size > 0 ? image : null,
  } as const;
}

export async function createMaterial(
  _prevState: MaterialFormState,
  formData: FormData
): Promise<MaterialFormState> {
  await requireAdmin();

  const result = await parseAndValidate(formData);
  if ("error" in result) return { error: result.error };

  const { data, file, image } = result;

  let fileUrl: string;
  if (file) {
    fileUrl = await saveMaterialFile(file);
  } else if (data.externalFileUrl) {
    fileUrl = data.externalFileUrl;
  } else {
    return { error: "Upload a file or provide a link to the material" };
  }

  const imageUrl = await saveImageIfProvided(image);

  await db.material.create({
    data: {
      title: data.title,
      description: data.description,
      priceCents: Math.round(data.priceDollars * 100),
      fileUrl,
      imageUrl,
      published: data.published,
    },
  });

  revalidatePath("/materials");
  revalidatePath("/");
  redirect("/admin/materials");
}

export async function updateMaterial(
  id: string,
  _prevState: MaterialFormState,
  formData: FormData
): Promise<MaterialFormState> {
  await requireAdmin();

  const result = await parseAndValidate(formData);
  if ("error" in result) return { error: result.error };

  const { data, file, image } = result;
  const existing = await db.material.findUnique({ where: { id } });
  if (!existing) return { error: "Material not found" };

  let fileUrl = existing.fileUrl;
  if (file) {
    fileUrl = await saveMaterialFile(file);
  } else if (data.externalFileUrl) {
    fileUrl = data.externalFileUrl;
  }

  const imageUrl = (await saveImageIfProvided(image)) ?? existing.imageUrl;

  await db.material.update({
    where: { id },
    data: {
      title: data.title,
      description: data.description,
      priceCents: Math.round(data.priceDollars * 100),
      fileUrl,
      imageUrl,
      published: data.published,
    },
  });

  revalidatePath("/materials");
  revalidatePath("/");
  redirect("/admin/materials");
}

export async function deleteMaterial(id: string) {
  await requireAdmin();
  await db.material.delete({ where: { id } });
  revalidatePath("/materials");
  revalidatePath("/");
  revalidatePath("/admin/materials");
}
