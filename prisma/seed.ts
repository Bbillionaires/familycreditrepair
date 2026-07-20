import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set.");
}

const adapter = new PrismaPg(process.env.DATABASE_URL);
const db = new PrismaClient({ adapter });

async function main() {
  await db.testimonial.createMany({
    data: [
      {
        name: "The Ramirez Family",
        quote: "This class helped us understand our credit report for the first time.",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        sortOrder: 0,
      },
      {
        name: "The Johnson Family",
        quote: "Free, practical, and easy to follow. We left with an action plan.",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        sortOrder: 1,
      },
    ],
  });

  await db.material.createMany({
    data: [
      {
        title: "Understanding Your Credit Report (Free Guide)",
        description: "A plain-language walkthrough of every section of your credit report.",
        priceCents: 0,
        fileUrl: "https://example.com/sample-free-guide.pdf",
        sortOrder: 0,
      },
      {
        title: "Family Budgeting Workbook",
        description: "A 20-page printable workbook to plan a household budget together.",
        priceCents: 1500,
        fileUrl: "https://example.com/sample-paid-workbook.pdf",
        sortOrder: 1,
      },
    ],
  });

  const inTwoWeeks = new Date();
  inTwoWeeks.setDate(inTwoWeeks.getDate() + 14);
  inTwoWeeks.setHours(18, 0, 0, 0);

  const inThreeWeeks = new Date(inTwoWeeks);
  inThreeWeeks.setDate(inThreeWeeks.getDate() + 7);

  await db.classSession.createMany({
    data: [
      {
        title: "Credit 101: Reading Your Report",
        description: "A beginner-friendly class on how credit reports and scores work.",
        startsAt: inTwoWeeks,
        durationMinutes: 60,
        location: "Online via Zoom",
        capacity: 30,
      },
      {
        title: "Budgeting for Families",
        description: "Build a simple household budget you'll actually stick to.",
        startsAt: inThreeWeeks,
        durationMinutes: 90,
        location: "Community Center, Room 2",
        capacity: 20,
      },
    ],
  });

  console.log("Seed data created.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
