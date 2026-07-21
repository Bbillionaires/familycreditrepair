import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { resolveLessonFilePath } from "@/lib/storage";

export async function GET(
  request: Request,
  ctx: RouteContext<"/api/courses/[id]/lessons/[lessonId]/file">
) {
  const { lessonId } = await ctx.params;
  const token = new URL(request.url).searchParams.get("token");

  const lesson = await db.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson || !lesson.fileUrl || !token) {
    return NextResponse.json({ error: "File not found or not available" }, { status: 404 });
  }

  const purchase = await db.purchase.findUnique({ where: { downloadToken: token } });
  if (!purchase || purchase.courseId !== lesson.courseId || purchase.status !== "paid") {
    return NextResponse.json({ error: "File not found or not available" }, { status: 404 });
  }

  if (/^https?:\/\//i.test(lesson.fileUrl)) {
    return NextResponse.redirect(lesson.fileUrl);
  }

  try {
    const filePath = resolveLessonFilePath(lesson.fileUrl);
    const fileBuffer = await readFile(filePath);
    const filename = `${lesson.title.replace(/[^a-z0-9-_ ]/gi, "").trim() || "download"}${path.extname(lesson.fileUrl)}`;

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
