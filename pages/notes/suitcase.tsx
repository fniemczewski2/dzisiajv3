import React, { useState } from "react";
import Head from "next/head";
import Layout from "../../components/Layout";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/router";

const categories = [
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
      "Gry / karty",
      "Mapa (offline)",
      "Filmy / muzyka",
    ],
  },
];

export default function SafetyPage() {
  const [checked, setChecked] = useState<{ [key: string]: boolean }>({});
  const router = useRouter();
  
    const handleBack = () => {
      const pathParts = router.pathname.split("/").filter(Boolean);
      if (pathParts.length > 1) {
        const parentPath = "/" + pathParts.slice(0, -1).join("/");
        router.push(parentPath);
      } else {
        router.push("/"); 
      }
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
          <h2 className="text-xl font-semibold">Walizka</h2>
        </div>
        <div className="space-y-6  flex flex-row flex-wrap">
          {categories.map((cat) => (
            <div key={cat.title} className="sm:m-6 sm:h-min w-fit">
              <h3 className="font-semibold mb-2">{cat.title}</h3>
              <ul className="p-4 min-w-[280px] max-w-[400px] sm:max-w-[480px] w-full my-2 sm:mx-2 list-disc space-y-1 bg-card rounded-xl shadow">
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
