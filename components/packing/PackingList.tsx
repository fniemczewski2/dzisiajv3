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
        <div className="flex justify-between gap-3 items-center mb-6">
          <button
            onClick={handleBack}
            type='button'
            className="w-10 h-10 bg-surface hover:bg-surface-hover border border-gray-200 dark:border-gray-700 flex items-center justify-center text-text-secondary hover:text-text rounded-xl transition-colors absolute left-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            title="Powrót" aria-label="Powrót"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="page-title text-xl sm:text-2xl mx-auto text-center first-letter:uppercase truncate px-14">
            {headerTitle}
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {categories.map((cat) => (
            <div key={cat.title} className="card rounded-card shadow-sm p-4 sm:p-5 flex flex-col h-full">
              <h3 className="font-bold text-lg text-text mb-2 pb-2 border-b border-gray-100 dark:border-gray-800">
                {cat.title}
              </h3>
              <ul className="flex-1">
                {cat.items.map((item) => {
                  const isChecked = !!checked[item];
                  return (
                    <li key={item} className="my-1">
                      <label 
                        className={`flex items-start gap-3 rounded-lg p-1 -ml-1 transition-colors hover:bg-surface cursor-pointer ${
                          isChecked ? "text-text-muted line-through" : "text-text font-medium"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggle(item)} 
                          className="mt-0.5 h-5 w-5 shrink-0 rounded-lg text-primary focus:ring-primary accent-primary cursor-pointer card transition-colors"
                        />
                        <span className="flex-1 leading-tight select-none pt-0.5">{item}</span>
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
