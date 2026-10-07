import { Suspense } from "react";
import { redirect } from "next/navigation";
import LoginForm from "@/components/admin/LoginForm";
import { isAuthenticated } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await isAuthenticated()) redirect("/admin");
  const settings = getSettings();
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-[380px]">
        <p className="text-[15px] font-medium uppercase tracking-[0.28em]">
          {settings.brand_name}
        </p>
        <p className="label mt-1">Панель генерации страниц</p>
        <div className="mt-8 border border-line p-6">
          <Suspense fallback={<p className="label">Загрузка…</p>}>
            <LoginForm />
          </Suspense>
        </div>
        <p className="label mt-4">
          Пароль задаётся переменной ADMIN_PASSWORD в файле .env.local
        </p>
      </div>
    </div>
  );
}
