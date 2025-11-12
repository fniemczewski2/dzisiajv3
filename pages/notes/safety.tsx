import React, { useState } from "react";
import Head from "next/head";
import Layout from "../../components/Layout";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/router";

const categories = [
  {
    title: "Dokumenty i pieniądze",
    items: [
      "Kserokopie dokumentów (dowód, paszport)",
      "USB z kopiami ważnych dokumentów",
      "Gotówka (małe nominały)",
      "Lista kontaktów awaryjnych",
    ],
  },
  {
    title: "Higiena i zdrowie",
    items: [
      "Apteczka pierwszej pomocy",
      "Leki na stałe (min. 3 dni)",
      "Maseczki ochronne",
      "Rękawiczki jednorazowe",
      "Chusteczki nawilżane",
      "Papier toaletowy",
      "Żel antybakteryjny",
      "Mydło"
    ],
  },
  {
    title: "Jedzenie i woda",
    items: [
      "Woda pitna",
      "Tabletki do uzdatniania wody / filtr",
      "Żywność długoterminowa",
      "Naczynia, sztućce, kubek",
      "Otwieracz do puszek",
    ],
  },
  {
    title: "Odzież",
    items: [
      "Kurtka przeciwdeszczowa",
      "Ciepła bluza / polar",
      "Bielizna",
      "Skarpetki",
      "Odzież termoaktywna",
    ],
  },
  {
    title: "Sprzęt i narzędzia",
    items: [
      "Latarka i baterie",
      "Powerbank",
      "Scyzoryk / multitool",
      "Zapałki / zapalniczka",
      "Lina / paracord",
      "Worki na śmieci",
    ],
  },
  {
    title: "Nocleg",
    items: [
      "Koc termiczny (folia NRC)",
      "Śpiwór",
      "Karimata",
    ],
  },
  {
    title: "Komunikacja i informacje",
    items: [
      "Radio na baterie",
      "Gwizdek alarmowy",
      "Notatnik i długopis",
      "Mapa lokalna",
    ],
  }
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
        router.push("/"); // fallback: home
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
          <h2 className="text-xl font-semibold">Plecak bezpieczeństwa</h2>
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
