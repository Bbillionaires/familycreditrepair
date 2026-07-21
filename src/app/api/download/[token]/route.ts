import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { resolveMaterialFilePath } from "@/lib/storage";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/download/[token]">
) {
  const { token } = await ctx.params;

  const purchase = await db.purchase.findUnique({
    where: { downloadToken: token },
    include: { material: true },
  });

  if (!purchase || purchase.status !== "paid" || !purchase.material) {
    return NextResponse.json({ error: "Download not found or not available" }, { status: 404 });
  }

  const { material } = purchase;

  if (/^https?:\/\//i.test(material.fileUrl)) {
    return NextResponse.redirect(material.fileUrl);
  }

  try {
    const filePath = resolveMaterialFilePath(material.fileUrl);
    const fileBuffer = await readFile(filePath);
    const filename = `${material.title.replace(/[^a-z0-9-_ ]/gi, "").trim() || "download"}${path.extname(material.fileUrl)}`;

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "File is missing on the server" }, { status: 500 });
  }
}
