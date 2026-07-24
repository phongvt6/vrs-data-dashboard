/* eslint-disable @typescript-eslint/no-explicit-any */
// Bọc một hàm dữ liệu (f) → GET handler: đọc query string thành object, trả JSON
// kèm header cache CDN (giống edgeHandler bản gốc: s-maxage=600, SWR=600).
export function makeGet(fn: (f: any) => Promise<any>, cache = 600) {
  return async function GET(request: Request) {
    try {
      const url = new URL(request.url);
      const data = await fn(Object.fromEntries(url.searchParams));
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": `public, s-maxage=${cache}, stale-while-revalidate=${cache}`,
        },
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: String(e?.message || e) }), {
        status: 500,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }
  };
}
