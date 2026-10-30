import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/utils/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contentId = searchParams.get("contentId");

    if (!contentId) {
      return NextResponse.json({ success: false, error: "contentId is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("episodes")
      .select("*")
      .eq("content_id", contentId)
      .order("order_index", { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Internal server error" }, { status: 500 });
  }
}
