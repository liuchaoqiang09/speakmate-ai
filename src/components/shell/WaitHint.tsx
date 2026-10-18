import { AppHeader } from "@/src/components/shell/AppHeader";

export function WaitHint({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="min-h-screen ">
      <AppHeader />
      <main className="flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center px-6">
        <p className="text-sm font-medium text-[#1C1712]">{title}</p>
        <p className="mt-2 max-w-sm text-center text-sm leading-6 text-[#6E675E]">{detail}</p>
      </main>
    </div>
  );
}
