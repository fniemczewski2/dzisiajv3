// pages/notes/backpack.tsx
import React, { useState } from "react";
import Head from "next/head";
import Layout from "../../components/Layout";

const categories = [
  {
    title: "Apteczka",
    items: [
      "Plastry",
      "Plaster bezopatrunkowy – taśma",
      "Plaster bezopatrunkowy – arkusz",
      "Hydrożel",
      "Bandaż 10 cm",
      "Bandaż półelastyczny 5 cm",
      "Gazy jałowe",
      "Koc NRC",
      "Chusta trójkątna",
      "Rękawiczki",
      "Termometr",
      "Nożyczki",
      "Pilniczek",
      "Sól fizjologiczna",
      "Octenisept",
      "Krople do oczu",
      "Wapno",
      "Theraflu",
      "Leki na gardło",
      "Leki przeciwbólowe",
      "Leki rozkurczowe",
    ],
  },
  {
    title: "Portfel",
    items: [
      "Gotówka",
      "Karty płatnicze",
      "Legitymacja uczniowska",
      "Dowód osobisty",
      "PEKA",
      "EKUZ",
      "Karta Biblioteczna",
      "Karty lojalnościowe",
      "Naklejki",
      "Pendrive",
      "Multitool",
      "Gumki",
      "Drut",
      "Mokra chusteczka",
      "Rękawiczki",
    ],
  },
  {
    title: "Kubek",
    items: [
      "Siatki",
      "Grzałka",
      "Mus",
      "Baton",
      "Rolka do ubrań",
      "Taśma klejąca",
      "Gąbka i płyn do naczyń",
      "Sznurek i klamerki",
    ],
  },
  {
    title: "Multitool",
    items: ["Narzędzie", "Bity", "Piła", "Miara", "Wkręty", "Trytytki"],
  },
  {
    title: "Zewnętrzne",
    items: ["Długopis", "Marker", "Parasol", "Bidon/termos"],
  },
  {
    title: "Laptop",
    items: [
      "Laptop",
      "Teczka",
      "Wkładka",
      "Dokumenty",
      "Kartki, koperty, bilety",
    ],
  },
  {
    title: "Mała kieszeń",
    items: [
      "Chusteczki higieniczne",
      "Chusteczki mokre",
      "Chusteczki do ekranów",
      "Nakładki na toaletę",
      "Krem",
      "Mydło",
      "Perfum",
      "Płyn do dezynfekcji",
      "Grzebień",
      "Zestaw do szycia",
      "Zapalniczka",
      "Przewody",
      "Adapter",
      "Słuchawki",
      "Zatyczki do uszu",
      "Klej na gorąco",
      "Baterie",
      "Pomadka",
    ],
  },
  {
    title: "Duża kieszeń - Wewnętrzna",
    items: ["Worek", "Ścierka", "Bufka", "Peleryna", "Rękawice", "Maseczka"],
  },
  {
    title: "Jedzenie",
    items: [
      "Cukier",
      "Pieprz, sól",
      "Kawa, herbata",
      "Kisiel",
      "Guma do żucia",
    ],
  },
  {
    title: "Inne",
    items: [
      "Notes",
      "Sztućce",
      "Powerbank",
      "Rzeczy",
      "Dezodorant",
      "Okulary",
      "Ogrzewacz do rąk",
      "Głośnik",
    ],
  },
];

export default function BackpackPage() {
  const [checked, setChecked] = useState<{ [key: string]: boolean }>({});

  const toggle = (item: string) => {
    setChecked((prev) => ({ ...prev, [item]: !prev[item] }));
  };

  return (
    <>
      <Head>
        <title>Plecak – Dzisiajv3</title>
      </Head>
      <Layout>
        <h2 className="text-xl font-semibold mb-4">Plecak</h2>
        <div className="space-y-6  ">
          {categories.map((cat) => (
            <div key={cat.title}>
              <h3 className="font-semibold mb-2">{cat.title}</h3>
              <ul className="p-4 max-w-[400px] sm:max-w-[480px] w-full my-2 sm:mx-2 list-disc space-y-1 bg-card rounded-xl shadow">
                {cat.items.map((item) => (
                  <li key={item} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={!!checked[item]}
                      onChange={() => toggle(item)}
                      className="mr-2"
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
