// pages/bills/calculator.tsx

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Plus, Minus, Wallet, ArrowRightLeft } from "lucide-react";
import { useEuroRate } from "@/hooks/useEuroRate";
import { SkeletonLine } from "@/components/ui/Skeleton";
import Seo from "@/components/ui/SEO";
import { BILLS_CALCULATOR_DEFAULTS } from "@/config/defaults";

const InputField = ({
  label,
  inputRef,
  defaultValue = 0,
  icon,
  suffix = "zł",
  step = 0.01,
  onChange,
  className = "",
  readOnly = false,
}: {
  label: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  defaultValue?: number;
  icon?: React.ReactNode;
  suffix?: string;
  step?: number;
  onChange: () => void;
  className?: string;
  readOnly?: boolean;
}) => {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="pl-1 text-xs font-bold text-text-secondary">{label}</label>
      <div className="relative flex items-stretch">
        <div className="flex w-11 shrink-0 items-center justify-center rounded-l-xl border border-r-0 border-line bg-surface text-text-muted">
          {icon || <Plus size={16} />}
        </div>
        <input
          ref={inputRef}
          type="number"
          min="0"
          step={step}
          defaultValue={defaultValue || ""}
          placeholder="0"
          aria-label={typeof label === "string" ? label : undefined}
          onChange={onChange}
          readOnly={readOnly}
          className={`card w-full rounded-r-xl px-3 py-2.5 font-medium text-text transition-all outline-none focus:border-primary focus:ring-2 focus:ring-primary ${
            readOnly ? "cursor-not-allowed bg-surface opacity-70" : ""
          }`}
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm font-bold text-text-muted">
          {suffix}
        </span>
      </div>
    </div>
  );
};

export default function BillCalculator() {
  const baseRentRef = useRef<HTMLInputElement>(null);
  const communityRef = useRef<HTMLInputElement>(null);
  const waterRef = useRef<HTMLInputElement>(null);
  const electricityRef = useRef<HTMLInputElement>(null);
  const gasRef = useRef<HTMLInputElement>(null);
  const overpaymentRef = useRef<HTMLInputElement>(null);

  const exchangeRateRef = useRef<HTMLInputElement>(null);
  const { rate: fetchedEuroRate, loading: rateLoading } = useEuroRate();

  const income1Ref = useRef<HTMLInputElement>(null);
  const pit1Ref = useRef<HTMLInputElement>(null);
  const zus1Ref = useRef<HTMLInputElement>(null);
  const [currency1, setCurrency1] = useState<"PLN" | "EUR">("EUR");

  const income2Ref = useRef<HTMLInputElement>(null);
  const pit2Ref = useRef<HTMLInputElement>(null);
  const zus2Ref = useRef<HTMLInputElement>(null);
  const [currency2, setCurrency2] = useState<"PLN" | "EUR">("PLN");

  const [results, setResults] = useState({
    total: 0,
    share1: 0,
    share2: 0,
    netIncome1: 0,
    netIncome2: 0,
    pitValue1: 0,
    pitValue2: 0,
    grossPln1: 0,
    grossPln2: 0,
  });

  const calculate = useCallback(() => {
    const baseRent = Number(baseRentRef.current?.value) || 0;
    const community = Number(communityRef.current?.value) || 0;
    const water = Number(waterRef.current?.value) || 0;
    const electricity = Number(electricityRef.current?.value) || 0;
    const gas = Number(gasRef.current?.value) || 0;
    const overpayment = Number(overpaymentRef.current?.value) || 0;

    const rate = Number(exchangeRateRef.current?.value) || 0;

    const inc1Raw = Number(income1Ref.current?.value) || 0;
    const grossPln1 = inc1Raw * (currency1 === "EUR" ? rate : 1);
    const pit1Percent = Number(pit1Ref.current?.value) || 0;
    const zus1 = Number(zus1Ref.current?.value) || 0;
    const pitVal1 = grossPln1 * (pit1Percent / 100);
    const net1 = Math.max(0, grossPln1 - pitVal1 - zus1);

    const inc2Raw = Number(income2Ref.current?.value) || 0;
    const grossPln2 = inc2Raw * (currency2 === "EUR" ? rate : 1);
    const pit2Percent = Number(pit2Ref.current?.value) || 0;
    const zus2 = Number(zus2Ref.current?.value) || 0;
    const pitVal2 = grossPln2 * (pit2Percent / 100);
    const net2 = Math.max(0, grossPln2 - pitVal2 - zus2);

    const totalCost = baseRent + community + water + electricity + gas - overpayment;
    const halfCost = totalCost / 2;
    const fixedShare = halfCost / 2;
    const totalIncome = net1 + net2;

    let s1 = totalCost / 2;
    let s2 = totalCost / 2;

    if (totalIncome > 0) {
      const ratio1 = net1 / totalIncome;
      const ratio2 = net2 / totalIncome;
      s1 = fixedShare + halfCost * ratio1;
      s2 = fixedShare + halfCost * ratio2;
    }

    setResults({
      total: totalCost,
      share1: s1,
      share2: s2,
      netIncome1: net1,
      netIncome2: net2,
      pitValue1: pitVal1,
      pitValue2: pitVal2,
      grossPln1: grossPln1,
      grossPln2: grossPln2,
    });
  }, [currency1, currency2]);

  useEffect(() => {
    calculate();
  }, [currency1, currency2, calculate]);

  useEffect(() => {
    if (fetchedEuroRate && exchangeRateRef.current) {
      exchangeRateRef.current.value = fetchedEuroRate.toString();
      calculate();
    }
  }, [fetchedEuroRate, calculate]);

  const getCurrencySymbol = (curr: string) => {
    if (curr === "EUR") {
      return "€";
    } else {
      return "zł";
    }
  };

  const showExchangeRate = currency1 === "EUR" || currency2 === "EUR";

  return (
    <>
      <Seo
        title="Kalkulator kosztów"
        description="Podziel wspólne koszty mieszkania między dwie osoby proporcjonalnie do dochodów netto – z uwzględnieniem ZUS, zaliczki na PIT i kursu EUR/PLN."
        canonical="https://dzisiaj.fun/bills/calculator"
        keywords="kalkulator, obliczenia, kalkulator finansowy, wydatki"
      />
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h1 className="page-title">Kalkulator Podziału</h1>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section className="card rounded-card p-5 shadow-sm sm:p-6">
              <h2 className="mb-5 flex items-center gap-2 border-b border-line pb-3 text-lg font-bold text-text">
                Miesięczne Opłaty
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
                <InputField
                  label="Wynajem"
                  inputRef={baseRentRef}
                  defaultValue={BILLS_CALCULATOR_DEFAULTS.flatRental}
                  onChange={calculate}
                />
                <InputField
                  label="Czynsz"
                  inputRef={communityRef}
                  defaultValue={BILLS_CALCULATOR_DEFAULTS.flatFee}
                  onChange={calculate}
                />
                <InputField label="Woda" inputRef={waterRef} onChange={calculate} />
                <InputField label="Prąd" inputRef={electricityRef} onChange={calculate} />
                <InputField label="Gaz" inputRef={gasRef} onChange={calculate} />
                <InputField
                  label="Nadpłata"
                  inputRef={overpaymentRef}
                  icon={<Minus size={16} />}
                  onChange={calculate}
                />
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
                <span className="text-sm font-medium text-text-secondary">Suma:</span>
                <span className="text-xl font-bold text-primary">{results.total.toFixed(2)} zł</span>
              </div>
            </section>

            <section className="card rounded-card p-5 shadow-sm sm:p-6">
              <h2 className="mb-4 flex items-center gap-2 border-b border-line pb-3 text-lg font-bold text-text">
                Dochody i Podatki
              </h2>

              <div
                className={`overflow-hidden transition-all duration-500 ease-in-out ${showExchangeRate ? "mb-6 max-h-40 opacity-100" : "mb-0 max-h-0 opacity-0"}`}
              >
                <div className="relative rounded-xl border border-line bg-surface p-4">
                  <InputField
                    label="Kurs EUR/PLN"
                    inputRef={exchangeRateRef}
                    defaultValue={4.21}
                    icon={<ArrowRightLeft size={16} />}
                    onChange={calculate}
                  />
                  {rateLoading && <SkeletonLine className="mt-2 ml-1 h-3 w-40" />}
                  {!rateLoading && Boolean(fetchedEuroRate) && (
                    <p className="mt-2 ml-1 text-xs font-bold text-primary">
                      Aktualny kurs z NBP: {fetchedEuroRate} zł
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="flex flex-col justify-between space-y-4 rounded-xl border border-line p-4">
                  <div className="flex items-center justify-between border-b border-line pb-2">
                    <h3 className="font-bold text-text">Osoba 1</h3>
                    <select
                      aria-label="Waluta – osoba 1"
                      value={currency1}
                      onChange={(e) => setCurrency1(e.target.value as "PLN" | "EUR")}
                      className="card rounded-lg px-2 py-1 text-xs font-bold text-text outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="PLN">PLN</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                  <div className="flex flex-col justify-between gap-2">
                    <div className="min-h-22.5 flex-1">
                      <InputField
                        label="Przychód Brutto"
                        inputRef={income1Ref}
                        icon={<Wallet size={16} />}
                        suffix={getCurrencySymbol(currency1)}
                        onChange={calculate}
                      />
                      {currency1 !== "PLN" && (
                        <div className="mt-1 text-right text-xs font-bold text-text-muted">
                          w przeliczeniu: {results.grossPln1.toFixed(2)} zł
                        </div>
                      )}
                    </div>

                    <div className="min-h-22.5 flex-1">
                      <InputField
                        label="Zaliczka PIT"
                        inputRef={pit1Ref}
                        defaultValue={BILLS_CALCULATOR_DEFAULTS.taxPercent}
                        suffix="%"
                        step={1}
                        onChange={calculate}
                        icon={<Minus size={16} />}
                      />
                      <div className="mt-1 text-right text-xs font-bold text-danger">
                        - {results.pitValue1.toFixed(2)} zł
                      </div>
                    </div>
                    <div className="min-h-22.5 flex-1">
                      <InputField
                        label="Składka ZUS"
                        inputRef={zus1Ref}
                        defaultValue={BILLS_CALCULATOR_DEFAULTS.zus}
                        icon={<Minus size={16} />}
                        onChange={calculate}
                      />
                    </div>
                  </div>
                  <div className="mt-5 flex items-center justify-between border-t border-line pt-3 text-right">
                    <span className="text-xs font-medium text-text-secondary">Dochód Netto:</span>
                    <span className="text-lg font-medium text-success">{results.netIncome1.toFixed(2)} zł</span>
                  </div>
                </div>

                <div className="flex flex-col justify-between space-y-4 rounded-xl border border-line p-4">
                  <div className="flex items-center justify-between border-b border-line pb-2">
                    <h3 className="font-medium text-text">Osoba 2</h3>
                    <select
                      aria-label="Waluta – osoba 2"
                      value={currency2}
                      onChange={(e) => setCurrency2(e.target.value as "PLN" | "EUR")}
                      className="card rounded-lg px-2 py-1 text-xs font-bold text-text outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="PLN">PLN</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                  <div className="flex flex-col justify-between gap-2">
                    <div className="min-h-22.5 flex-1">
                      <InputField
                        label="Przychód Brutto"
                        inputRef={income2Ref}
                        icon={<Wallet size={16} />}
                        suffix={getCurrencySymbol(currency2)}
                        onChange={calculate}
                      />
                      {currency2 !== "PLN" && (
                        <div className="mt-1 text-right text-xs font-bold text-text-muted">
                          w przeliczeniu: {results.grossPln2.toFixed(2)} zł
                        </div>
                      )}
                    </div>

                    <div className="min-h-22.5 flex-1">
                      <InputField
                        label="Zaliczka PIT"
                        inputRef={pit2Ref}
                        defaultValue={0}
                        icon={<Minus size={16} />}
                        suffix="%"
                        step={1}
                        onChange={calculate}
                      />
                      <div className="mt-1 text-right text-xs font-bold text-danger">
                        - {results.pitValue2.toFixed(2)} zł
                      </div>
                    </div>
                    <div className="min-h-22.5 flex-1">
                      <InputField
                        label="Składka ZUS"
                        inputRef={zus2Ref}
                        defaultValue={0}
                        icon={<Minus size={16} />}
                        onChange={calculate}
                      />
                    </div>
                  </div>
                  <div className="mt-5 flex items-center justify-between border-t border-line pt-3 text-right">
                    <span className="text-xs font-bold text-text-secondary">Dochód Netto:</span>
                    <span className="text-lg font-black text-success">{results.netIncome2.toFixed(2)} zł</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
          <div className="lg:col-span-1">
            <section className="card sticky top-6 rounded-card p-5 shadow-sm sm:p-6">
              <h2 className="mb-6 border-b border-line pb-3 text-center text-lg font-bold text-text">Podsumowanie</h2>

              <div className="space-y-4">
                <div className="rounded-xl border border-line bg-surface p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-bold text-text-secondary">Osoba 1</span>
                    <span className="px-2.5 py-1 text-sm font-bold text-primary">
                      {((results.share1 / results.total) * 100 || 0).toFixed(0)}%
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-text">
                    {results.share1.toFixed(2)} <span className="text-base font-bold text-text-muted">zł</span>
                  </div>
                </div>

                <div className="rounded-xl border border-line bg-surface p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-bold text-text-secondary">Osoba 2</span>
                    <span className="px-2.5 py-1 text-sm font-bold text-primary">
                      {((results.share2 / results.total) * 100 || 0).toFixed(0)}%
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-text">
                    {results.share2.toFixed(2)} <span className="text-base font-bold text-text-muted">zł</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
