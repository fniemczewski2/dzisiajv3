import { useRouter } from "next/router";
import Seo from "../components/SEO";
import { FEATURE_GROUPS } from "../config/features";

export default function Home() {
  const router = useRouter();
   
  const handleStartClick = () => {
    router.push({
      pathname: "/login",
      query: router.query 
    });
  };

  return (
    <>
      <Seo
        title="Rozpocznij - Dzisiaj v3"
        description="Poznaj Dzisiaj v3 - kompleksową aplikację, która pomoże Ci uporządkować i zorganizować każdy dzień."
        canonical="https://dzisiajv3.vercel.app/start"
        keywords="aplikacja produktywność, organizacja czasu, planner, darmowy organizer"
      />
        <main id="main-content" className="max-w-4xl mx-auto">
          <section className="text-center sm:py-12 px-4">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-text leading-snug">
              Organizuj swój&nbsp;dzień z&nbsp;<span className="text-primary leading-snug">Dzisiaj&nbsp;v3</span>
            </h1>
            <p className="text-xl text-textMuted mb-8 max-w-2xl mx-auto">
              Kompleksowa aplikacja do&nbsp;zarządzania czasem, zadaniami i&nbsp;produktywnością.
              Wszystko czego potrzebujesz w&nbsp;jednym miejscu.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleStartClick}
                className="hover:bg-primary bg-secondary text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors"
              >
                Rozpocznij
              </button>
            </div>
          </section>

          <section className="py-12 px-4" aria-labelledby="features-heading">
            <h2 id="features-heading" className="text-3xl font-bold text-center mb-12">
              Wszystko czego potrzebujesz
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {FEATURE_GROUPS.map(group => (
                <section key={group.category}>
                  <h2 className="mx-4 font-semibold text-2xl">{group.category}</h2>
                  {group.features.map((feature) => {
                    const IconComponent = feature.icon;
                    return (
                      <article
                        key={feature.title}
                        className="card p-6 m-4 rounded-xl shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="text-4xl mb-4">
                          <IconComponent />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                        <p className="text-textMuted">{feature.description}</p>
                      </article>
                    );
                  })}
                </section>
              ))}
            </div>
          </section>
        </main>
    </>
  );
}