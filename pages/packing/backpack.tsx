// pages/notes/backpack.tsx
import React, { useState } from "react";
import Head from "next/head";
import Layout from "../../components/Layout";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/router";
import { BACKPACK } from "../../config/packing"; 

export default function BackpackPage() {
  const [checked, setChecked] = useState<{ [key: string]: boolean }>({});
  const router = useRouter();
  
    const handleBack = () => {
        router.push("/notes"); 
    };

  const toggle = (item: string) => {
    setChecked((prev) => ({ ...prev, [item]: !prev[item] }));
  };

  return (
    <>
      <Head>
        <title>Plecak – Dzisiajv3</title>
      </Head>
      <Layout>
        <div className="flex justify-start gap-3 items-center mb-4">
          <button
            onClick={handleBack}
            className="p-2 flex items-center bg-primary hover:bg-secondary text-white rounded-lg shadow"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="text-xl font-semibold">Plecak</h2>
        </div>

        <div className="flex flex-row flex-wrap">
          {BACKPACK.map((cat) => (
            <div key={cat.title} className="sm:m-6 sm:h-min w-fit">
              <h3 className="font-semibold mb-2">{cat.title}</h3>
              <ul className="p-4 max-w-[400px] sm:max-w-[480px] min-w-[280px] w-full my-2 list-disc space-y-1 bg-card rounded-xl shadow">
                {cat.items.map((item) => (
                  <li
                    key={item}
                    className={`flex items-center ${
                      checked[item] ? "line-through text-gray-600" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={!!checked[item]}
                      onChange={() => toggle(item)}
                      className="mr-2 h-5 w-5"
                      title="Spakowane?"
                    />
                    {item}
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
BackpackPage.auth = true;