"use client";

import React, { useState, useEffect, useRef } from "react";
import Layout from "../../components/Layout";
import SEO from "../../components/SEO";
import { Plus, Minus, Wallet, ChevronLeft, ArrowRightLeft } from "lucide-react";
import { useRouter } from "next/router";
import { useEuroRate } from "../../hooks/useEuroRate";
import LoadingState from "../../components/LoadingState";

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
      <label className="text-xs font-bold uppercase tracking-wider text-textSecondary pl-1">
        {label}
      </label>
      <div className="relative flex items-stretch">
        <div className="bg-surface border border-gray-200 dark:border-gray-700 border-r-0 rounded-l-xl flex items-center justify-center w-11 text-textMuted shrink-0">
          {icon || <Plus size={16} />}
        </div>
        <input
          ref={inputRef}
          type="number"
          min="0"
          step={step}
          defaultValue={defaultValue || ""}
          placeholder="0"
          onChange={onChange}
          readOnly={readOnly}
          className={`w-full py-2.5 px-3 border border-gray-200 dark:border-gray-700 rounded-r-xl outline-none font-medium text-text bg-card focus:ring-2 focus:ring-primary focus:border-primary transition-all ${
            readOnly ? 'bg-surface cursor-not-allowed opacity-70' : ''
          }`}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-textMuted pointer-events-none">
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

  const calculate = () => {
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
  };

  useEffect(() => {
    calculate();
  }, [currency1, currency2]);

  useEffect(() => {
    if (fetchedEuroRate && exchangeRateRef.current) {
        exchangeRateRef.current.value = fetchedEuroRate.toString();
        calculate();
    }
  }, [fetchedEuroRate]);

  const router = useRouter();
  const handleBack = () => {
    const parts = router.pathname.split("/").filter(Boolean);
    router.push(parts.length > 1 ? `/${parts.slice(0, -1).join("/")}` : "/");
  };

  const getCurrencySymbol = (curr: string) => {
    switch(curr) {
        case "EUR": return "€";
        default: return "zł";
    }
  }

  const showExchangeRate = currency1 === "EUR" || currency2 === "EUR";

  return (
    <Layout>
      <SEO title="Kalkulator Podziału - Dzisiaj" />

      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Pasek Nagłówkowy */}
        <div className="bg-card border border-gray-200 dark:border-gray-800 p-4 shadow-sm rounded-2xl flex items-center relative">
          <button
            onClick={handleBack}
            className="w-10 h-10 bg-surface hover:bg-surfaceHover border border-gray-200 dark:border-gray-700 flex items-center justify-center text-textSecondary hover:text-text rounded-xl transition-colors absolute left-4"
            title="Powrót"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <h2 className="font-bold text-xl text-text mx-auto text-center capitalize tracking-wide">
            Kalkulator Podziału
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            
            {/* Opłaty */}
            <section className="bg-card p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
              <h2 className="flex items-center gap-2 text-lg font-bold text-text mb-5 pb-3 border-b border-gray-100 dark:border-gray-800">
                Miesięczne Opłaty
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <InputField label="Wynajem" inputRef={baseRentRef} defaultValue={2000} onChange={calculate} />
                <InputField label="Czynsz" inputRef={communityRef} defaultValue={585} onChange={calculate} />
                <InputField label="Woda" inputRef={waterRef} onChange={calculate} />
                <InputField label="Prąd" inputRef={electricityRef} onChange={calculate} />
                <InputField label="Gaz" inputRef={gasRef} onChange={calculate} />
                <InputField label="Nadpłata" inputRef={overpaymentRef} icon={<Minus size={16} />} onChange={calculate} />
              </div>
              
              <div className="mt-5 pt-4 flex justify-between items-center border-t border-gray-100 dark:border-gray-800">
                  <span className="text-sm font-bold uppercase tracking-wider text-textSecondary">Suma:</span>
                  <span className="text-2xl font-black text-primary">{results.total.toFixed(2)} zł</span>
              </div>
            </section>

            {/* Dochody */}
            <section className="bg-card p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
              <h2 className="flex items-center gap-2 text-lg font-bold text-text mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
                Dochody i Podatki
              </h2>

              <div className={`transition-all duration-500 ease-in-out overflow-hidden ${showExchangeRate ? 'max-h-40 opacity-100 mb-6' : 'max-h-0 opacity-0 mb-0'}`}>
                <div className="bg-surface p-4 rounded-xl border border-gray-200 dark:border-gray-700 relative">
                  {rateLoading && <LoadingState />}
                  <InputField 
                    label="Kurs EUR/PLN"
                    inputRef={exchangeRateRef} 
                    defaultValue={4.21} 
                    icon={<ArrowRightLeft size={16} />}
                    onChange={calculate} 
                  />
                  {fetchedEuroRate && (
                      <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500 mt-2 ml-1">
                          Aktualny kurs z NBP: {fetchedEuroRate} zł
                      </p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                
                {/* Osoba 1 */}
                <div className="space-y-4 p-4 rounded-xl bg-surface border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-600">
                    <h3 className="font-bold text-text">Osoba 1</h3>
                    <select 
                        value={currency1}
                        onChange={(e) => setCurrency1(e.target.value as "PLN" | "EUR")}
                        className="text-xs font-bold bg-card border border-gray-300 dark:border-gray-600 text-text rounded-md px-2 py-1 outline-none focus:ring-2 focus:ring-primary"
                    >
                        <option value="PLN">PLN</option>
                        <option value="EUR">EUR</option>
                    </select>
                  </div>

                  <div>
                    <InputField 
                      label="Przychód Brutto"
                      inputRef={income1Ref} 
                      icon={<Wallet size={16}/>} 
                      suffix={getCurrencySymbol(currency1)}
                      onChange={calculate} 
                    />
                    {currency1 !== "PLN" && (
                      <div className="text-right text-[10px] font-bold uppercase tracking-wider text-textMuted mt-1">
                          w przeliczeniu: {results.grossPln1.toFixed(2)} zł
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <InputField 
                      label="Zaliczka PIT" 
                      inputRef={pit1Ref} 
                      defaultValue={12} 
                      suffix="%"
                      step={1}
                      onChange={calculate}
                      icon={<Minus size={16} />}
                    />
                    <div className="text-right text-[10px] font-bold uppercase tracking-wider text-red-500 mt-1">
                      - {results.pitValue1.toFixed(2)} zł
                    </div>
                  </div>

                  <InputField label="Składka ZUS" inputRef={zus1Ref} defaultValue={498} icon={<Minus size={16} />} onChange={calculate} />
                  
                  <div className="text-right mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-textSecondary">Dochód Netto:</span>
                    <span className="text-lg font-black text-green-600 dark:text-green-500">{results.netIncome1.toFixed(2)} zł</span>
                  </div>
                </div>

                {/* Osoba 2 */}
                <div className="space-y-4 p-4 rounded-xl bg-surface border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-600">
                    <h3 className="font-bold text-text">Osoba 2</h3>
                    <select 
                        value={currency2}
                        onChange={(e) => setCurrency2(e.target.value as "PLN" | "EUR")}
                        className="text-xs font-bold bg-card border border-gray-300 dark:border-gray-600 text-text rounded-md px-2 py-1 outline-none focus:ring-2 focus:ring-primary"
                    >
                        <option value="PLN">PLN</option>
                        <option value="EUR">EUR</option>
                    </select>
                  </div>

                  <div>
                    <InputField 
                      label="Przychód Brutto"
                      inputRef={income2Ref} 
                      icon={<Wallet size={16}/>} 
                      suffix={getCurrencySymbol(currency2)}
                      onChange={calculate} 
                    />
                    {currency2 !== "PLN" && (
                      <div className="text-right text-[10px] font-bold uppercase tracking-wider text-textMuted mt-1">
                          w przeliczeniu: {results.grossPln2.toFixed(2)} zł
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <InputField 
                      label="Zaliczka PIT" 
                      inputRef={pit2Ref} 
                      defaultValue={0} 
                      icon={<Minus size={16} />}
                      suffix="%" 
                      step={1}
                      onChange={calculate}
                    />
                    <div className="text-right text-[10px] font-bold uppercase tracking-wider text-red-500 mt-1">
                      - {results.pitValue2.toFixed(2)} zł
                    </div>
                  </div>

                  <InputField label="Składka ZUS" inputRef={zus2Ref} defaultValue={0} icon={<Minus size={16} />} onChange={calculate} />
                  
                  <div className="text-right mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-textSecondary">Dochód Netto:</span>
                    <span className="text-lg font-black text-green-600 dark:text-green-500">{results.netIncome2.toFixed(2)} zł</span>
                  </div>
                </div>

              </div>
            </section>
          </div>

          {/* Podsumowanie */}
          <div className="lg:col-span-1">
            <section className="bg-card p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 sticky top-6">
              <h2 className="text-lg font-bold text-text mb-6 text-center border-b border-gray-100 dark:border-gray-800 pb-3">Podsumowanie</h2>
              
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-surface border border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-textSecondary">Osoba 1</span>
                    <span className="text-[10px] font-black bg-primary/10 text-primary px-2.5 py-1 rounded-md border border-primary/20">
                      {(results.share1 / results.total * 100 || 0).toFixed(0)}%
                    </span>
                  </div>
                  <div className="text-2xl font-black text-text">
                    {results.share1.toFixed(2)} <span className="text-base font-bold text-textMuted">zł</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-surface border border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-textSecondary">Osoba 2</span>
                    <span className="text-[10px] font-black bg-primary/10 text-primary px-2.5 py-1 rounded-md border border-primary/20">
                      {(results.share2 / results.total * 100 || 0).toFixed(0)}%
                    </span>
                  </div>
                  <div className="text-2xl font-black text-text">
                    {results.share2.toFixed(2)} <span className="text-base font-bold text-textMuted">zł</span>
                  </div>
                </div>
                
                <div className="pt-5 mt-2 border-t border-gray-200 dark:border-gray-800 text-center">
                    <p className="text-[11px] font-bold text-textMuted uppercase tracking-widest mb-1">Razem do zapłaty</p>
                    <p className="text-3xl font-black text-primary drop-shadow-sm">{(results.share1 + results.share2).toFixed(2)} zł</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
}