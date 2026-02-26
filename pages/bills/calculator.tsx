import React, { useState, useEffect, useRef } from "react";
import Layout from "../../components/Layout";
import SEO from "../../components/SEO";
import { Banknote, Users, Plus, Minus, Wallet, Percent, ChevronLeft, ArrowRightLeft, RefreshCw } from "lucide-react";
import { useRouter } from "next/router";
import { useEuroRate } from "../../hooks/useEuroRate"; // Import the hook
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
  let styles = {
    box: "bg-gray-50 border-gray-200 text-gray-500",
    focus: "none",
    icon: icon || <Plus size={18} />
  };

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="relative flex items-center">
        <div 
          className={`p-2 rounded-l-lg border-y border-l flex items-center justify-center w-10 h-[41.6px] ${styles.box}`}
        >
          {styles.icon}
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
          className={`w-full p-2 border-y border-r rounded-r-lg outline-none ${readOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        />
        <span className="absolute right-3 text-sm text-gray-600 pointer-events-none">
          {suffix}
        </span>
      </div>
    </div>
  );
};

export default function BillCalculator() {
  // 1. Refs for expenses
  const baseRentRef = useRef<HTMLInputElement>(null);
  const communityRef = useRef<HTMLInputElement>(null);
  const waterRef = useRef<HTMLInputElement>(null);
  const electricityRef = useRef<HTMLInputElement>(null);
  const gasRef = useRef<HTMLInputElement>(null);
  const overpaymentRef = useRef<HTMLInputElement>(null);

  // 2. Refs for incomes & deductions
  
  const exchangeRateRef = useRef<HTMLInputElement>(null);
  const { rate: fetchedEuroRate, loading: rateLoading } = useEuroRate();

  // Person 1
  const income1Ref = useRef<HTMLInputElement>(null);
  const pit1Ref = useRef<HTMLInputElement>(null);
  const zus1Ref = useRef<HTMLInputElement>(null);
  const [currency1, setCurrency1] = useState<"PLN" | "EUR">("EUR");
  
  // Person 2
  const income2Ref = useRef<HTMLInputElement>(null);
  const pit2Ref = useRef<HTMLInputElement>(null);
  const zus2Ref = useRef<HTMLInputElement>(null);
  const [currency2, setCurrency2] = useState<"PLN" | "EUR">("PLN");

  // 3. Results State
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

  // 4. Calculation Logic
  const calculate = () => {
    // Expenses
    const baseRent = Number(baseRentRef.current?.value) || 0;
    const community = Number(communityRef.current?.value) || 0;
    const water = Number(waterRef.current?.value) || 0;
    const electricity = Number(electricityRef.current?.value) || 0;
    const gas = Number(gasRef.current?.value) || 0;
    const overpayment = Number(overpaymentRef.current?.value) || 0;
    
    // Rate
    const rate = Number(exchangeRateRef.current?.value) || 0;

    // --- Person 1 Income ---
    const inc1Raw = Number(income1Ref.current?.value) || 0;
    const grossPln1 = inc1Raw * (currency1 === "EUR" ? rate : 1);

    const pit1Percent = Number(pit1Ref.current?.value) || 0;
    const zus1 = Number(zus1Ref.current?.value) || 0;
    
    const pitVal1 = grossPln1 * (pit1Percent / 100);
    const net1 = Math.max(0, grossPln1 - pitVal1 - zus1);

    // --- Person 2 Income ---
    const inc2Raw = Number(income2Ref.current?.value) || 0;
    const grossPln2 = inc2Raw * (currency2 === "EUR" ? rate : 1);

    const pit2Percent = Number(pit2Ref.current?.value) || 0;
    const zus2 = Number(zus2Ref.current?.value) || 0;

    const pitVal2 = grossPln2 * (pit2Percent / 100);
    const net2 = Math.max(0, grossPln2 - pitVal2 - zus2);

    // --- Total Cost & Split ---
    const totalCost = baseRent + community + water + electricity + gas - overpayment;
    const halfCost = totalCost / 2;
    const fixedShare = halfCost / 2; // (C/4)
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
      <SEO title="Kalkulator Podziału - Dzisiaj v3" />

      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex sm:flex-1 flex-nowrap gap-3 items-center mb-4">
          <button
            onClick={handleBack}
            className="p-2 flex items-center bg-primary hover:bg-secondary text-white rounded-lg shadow"
            aria-label="Wróć"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="text-xl ml-2 font-semibold">Kalkulator</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Inputs */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Expenses Section */}
            <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
                Opłaty
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label="Wynajem" inputRef={baseRentRef} defaultValue={2000} onChange={calculate} />
                <InputField label="Czynsz" inputRef={communityRef} defaultValue={585} onChange={calculate} />
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
              
              <div className="mt-4 pt-4 flex justify-between items-center text-sm text-gray-600 border-t">
                  <span>Suma:</span>
                  <span className="text-lg font-bold text-gray-900">{results.total.toFixed(2)} zł</span>
              </div>
            </section>

            {/* Incomes Section */}
            <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4 border-b pb-2">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                  Dochody
                </h2>
              </div>

              {/* Shared Exchange Rate Input */}
              <div className={`my-4 transition-all duration-300 ${showExchangeRate ? 'opacity-100' : 'opacity-0 max-h-0 overflow-hidden'}`}>
                <div className="p-4 rounded-lg relative">
                  {rateLoading && (
                    <LoadingState />
                  )}
                  <InputField 
                    label="Kurs EUR/PLN"
                    inputRef={exchangeRateRef} 
                    defaultValue={4.21} 
                    icon={<ArrowRightLeft size={16} />}
                    onChange={calculate} 
                  />
                  {fetchedEuroRate && (
                      <p className="text-xs text-blue-500 mt-1 ml-1">
                          Pobrano kurs: {fetchedEuroRate} zł
                      </p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Person 1 Column */}
                <div className="space-y-2 p-3 rounded-lg border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                        Osoba 1
                    </h3>
                    <select 
                        value={currency1}
                        onChange={(e) => setCurrency1(e.target.value as "PLN" | "EUR")}
                        className="text-sm border border-gray-300 rounded-md p-1 bg-white focus:outline-none"
                    >
                        <option value="PLN">PLN</option>
                        <option value="EUR">EUR</option>
                    </select>
                  </div>
                  <div>
                  <InputField 
                    label={`Przychód Brutto`}
                    inputRef={income1Ref} 
                    icon={<Wallet size={16}/>} 
                    suffix={getCurrencySymbol(currency1)}
                    onChange={calculate} 
                  />

                  {currency1 !== "PLN" && (
                    <div className="text-right text-xs text-gray-600 mt-1">
                       {results.grossPln1.toFixed(2)} zł
                    </div>
                  )}
                  </div>
                  
                  {/* PIT 1 */}
                  <div>
                    <InputField 
                      label="PIT (%)" 
                      inputRef={pit1Ref} 
                      defaultValue={12} 
                      suffix="%"
                      step={1}
                      onChange={calculate}
                      icon={<Minus size={16} />}
                    />
                    <div className="text-right text-xs text-red-600 mt-1">
                      - {results.pitValue1.toFixed(2)} zł
                    </div>
                  </div>

                  <InputField label="ZUS" inputRef={zus1Ref} defaultValue={498} icon={<Minus size={16} />} onChange={calculate} />
                  
                  <div className="text-right text-sm text-gray-600 mt-2 pt-2 border-t border-gray-200">
                    Netto: <strong>{results.netIncome1.toFixed(2)} zł</strong>
                  </div>
                </div>

                {/* Person 2 Column */}
                <div className="space-y-2 p-3 rounded-lg border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                        Osoba 2
                    </h3>
                    <select 
                        value={currency2}
                        onChange={(e) => setCurrency2(e.target.value as "PLN" | "EUR")}
                        className="text-sm border border-gray-300 rounded-md p-1 bg-white focus:outline-none"
                    >
                        <option value="PLN">PLN</option>
                        <option value="EUR">EUR</option>
                    </select>
                  </div>
                  <div>
                  <InputField 
                    label={`Przychód Brutto`}
                    inputRef={income2Ref} 
                    icon={<Wallet size={16}/>} 
                    suffix={getCurrencySymbol(currency2)}
                    onChange={calculate} 
                  />


                  {currency2 !== "PLN" && (
                    <div className="text-right text-xs text-gray-600 mt-1">
                       {results.grossPln2.toFixed(2)} zł
                    </div>
                  )}
                  </div>
                  
                  {/* PIT 2 */}
                  <div>
                    <InputField 
                      label="PIT" 
                      inputRef={pit2Ref} 
                      defaultValue={0} 
                      icon={<Minus size={16} />}
                      suffix="%" 
                      step={1}
                      onChange={calculate}
                    />
                     <div className="text-right text-xs text-red-600 mt-1">
                      - {results.pitValue2.toFixed(2)} zł
                    </div>
                  </div>

                  <InputField label="ZUS" inputRef={zus2Ref} defaultValue={0} icon={<Minus size={16} />} onChange={calculate} />
                  
                  <div className="text-right text-sm text-gray-600 mt-2 pt-2 border-t border-gray-200">
                    Netto: <strong>{results.netIncome2.toFixed(2)} zł</strong>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-1">
            <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 sticky top-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-6 text-center">Wynik Podziału</h2>
              
              <div className="space-y-6">
                {/* Person 1 */}
                <div className="p-4 rounded-xl border">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-600">Osoba 1</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      {(results.share1 / results.total * 100 || 0).toFixed(0)}%
                    </span>
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    {results.share1.toFixed(2)} <span className="text-base font-normal text-gray-500">zł</span>
                  </div>
                </div>

                {/* Person 2 */}
                <div className="p-4 rounded-xl border">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-600">Osoba 2</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      {(results.share2 / results.total * 100 || 0).toFixed(0)}%
                    </span>
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    {results.share2.toFixed(2)} <span className="text-base font-normal text-gray-500">zł</span>
                  </div>
                </div>
                
                {/* Total Check */}
                <div className="border-t pt-4 text-center">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Razem do zapłaty</p>
                    <p className="text-xl font-bold text-gray-700">{(results.share1 + results.share2).toFixed(2)} zł</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
}