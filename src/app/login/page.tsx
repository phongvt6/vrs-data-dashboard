import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";

// Với Cache Components, phần đọc dữ liệu động (searchParams, env auth) phải nằm
// trong <Suspense> để trang có shell tĩnh — nếu đặt connection() ở top-level mà
// không có Suspense cha (root layout trơn) sẽ báo "Uncached data outside Suspense".
export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <LoginInner searchParams={searchParams} />
    </Suspense>
  );
}

// searchParams là Promise trong Next 15+.
async function LoginInner({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  await connection();

  // Đang tắt đăng nhập thì không có lý do gì hiện form.
  if (process.env.AUTH_DISABLED === "1") redirect("/");

  const { next } = await searchParams;
  return <LoginForm next={next ?? "/"} />;
}
