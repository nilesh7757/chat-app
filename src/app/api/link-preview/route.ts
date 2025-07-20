import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 });
    }

    // Dynamically import open-graph-scraper to avoid issues with Next.js edge runtime
    const ogs = (await import("open-graph-scraper")).default;
    const { result } = await ogs({ url });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      title: result.ogTitle || result.title,
      description: result.ogDescription || result.description,
      image: result.ogImage?.url || result.ogImage?.[0]?.url,
      url: result.ogUrl || url,
      siteName: result.ogSiteName,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch link preview" }, { status: 500 });
  }
} 