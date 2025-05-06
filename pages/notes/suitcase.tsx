import React, { useState } from "react";
import Head from "next/head";
import Layout from "../../components/Layout";

const suitcaseCategories = [
  {
    title: "Odzież",
    items: [
      "T-shirty",
      "Koszule",
      "Sweter",
      "Bluza",
      "Spodnie długie",
      "Szorty",
      "Bielizna",
      "Skarpetki",
      "Piżama",
      "Kurtka",
      "Strój kąpielowy",
    ],
  },
  {
    title: "Obuwie",
    items: ["Buty codzienne", "Sandały", "Klapki", "Buty eleganckie"],
  },
  {
    title: "Bagaże i organizacja",
    items: ["Główna walizka", "Dodatkowe torby", "Nerka"],
  },
  {
    title: "Spanie",
    items: ["Koc podróżny", "Poduszka podróżna", "Hamak", "Śpiwór", "Karimata"],
  },
  {
    title: "Kosmetyczka",
    items: [
      "Szczoteczka do zębów",
      "Pasta do zębów",
      "Szampon / odżywka",
      "Żel pod prysznic",
      "Dezodorant",
      "Krem do twarzy",
      "Krem z filtrem",
      "Maszynka do golenia",
      "Grzebień",
      "Gumki, spinki",
    ],
  },
  {
    title: "Dokumenty i finanse",
    items: [
      "Dowód osobisty",
      "Paszport",
      "Karty płatnicze",
      "Gotówka",
      "Karta EKUZ",
      "Bilety / rezerwacje",
      "Ubezpieczenie",
    ],
  },
  {
    title: "Elektronika",
    items: [
      "Telefon + ładowarka",
      "Power bank",
      "Słuchawki",
      "Aparat",
      "Ładowarki i kable",
      "Generator kodów",
      "Adapter podróżny",
      "Grzałka elektryczna ",
    ],
  },
  {
    title: "Apteczka i higiena",
    items: [
      "Leki",
      "Leki przeciwbólowe, na biegunkę, na gardło",
      "Plastry, bandaże, środki odkażające",
      "Chusteczki higieniczne",
      "Chusteczki mokre",
      "Płatki kosmetyczne",
      "Patyczki higieniczne",
      "Środek przeciw komarom/kleszczom",
    ],
  },
  {
    title: "Akcesoria i dodatki",
    items: [
      "Okulary przeciwsłoneczne",
      "Kapelusz / czapka",
      "Pasek",
      "Parasolka składana",
      "Biżuteria",
    ],
  },
  {
    title: "Rozrywka i inne",
    items: [
      "Książka",
      "Notes i długopis",
      "Gry podróżne / karty",
      "Mapa / przewodnik (lub aplikacja offline)",
      "Filmy / muzyka",
    ],
  },
];

export default function SuitcasePage() {
  const [checked, setChecked] = useState<{ [key: string]: boolean }>({});
  const toggle = (item: string) =>
    setChecked((prev) => ({ ...prev, [item]: !prev[item] }));

  return (
    <>
      <Head>
        <title>Walizka – Notatki</title>
      </Head>
      <Layout>
        <h2 className="text-xl font-semibold mb-4">Lista do walizki</h2>
        <div className="space-y-6">
          {suitcaseCategories.map((cat) => (
            <div key={cat.title}>
              <h3 className="font-semibold mb-2">{cat.title}</h3>
              <ul className="list-disc ml-5 space-y-1">
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
SuitcasePage.auth = true;
