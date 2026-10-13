import Link from "next/link";

export default function GeneralPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          通用口语
        </h1>
        <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400">
          围绕日常生活、旅行、学习与工作等场景，与 AI 进行英语口语练习。
        </p>
        <p
          className="mt-8 rounded-2xl border border-neutral-200 bg-neutral-50 px-6 py-4 text-base text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
          role="status"
        >
          功能开发中，真实训练将在后续阶段开放。
        </p>
        <Link
          href="/"
          className="mt-10 inline-flex min-h-14 items-center justify-center rounded-2xl border border-neutral-300 bg-white px-6 py-4 text-base font-medium text-neutral-900 transition hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 dark:border-neutral-600 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
        >
          返回首页
        </Link>
      </div>
    </main>
  );
}
