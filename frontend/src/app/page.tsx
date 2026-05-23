"use client";

import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Interpretation {
  category: string;
  message: string;
  severity: string;
}

interface FuzzifiedValues {
  [variable: string]: { [set: string]: number };
}

interface FiredRule {
  id: string;
  w: number;
  antecedent: [string, string][];
  consequent_set: string;
  aciklama: string | null;
}

interface DominantRule {
  id: string;
  w: number;
  antecedent: [string, string][];
  consequent_set: string;
  aciklama: string | null;
}

interface Distribution {
  dolgu: number;
  belirsiz: number;
  kanal: number;
}

interface PredictResult {
  inputs: { tolerans: number; agri: number; curuk: number; yas: number };
  fuzzified: FuzzifiedValues;
  fired_rules_count: number;
  fired_rules: FiredRule[];
  crisp_output: number;
  interpretation: Interpretation;
  dominant_rule: DominantRule | null;
  distribution: Distribution;
}

const VAR_LABELS_TR: Record<string, string> = {
  tolerans: "Tolerans",
  agri: "Agri",
  curuk: "Curuk",
  yas: "Yas",
};

const SET_LABELS_TR: Record<string, string> = {
  edebilir: "Edebilir",
  belirsiz: "Belirsiz",
  edemez: "Edemez",
  yok: "Yok",
  kisa: "Kisa",
  uzun: "Uzun",
  spontan: "Spontan",
  mine: "Mine",
  d1: "D1",
  d2: "D2",
  d3: "D3",
  d4: "D4",
  cocuk: "Cocuk",
  genc: "Genc",
  orta: "Orta",
  ileri: "Ileri",
};

function formatAntecedent(antecedent: [string, string][]): string {
  return antecedent
    .map(([v, s]) => `${VAR_LABELS_TR[v] ?? v} = ${SET_LABELS_TR[s] ?? s}`)
    .join("  •  ");
}

const SLIDER_CONFIG = [
  {
    key: "tolerans",
    label: "Tolerans Skoru",
    description: "Hastanin tedaviye toleransi (0 = Edemez, 10 = Edebilir)",
    min: 0,
    max: 10,
    step: 0.1,
    default: 5,
    unit: "/ 10",
    labels: ["Edemez", "Belirsiz", "Edebilir"],
    sets: ["edemez", "belirsiz", "edebilir"],
    icon: "shield",
  },
  {
    key: "agri",
    label: "Agri Profili (NRS)",
    description: "Sayisal Derecelendirme Skalasi (0 = Yok, 10 = Spontan)",
    min: 0,
    max: 10,
    step: 0.1,
    default: 5,
    unit: "/ 10",
    labels: ["Yok", "Kisa", "Uzun", "Spontan"],
    sets: ["yok", "kisa", "uzun", "spontan"],
    icon: "bolt",
  },
  {
    key: "curuk",
    label: "Curuk Derinligi",
    description: "Radyografik ilerleme yuzdesi (0% = Mine, 100% = D4 Pulpa)",
    min: 0,
    max: 100,
    step: 0.5,
    default: 50,
    unit: "%",
    labels: ["Mine", "D1", "D2", "D3", "D4"],
    sets: ["mine", "d1", "d2", "d3", "d4"],
    icon: "tooth",
  },
  {
    key: "yas",
    label: "Hasta Yasi",
    description: "Iyilesme potansiyeli degerlendirmesi",
    min: 6,
    max: 80,
    step: 1,
    default: 35,
    unit: "yas",
    labels: ["Cocuk", "Genc", "Orta", "Ileri"],
    sets: ["cocuk", "genc", "orta", "ileri"],
    icon: "user",
  },
];

function ToothSVG({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M32 4c-6 0-10 2-13 5s-5 8-5 14c0 4 1 8 2 12 1.5 5 3 10 3.5 14 .5 4 1.5 8 4 11 1.5 1.8 3.5 3 5.5 3s3-1 4-3c1.2-2.5 1.8-5.5 2-8h0c.2 2.5.8 5.5 2 8 1 2 2 3 4 3s4-1.2 5.5-3c2.5-3 3.5-7 4-11 .5-4 2-9 3.5-14 1-4 2-8 2-12 0-6-2-11-5-14S38 4 32 4z" />
    </svg>
  );
}

function SmileToothSVG({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M40 6c-7.5 0-12.5 2.5-16 6.25S18 22 18 29c0 5 1.25 10 2.5 15 1.875 6.25 3.75 12.5 4.375 17.5.625 5 1.875 10 5 13.75C31.75 77.5 34.25 79 37 79s3.75-1.25 5-3.75c1.5-3.125 2.25-6.875 2.5-10h0c.25 3.125 1 6.875 2.5 10C48.25 77.75 49.5 79 52 79s5.25-1.5 6.875-3.75c3.125-3.75 4.375-8.75 5-13.75.625-5 2.5-11.25 4.375-17.5C69.5 39 70.75 34 70.75 29c0-7.5-2.5-13.75-6.25-17.5S47.5 6 40 6z"
        fill="currentColor"
      />
      {/* Smile */}
      <path
        d="M30 34c0 0 4 8 10 8s10-8 10-8"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Eyes */}
      <circle cx="33" cy="27" r="2.5" fill="white" />
      <circle cx="47" cy="27" r="2.5" fill="white" />
    </svg>
  );
}

function SliderIcon({ type }: { type: string }) {
  switch (type) {
    case "shield":
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      );
    case "bolt":
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    case "tooth":
      return <ToothSVG className="w-5 h-5" />;
    case "user":
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
    default:
      return null;
  }
}

function getSeverityColor(severity: string) {
  switch (severity) {
    case "low":
      return {
        bg: "bg-emerald-50",
        border: "border-emerald-300",
        text: "text-emerald-700",
        bar: "bg-gradient-to-r from-emerald-400 to-emerald-500",
        icon: "text-emerald-500",
        badge: "bg-emerald-100 text-emerald-700",
      };
    case "medium":
      return {
        bg: "bg-amber-50",
        border: "border-amber-300",
        text: "text-amber-700",
        bar: "bg-gradient-to-r from-amber-400 to-amber-500",
        icon: "text-amber-500",
        badge: "bg-amber-100 text-amber-700",
      };
    case "high":
      return {
        bg: "bg-red-50",
        border: "border-red-300",
        text: "text-red-700",
        bar: "bg-gradient-to-r from-red-400 to-red-500",
        icon: "text-red-500",
        badge: "bg-red-100 text-red-700",
      };
    default:
      return {
        bg: "bg-gray-50",
        border: "border-gray-300",
        text: "text-gray-700",
        bar: "bg-gray-500",
        icon: "text-gray-500",
        badge: "bg-gray-100 text-gray-700",
      };
  }
}

function MembershipBadges({
  fuzzified,
  sets,
  labels,
}: {
  fuzzified: { [set: string]: number } | undefined;
  sets: string[];
  labels: string[];
}) {
  if (!fuzzified) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {sets.map((set, i) => {
        const val = fuzzified[set] ?? 0;
        if (val === 0) return null;
        return (
          <span
            key={set}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-100 text-sky-700 border border-sky-200"
          >
            {labels[i]}: {val.toFixed(2)}
          </span>
        );
      })}
    </div>
  );
}

function ResultIcon({ severity }: { severity: string }) {
  if (severity === "low") {
    return <SmileToothSVG className="w-16 h-16 text-emerald-400 float-animation mx-auto" />;
  }
  if (severity === "medium") {
    return <ToothSVG className="w-16 h-16 text-amber-400 float-animation mx-auto" />;
  }
  return <ToothSVG className="w-16 h-16 text-red-400 float-animation mx-auto" />;
}

export default function Home() {
  const [values, setValues] = useState<Record<string, number | null>>({
    tolerans: null,
    agri: null,
    curuk: null,
    yas: null,
  });
  const [result, setResult] = useState<PredictResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allFilled = SLIDER_CONFIG.every((cfg) => values[cfg.key] !== null);

  const handleSliderChange = (key: string, val: number) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  const handlePredict = async () => {
    if (!allFilled) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error(`API hatasi: ${res.status}`);
      const data: PredictResult = await res.json();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Baglanti hatasi");
    } finally {
      setLoading(false);
    }
  };

  const colors = result
    ? getSeverityColor(result.interpretation.severity)
    : null;

  return (
    <main className="flex-1 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <SmileToothSVG className="w-20 h-20 text-sky-400 float-animation" />
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">
            Bulanik Mantik Karar Destek
          </h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Hasta verilerini girerek Mamdani bulanik cikarim motoru ile
            tedavi onerisini goruntuleyebilirsiniz.
          </p>
        </div>

        {/* Input Card */}
        <div className="dental-card bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-sky-100/50 border border-sky-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-700 mb-5 flex items-center gap-2">
            <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 text-sky-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            Hasta Verileri
          </h2>

          <div className="space-y-6">
            {SLIDER_CONFIG.map((cfg) => {
              const val = values[cfg.key];
              const isEmpty = val === null;
              return (
              <div
                key={cfg.key}
                className={`p-4 rounded-xl bg-gradient-to-r from-sky-50/50 to-transparent border transition-colors ${
                  isEmpty ? "border-amber-200 hover:border-amber-300" : "border-sky-50 hover:border-sky-100"
                }`}
              >
                <div className="flex items-baseline justify-between mb-1">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <span className={isEmpty ? "text-amber-500" : "text-sky-500"}>
                      <SliderIcon type={cfg.icon} />
                    </span>
                    {cfg.label}
                    {isEmpty && (
                      <span className="text-[10px] text-amber-600 font-normal ml-1">
                        (deger giriniz)
                      </span>
                    )}
                  </label>
                  <span className={`text-lg font-bold ${isEmpty ? "text-slate-300" : "text-sky-600"}`}>
                    {isEmpty ? "—" : val.toFixed(cfg.step < 1 ? 1 : 0)}{" "}
                    <span className="text-xs text-slate-400 font-normal">
                      {cfg.unit}
                    </span>
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-3">{cfg.description}</p>
                <input
                  type="range"
                  min={cfg.min}
                  max={cfg.max}
                  step={cfg.step}
                  value={val ?? cfg.default}
                  onChange={(e) =>
                    handleSliderChange(cfg.key, parseFloat(e.target.value))
                  }
                  className={`w-full ${isEmpty ? "opacity-60" : ""}`}
                />
                <div className="flex justify-between mt-1">
                  {cfg.labels.map((l) => (
                    <span key={l} className="text-[10px] text-slate-400">
                      {l}
                    </span>
                  ))}
                </div>
                <MembershipBadges
                  fuzzified={result?.fuzzified[cfg.key]}
                  sets={cfg.sets}
                  labels={cfg.labels}
                />
              </div>
              );
            })}
          </div>

          <button
            onClick={handlePredict}
            disabled={loading || !allFilled}
            className="w-full mt-6 py-3.5 px-6 bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all cursor-pointer dental-btn-pulse flex items-center justify-center gap-2 shadow-lg shadow-sky-200/50"
          >
            <ToothSVG className="w-5 h-5" />
            {loading
              ? "Hesaplaniyor..."
              : !allFilled
                ? "Tum 4 alani doldurunuz"
                : "Analiz Et"}
          </button>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}
        </div>

        {/* Result Card */}
        {result && colors && (
          <div
            className={`animate-slide-up dental-card ${colors.bg} border-2 ${colors.border} rounded-2xl p-6 mb-6`}
          >
            <ResultIcon severity={result.interpretation.severity} />

            <div className="text-center mt-3 mb-4">
              <div className={`text-5xl font-bold ${colors.text} mb-1`}>
                %{result.crisp_output}
              </div>
              <div className="text-xs text-slate-500">
                Kanal Tedavisi Gereklilik Yuzdesi
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-white/60 rounded-full h-4 mb-4 overflow-hidden shadow-inner">
              <div
                className={`${colors.bar} h-4 rounded-full transition-all duration-700 ease-out`}
                style={{ width: `${result.crisp_output}%` }}
              />
            </div>

            {/* Scale labels */}
            <div className="flex justify-between text-[10px] text-slate-500 mb-4">
              <span className="flex items-center gap-1">
                <SmileToothSVG className="w-3.5 h-3.5 text-emerald-400" />
                %0 Dolgu
              </span>
              <span>%50 Sinirda</span>
              <span className="flex items-center gap-1">
                %100 Kanal
                <ToothSVG className="w-3.5 h-3.5 text-red-400" />
              </span>
            </div>

            {/* Interpretation */}
            <div
              className={`text-center text-lg font-semibold ${colors.text} mb-2 px-4 py-3 rounded-xl bg-white/50`}
            >
              {result.interpretation.message}
            </div>

            {result.interpretation.severity === "medium" && (
              <p className="text-center text-xs text-amber-600 mt-2 bg-amber-50/50 rounded-lg p-2">
                Hekim curugu temizlerken sinirin durumunu gozuyle gormeli,
                gerekirse kuafaj (sinir koruyucu tedavi) denemeli veya hasta ile
                ortak karar almalidir.
              </p>
            )}

            {/* Stats */}
            <div className="flex justify-center gap-4 mt-4">
              <span className="px-3 py-1.5 bg-white/60 rounded-full text-xs text-slate-500 border border-white">
                Ateslenen kural:{" "}
                <strong className="text-slate-700">
                  {result.fired_rules_count}
                </strong>{" "}
                / 240
              </span>
              <span className="px-3 py-1.5 bg-white/60 rounded-full text-xs text-slate-500 border border-white">
                Yontem: <strong className="text-slate-700">Mamdani</strong>
              </span>
              <span className="px-3 py-1.5 bg-white/60 rounded-full text-xs text-slate-500 border border-white">
                Durulastirma:{" "}
                <strong className="text-slate-700">Centroid</strong>
              </span>
            </div>
          </div>
        )}

        {/* Dominant Rule + Distribution */}
        {result && result.dominant_rule && (
          <div className="animate-slide-up dental-card bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-sky-100/50 border border-sky-100 p-6 mb-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <div className="w-6 h-6 bg-sky-100 rounded-md flex items-center justify-center">
                <svg className="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              Sonucu en cok belirleyen kural
            </h3>

            <div className="bg-gradient-to-r from-sky-50 to-cyan-50 rounded-xl p-4 border border-sky-100 mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-semibold text-sky-700 bg-white px-2 py-1 rounded-md border border-sky-200">
                  {result.dominant_rule.id}
                </span>
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                    result.dominant_rule.consequent_set === "dolgu"
                      ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                      : result.dominant_rule.consequent_set === "kanal"
                        ? "bg-red-100 text-red-700 border border-red-200"
                        : "bg-amber-100 text-amber-700 border border-amber-200"
                  }`}
                >
                  {result.dominant_rule.consequent_set.toUpperCase()}
                </span>
              </div>
              <div className="text-sm text-slate-700 mb-2">
                {formatAntecedent(result.dominant_rule.antecedent)}
              </div>
              <div className="text-xs text-slate-500">
                Atesleme gucu (w):{" "}
                <strong className="text-slate-700">
                  {result.dominant_rule.w.toFixed(3)}
                </strong>
              </div>
              {result.dominant_rule.aciklama && (
                <div className="mt-3 pt-3 border-t border-sky-100 text-xs text-slate-600 leading-relaxed">
                  {result.dominant_rule.aciklama}
                </div>
              )}
            </div>

            <h4 className="text-xs font-semibold text-slate-600 mb-3">
              Atesleme dagilimi (w-agirlikli)
            </h4>
            <div className="space-y-2">
              {(["dolgu", "belirsiz", "kanal"] as const).map((cat) => {
                const pct = result.distribution[cat];
                const color =
                  cat === "dolgu"
                    ? "from-emerald-400 to-emerald-500"
                    : cat === "kanal"
                      ? "from-red-400 to-red-500"
                      : "from-amber-400 to-amber-500";
                const text =
                  cat === "dolgu"
                    ? "text-emerald-700"
                    : cat === "kanal"
                      ? "text-red-700"
                      : "text-amber-700";
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className={`font-medium ${text}`}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </span>
                      <span className="text-slate-600 font-mono">
                        %{pct.toFixed(1)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`bg-gradient-to-r ${color} h-2 rounded-full transition-all duration-700 ease-out`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Fired Rules Detail */}
        {result && result.fired_rules.length > 0 && (
          <details className="animate-slide-up dental-card bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-sky-100/50 border border-sky-100 p-6 mb-6">
            <summary className="cursor-pointer text-sm font-semibold text-slate-700 select-none flex items-center gap-2">
              <div className="w-6 h-6 bg-sky-100 rounded-md flex items-center justify-center">
                <svg className="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </div>
              Ateslenen Kurallar ({result.fired_rules_count} kural)
            </summary>
            <div className="mt-4 max-h-80 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-sky-100">
                    <th className="pb-2 pr-4">Kural ID</th>
                    <th className="pb-2 pr-4">Antecedent</th>
                    <th className="pb-2 pr-4">w</th>
                    <th className="pb-2">Cikis</th>
                  </tr>
                </thead>
                <tbody>
                  {result.fired_rules
                    .sort((a, b) => b.w - a.w)
                    .map((rule) => (
                      <tr
                        key={rule.id}
                        className="border-b border-sky-50 hover:bg-sky-50/50 transition-colors"
                      >
                        <td className="py-2 pr-4 font-mono text-slate-600 align-top">{rule.id}</td>
                        <td className="py-2 pr-4 text-slate-600 align-top">
                          {formatAntecedent(rule.antecedent)}
                        </td>
                        <td className="py-2 pr-4 align-top">
                          <div className="flex items-center gap-2">
                            <div className="w-12 bg-sky-100 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-sky-400 to-cyan-400 h-2 rounded-full"
                                style={{ width: `${rule.w * 100}%` }}
                              />
                            </div>
                            <span className="text-slate-600">{rule.w.toFixed(2)}</span>
                          </div>
                        </td>
                        <td className="py-2 align-top">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              rule.consequent_set === "dolgu"
                                ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                : rule.consequent_set === "kanal"
                                  ? "bg-red-100 text-red-700 border border-red-200"
                                  : "bg-amber-100 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {rule.consequent_set.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </div>
    </main>
  );
}
