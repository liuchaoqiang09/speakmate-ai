import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          SpeakMate AI
        </h1>
        <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400">
          你的 AI 英语口语陪练
        </p>

        <nav
          className="mt-12 flex flex-col gap-4 sm:flex-row sm:justify-center"
          aria-label="训练入口"
        >
          <Link
            href="/general"
            className="inline-flex min-h-14 flex-1 items-center justify-center rounded-2xl bg-neutral-900 px-6 py-4 text-base font-medium text-white transition hover:bg-neutral-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            通用口语
          </Link>
          <Link
            href="/exam"
            className="inline-flex min-h-14 flex-1 items-center justify-center rounded-2xl border border-neutral-300 bg-white px-6 py-4 text-base font-medium text-neutral-900 transition hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 dark:border-neutral-600 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
          >
            IELTS / TOEFL 口语训练
          </Link>
        </nav>
      </div>
    </main>
  );
}
