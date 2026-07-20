import { searchSymbol } from "../../../lib/data";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    if (!query || query.length < 2) return Response.json({ ok:true, results:[] });
    const results = await searchSymbol(query);
    return Response.json({ ok:true, results });
  } catch(err) {
    return Response.json({ ok:false, error:err.message }, { status:500 });
  }
}
