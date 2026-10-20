// components/packing/PackingList.tsx

import React, { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/router";

interface PackingCategory {
  title: string;
  items: string[];
}

interface PackingListProps {
  headerTitle: string;
  categories: PackingCategory[];
  onBack?: () => void;
}

export default function PackingList({ headerTitle, categories, onBack }: Readonly<PackingListProps>) {
  const [checked, setChecked] = useState<{ [key: string]: boolean }>({});
  const router = useRouter();
  const handleBack = onBack || (() => router.push("/notes"));

  const toggle = (item: string) => {
    setChecked((prev) => ({ ...prev, [item]: !prev[item] }));
  };

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-3">
        <button
          onClick={handleBack}
          type="button"
          className="absolute left-4 flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-text-secondary transition-colors hover:bg-surface-hover hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          title="Powrót"
          aria-label="Powrót"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="page-title mx-auto truncate px-14 text-center text-xl first-letter:uppercase sm:text-2xl">
          {headerTitle}
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => (
          <div key={cat.title} className="card flex h-full flex-col p-4 shadow-sm sm:p-5">
            <h3 className="mb-2 border-b border-line pb-2 text-lg font-bold text-text">{cat.title}</h3>
            <ul className="flex-1">
              {cat.items.map((item) => {
                const isChecked = !!checked[item];
                return (
                  <li key={item} className="my-1">
                    <label
                      className={`-ml-1 flex cursor-pointer items-start gap-3 rounded-lg p-1 transition-colors hover:bg-surface ${
                        isChecked ? "text-text-muted line-through" : "font-medium text-text"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggle(item)}
                        className="card mt-0.5 h-5 w-5 shrink-0 cursor-pointer text-primary accent-primary transition-colors focus:ring-primary"
                      />
                      <span className="flex-1 pt-0.5 leading-tight select-none">{item}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </>
  );
}
