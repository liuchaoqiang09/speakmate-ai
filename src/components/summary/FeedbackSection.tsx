"use client";

import { DualCaption } from "@/src/components/summary/DualCaption";
import type { BilingualFeedback, BilingualNote, BilingualPhrase } from "@/src/lib/summary/bilingual";

const CATEGORY_LABEL: Record<string, string> = {
  grammar: "语法",
  vocabulary: "词汇",
  collocation: "搭配",
  fluency: "流畅度",
};

function categoryLabel(category: string): string {
  return CATEGORY_LABEL[category] || category;
}

export function KeyErrorsSection({ items }: { items: BilingualNote[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="ink-card mt-6 p-5">
      <h2 className="text-lg font-semibold">
        Key errors <span className="text-sm font-normal text-[#8A847C]">重点</span>
      </h2>
      <ul className="mt-4 space-y-4">
        {items.map((item) => (
          <li key={`${item.en}-${item.zh}`} className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0E7C66]" aria-hidden="true" />
            <DualCaption english={item.en} chinese={item.zh} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function StrengthsSection({ items }: { items: BilingualNote[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="ink-card mt-6 p-5">
      <h2 className="text-lg font-semibold">
        Strengths <span className="text-sm font-normal text-[#8A847C]">优点</span>
      </h2>
      <ul className="mt-4 space-y-4">
        {items.map((item) => (
          <li key={`${item.en}-${item.zh}`} className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0E7C66]" aria-hidden="true" />
            <DualCaption english={item.en} chinese={item.zh} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function NextFocusSection({ items }: { items: BilingualNote[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="ink-card mt-6 p-5">
      <h2 className="text-lg font-semibold">
        Next focus <span className="text-sm font-normal text-[#8A847C]">下次练什么</span>
      </h2>
      <ul className="mt-4 space-y-4">
        {items.map((item) => (
          <li key={`${item.en}-${item.zh}`} className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0E7C66]" aria-hidden="true" />
            <DualCaption english={item.en} chinese={item.zh} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function LanguageFeedbackSection({ items }: { items: BilingualFeedback[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="ink-card mt-6 p-5">
      <h2 className="text-lg font-semibold">
        Feedback <span className="text-sm font-normal text-[#8A847C]">语言反馈</span>
      </h2>
      <p className="mt-2 text-sm text-[#8A847C]">中英对照，方便看清原句错在哪里</p>
      <div className="mt-4 flex flex-col gap-4">
        {items.map((item) => (
          <article key={item.id} className="border-l-2 border-[#0E7C66] bg-[#F7F7F5] p-4">
            <span className="text-xs font-medium tracking-wide text-[#6F6F6F]">
              {categoryLabel(item.category)}
            </span>
            <div className="mt-3">
              <p className="text-xs text-[#8A8A8A]">你说的</p>
              <DualCaption
                english={item.originalText}
                chinese={item.originalZh}
                strike
              />
            </div>
            <div className="mt-3">
              <p className="text-xs text-[#8A8A8A]">正确说法</p>
              <DualCaption
                english={item.correctedText}
                chinese={item.correctedZh}
                englishClassName="text-sm font-medium text-[#111111]"
              />
            </div>
            {item.naturalText ? (
              <div className="mt-3">
                <p className="text-xs text-[#8A8A8A]">更自然</p>
                <DualCaption
                  english={item.naturalText}
                  chinese={item.naturalZh}
                  englishClassName="text-sm font-medium text-[#111111]"
                />
              </div>
            ) : null}
            {item.advancedText ? (
              <div className="mt-3">
                <p className="text-xs text-[#8A8A8A]">更高一档</p>
                <DualCaption
                  english={item.advancedText}
                  chinese={item.advancedZh}
                  englishClassName="text-sm font-medium text-[#111111]"
                />
              </div>
            ) : null}
            <div className="mt-3">
              <p className="text-xs text-[#8A8A8A]">错在哪里</p>
              <DualCaption english={item.explanation} chinese={item.explanationZh} />
            </div>
            <a
              href={`/review/drill?prompt=${encodeURIComponent(item.originalText)}&expected=${encodeURIComponent(item.naturalText || item.correctedText)}`}
              className="mt-3 inline-flex text-xs font-medium text-[#0E7C66] underline-offset-2 hover:underline"
            >
              再练这句
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}

export function PhrasesSection({ items }: { items: BilingualPhrase[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold">
        Phrases <span className="text-sm font-normal text-[#8A847C]">值得记住</span>
      </h2>
      <ul className="mt-4 flex flex-col gap-3">
        {items.map((item) => (
          <li key={`${item.phrase}-${item.example}`} className="ink-card border-l-4 border-l-[#0E7C66] p-4">
            <p className="font-semibold">{item.phrase}</p>
            <p className="mt-1 text-sm text-[#6F6F6F]">{item.meaning_zh}</p>
            <div className="mt-2">
              <p className="text-xs text-[#8A8A8A]">例句</p>
              <DualCaption english={item.example} chinese={item.example_zh} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
