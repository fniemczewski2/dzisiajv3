import React, { useState } from "react";
import Head from "next/head";
import Layout from "../Layout";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/router";

interface PackingCategory {
  title: string;
  items: string[];
}

interface PackingListProps {
  pageTitle: string;
  headerTitle: string;
  categories: PackingCategory[];
  onBack?: () => void;
}

export default function PackingList({ pageTitle, headerTitle, categories, onBack }: PackingListProps) {
  const [checked, setChecked] = useState<{ [key: string]: boolean }>({});
  const router = useRouter();
  
  // Default to /notes if no custom back function is provided
  const handleBack = onBack || (() => router.push("/notes"));

  const toggle = (item: string) => {
    setChecked((prev) => ({ ...prev, [item]: !prev[item] }));
  };

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
      </Head>
      <Layout>
        <div className="flex justify-between gap-3 items-center mb-6">
          <button
            onClick={handleBack}
            className="w-10 h-10 bg-surface hover:bg-surfaceHover border border-gray-200 dark:border-gray-700 flex items-center justify-center text-textSecondary hover:text-text rounded-xl transition-colors absolute left-4"
            title="Powrót"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="font-bold text-lg sm:text-xl text-text mx-auto text-center capitalize tracking-wide truncate px-14">
            {headerTitle}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {categories.map((cat) => (
            <div key={cat.title} className="card rounded-2xl shadow-sm p-4 sm:p-5 flex flex-col h-full">
              <h3 className="font-bold text-lg text-text mb-2 pb-2 border-b border-gray-100 dark:border-gray-800">
                {cat.title}
              </h3>
              <ul className="flex-1">
                {cat.items.map((item) => (
                  <li
                    key={item}
                    className={`flex items-start gap-3 my-1 rounded-lg transition-colors hover:bg-surface cursor-pointer ${
                      checked[item] ? "text-textMuted line-through" : "text-text font-medium"
                    }`}
                    onClick={() => toggle(item)}
                  >
                    <input
                      type="checkbox"
                      checked={!!checked[item]}
                      readOnly 
                      className="mt-0.5 h-5 w-5 shrink-0 rounded text-primary focus:ring-primary accent-primary cursor-pointer card transition-colors"
                    />
                    <span className="flex-1 leading-tight select-none pt-0.5">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Layout>
    </>
  );
}