// Next 16: middleware đổi tên thành "proxy". Chặn mọi route sau đăng nhập —
// chưa có phiên hợp lệ thì đẩy về /login. Đọc kỹ:
//   node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

export const config = {
  // Bỏ qua tài nguyên tĩnh + trang/endpoint đăng nhập (nếu không sẽ chặn cả CSS/JS/ảnh).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|login|api/login|.*\\.(?:svg|png|jpg|jpeg|gif|ico|webp|txt)$).*)",
  ],
};

export async function proxy(req: NextRequest) {
  // Cửa hậu để tắt đăng nhập khi đang phát triển. Bật bằng AUTH_DISABLED=1 trong
  // .env.local — TUYỆT ĐỐI không khai báo biến này trên Vercel/production, vì khi
  // đó toàn bộ app (kể cả /admin) mở cho bất kỳ ai có link.
  if (process.env.AUTH_DISABLED === "1") return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const ok = await verifySession(process.env.AUTH_SECRET ?? "", token);
  if (ok) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  // Nhớ trang muốn tới để đăng nhập xong quay lại.
  const back = req.nextUrl.pathname + req.nextUrl.search;
  if (back && back !== "/") url.searchParams.set("next", back);
  return NextResponse.redirect(url);
}
