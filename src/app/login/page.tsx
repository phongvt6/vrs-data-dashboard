import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";

// searchParams là Promise trong Next 15+.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // Đang tắt đăng nhập thì không có lý do gì hiện form.
  if (process.env.AUTH_DISABLED === "1") redirect("/");

  const { next } = await searchParams;
  return <LoginForm next={next ?? "/"} />;
}
