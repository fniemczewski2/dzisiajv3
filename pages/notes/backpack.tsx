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
      "Podpaski",
      "Koc NRC",
      "Chusta trójkątna",
      "Rękawiczki",
      "Termometr",
      "Nożyczki",
      "Pilniczek",
      "Sól fizjologiczna",
      "Gaziki alkoholowe",
      "Chusteczki dekontaminacyjne",
      "Octenisept",
      "Wapno",
      "Theraflu",
      "Elektrolity",
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
      "Legitymacja",
      "Dowód osobisty",
      "PEKA",
      "EKUZ",
      "Karta biblioteczna",
      "Karty lojalnościowe",
      "Naklejki",
      "Pendrive",
      "Multitool",
      "Gumki",
      "Drut",
    ],
  },
  {
    title: "Kubek",
    items: [
      "Siatki",
      "Grzałka",
      "Baton",
      "Rolka do ubrań",
      "Taśma klejąca",
      "Gąbka i płyn do naczyń",
      "Sznurek i klamerki",
      "Trytytki",
    ],
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
      "Zapalniczka",
      "Przewody",
      "Adapter",
      "Słuchawki",
      "Zatyczki do uszu",
      "Klej na gorąco",
      "Baterie",
      "Pomadka",
      "Miara",
      "Zestaw biurowy",
      "Zestaw do szycia",
      "Otwieracz",
    ],
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
      "Multitool",
      "Rękawice",
      "Torba na zakupy",
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
        <div className="flex flex-row flex-wrap">
          {categories.map((cat) => (
            <div key={cat.title} className="sm:m-6 sm:h-min w-fit">
              <h3 className="font-semibold mb-2">{cat.title}</h3>
              <ul className="p-4 max-w-[400px] w-full my-2 list-disc space-y-1 bg-card rounded-xl shadow">
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
