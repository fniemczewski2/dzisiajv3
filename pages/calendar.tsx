import Head from "next/head";
import Layout from "../components/Layout";

export default function CalendarPage() {
  return (
    <>
      <Head>
        <title>Kalendarz – Dzisiaj v3</title>
        <meta name="description" content="Twój kalendarz i wydarzenia." />
      </Head>
      <Layout>
        <div className="bg-card rounded-xl shadow p-6 text-center text-gray-500">
          <h2 className="text-lg font-medium mb-2">Kalendarz</h2>
          <p>Wkrótce...</p>
        </div>
      </Layout>
    </>
  );
}
