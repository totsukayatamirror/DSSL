import React, { useState } from "react";
import { Activity, Brain, Sparkles, Apple, Refrigerator } from "lucide-react";
import {LineChart,Line,Tooltip,XAxis,YAxis,ResponsiveContainer,CartesianGrid,} from "recharts";


function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);

  // core inputs
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("male");
  const [goal, setGoal] = useState("recomp");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [steps, setSteps] = useState("");
  const [sleepHours, setSleepHours] = useState("");
  const [eatingWindow, setEatingWindow] = useState("");

  // advanced metrics
  const [metaScore, setMetaScore] = useState(null);
  const [recoveryScore, setRecoveryScore] = useState(null);
  const [consistencyScore, setConsistencyScore] = useState(null);
  const [forecastDays, setForecastDays] = useState([]);
  const [forecastWeight, setForecastWeight] = useState([]);
  const [forecastBodyFat, setForecastBodyFat] = useState([]);
  const [keyNotes, setKeyNotes] = useState([]);

  const calcBMR = () => {
    if (!height || !weight || !age) return 0;
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseFloat(age);
    if (Number.isNaN(w) || Number.isNaN(h) || Number.isNaN(a)) return 0;
    return sex === "male"
      ? 88.36 + 13.4 * w + 4.8 * h - 5.7 * a
      : 447.6 + 9.2 * w + 3.1 * h - 4.3 * a;
  };

  const estimateBurn = () => {
    const s = parseInt((steps || "0").replace(/[^0-9]/g, ""), 10) || 0;
    const h = parseFloat(height) || 0;
    const wKg = parseFloat(weight) || 0;

    if (s === 0 || h === 0 || wKg === 0) return 0;

    const heightMeters = h / 100;
    const stride = heightMeters * 0.414;
    const distance = stride * s;
    const speed = stride / 0.55;
    const timeMinutes = distance / speed / 60;

    let MET = 2.5;
    if (speed < 1.3) MET = 2.0;
    else if (speed < 1.5) MET = 2.8;
    else if (speed < 1.7) MET = 3.5;
    else if (speed < 1.9) MET = 4.3;
    else MET = 5.0;

    const calories = (timeMinutes * MET * 3.5 * wKg) / 200;

    return Math.round(calories);
  };

  const bmrVal = Math.round(calcBMR());
  const burnedVal = estimateBurn();
  const tdeeVal = bmrVal + burnedVal;

  let recommendedCalories = tdeeVal;
  if (tdeeVal > 0) {
    if (goal === "cut") recommendedCalories = Math.round(tdeeVal * 0.8);
    else if (goal === "bulk") recommendedCalories = Math.round(tdeeVal * 1.12);
    else recommendedCalories = Math.round(tdeeVal * 0.94);
  }

  const handleOverviewAnalyze = () => {
    setLoading(true);

    const clamp = (v, min = 1, max = 10) =>
      Math.max(min, Math.min(max, Math.round(v)));

    const calInt = parseFloat(calories) || 0;
    const p = parseFloat(protein) || 0;
    const c = parseFloat(carbs) || 0;
    const f = parseFloat(fat) || 0;
    const wt = parseFloat(weight) || 0;
    const slp = parseFloat(sleepHours) || 0;
    const eatWin = parseFloat(eatingWindow) || 0;
    const stepsNum = parseFloat(steps) || 0;

    const totalMacros = p + c + f;
    const macroCals = { protein: p * 4, carbs: c * 4, fat: f * 9 };
    const totalMacroCals =
      macroCals.protein + macroCals.carbs + macroCals.fat || 1;

    const carbPct = macroCals.carbs / totalMacroCals;
    const fatPct = macroCals.fat / totalMacroCals;
    const protPct = macroCals.protein / totalMacroCals;

    // -------- 5 Score Engines --------
    const calcRandleScore = () => {
      if (!calInt || !totalMacros) return 5;
      let score = 7;
      if (carbPct > 0.35 && fatPct > 0.35) score -= 3;
      if (protPct > 0.2) score += 1;
      return clamp(score);
    };

    const calcFlexScore = () => {
      let score = 5;
      if (stepsNum > 10000) score += 2;
      if (stepsNum < 4000) score -= 2;
      return clamp(score);
    };

    const calcAbsorptionScore = () => {
      let score = 6;
      const proteinPerKg = wt ? p / wt : 0;
      if (proteinPerKg >= 1.6) score += 2;
      if (slp < 6) score -= 1;
      return clamp(score);
    };

    const calcMealTimingScore = () => {
      if (!eatWin) return 5;
      let score = 7;
      if (eatWin >= 9 && eatWin <= 13) score = 9;
      if (eatWin > 15) score = 3;
      return clamp(score);
    };

    const calcInsulinScore = () => {
      let score = 6;
      const carbsPerKg = wt ? c / wt : 0;
      if (carbsPerKg >= 3 && carbsPerKg <= 5) score += 2;
      if (slp < 6) score -= 2;
      return clamp(score);
    };

    const randleScore = calcRandleScore();
    const flexScore = calcFlexScore();
    const absorptionScore = calcAbsorptionScore();
    const timingScore = calcMealTimingScore();
    const insulinScore = calcInsulinScore();

    const MHI = clamp(
      (randleScore + flexScore + absorptionScore + timingScore + insulinScore) / 5
    );

    const calcRecoveryScore = () => {
      let score = 7;
      if (slp < 6) score -= 3;
      if (slp >= 7) score += 1;
      return clamp(score);
    };

    const calcConsistencyScore = () => {
      let score = 5;
      if (wt > 0 && p > 0) {
        const target = wt * 1.6;
        const diff = Math.abs(p - target) / target;
        if (diff < 0.1) score += 2;
      }
      return clamp(score);
    };

    const recScore = calcRecoveryScore();
    const consScore = calcConsistencyScore();

    const daysArr = Array.from({ length: 7 }, (_, i) => `Day ${i + 1}`);
    const weightStart = wt || 0;
    const dailyDeltaKg =
      recommendedCalories > 0 ? (calInt - recommendedCalories) / 7700 : 0;

    const wArr = daysArr.map((_, idx) =>
      +(weightStart + dailyDeltaKg * (idx + 1)).toFixed(1)
    );

    const baseBF = sex === "male" ? 15 : 24;
    const bfArr = daysArr.map((_, idx) =>
      +(baseBF + dailyDeltaKg * (idx + 1) * 8).toFixed(1)
    );

    const notes = [];
    if (calInt > recommendedCalories)
      notes.push("You ate above goal; expect slight upward weight drift.");
    if (calInt < recommendedCalories)
      notes.push("You ate below goal; expect small fat loss.");
    if (slp < 6) notes.push("Sleep is low—hurts hormones, recovery, appetite.");

    setMetaScore(MHI);
    setRecoveryScore(recScore);
    setConsistencyScore(consScore);
    setForecastDays(daysArr);
    setForecastWeight(wArr);
    setForecastBodyFat(bfArr);
    setKeyNotes(notes);

    setLoading(false);
  };

  // -------- Micronutrient Table --------
  const getMicronutrientRecs = () => {
    const a = parseFloat(age) || 20;
    const s = sex === "female" ? "female" : "male";

    const ageGroup =
      a < 9
        ? "child"
        : a < 14
        ? "young_teen"
        : a < 19
        ? "teen"
        : a < 31
        ? "young_adult"
        : a < 51
        ? "adult"
        : "senior";

    const data = [
      {
        nutrient: "Vitamin D",
        unit: "IU/day",
        male: { child: 600, young_teen: 600, teen: 600, young_adult: 600, adult: 600, senior: 800 },
        female: { child: 600, young_teen: 600, teen: 600, young_adult: 600, adult: 600, senior: 800 },
        why: "Bone, hormone, and immune support.",
      },
      {
        nutrient: "Calcium",
        unit: "mg/day",
        male: { child: 1000, young_teen: 1300, teen: 1300, young_adult: 1000, adult: 1000, senior: 1200 },
        female: { child: 1000, young_teen: 1300, teen: 1300, young_adult: 1000, adult: 1000, senior: 1200 },
        why: "Bones, teeth, nerve conduction.",
      },
      {
        nutrient: "Magnesium",
        unit: "mg/day",
        male: { child: 240, young_teen: 410, teen: 410, young_adult: 400, adult: 400, senior: 420 },
        female: { child: 240, young_teen: 360, teen: 360, young_adult: 310, adult: 310, senior: 320 },
        why: "Muscle function, ATP, sleep.",
      },
      {
        nutrient: "Zinc",
        unit: "mg/day",
        male: { child: 8, young_teen: 11, teen: 11, young_adult: 11, adult: 11, senior: 11 },
        female: { child: 8, young_teen: 9, teen: 9, young_adult: 8, adult: 8, senior: 8 },
        why: "Hormones, immune system, recovery.",
      },
      {
        nutrient: "Iron",
        unit: "mg/day",
        male: { child: 8, young_teen: 11, teen: 11, young_adult: 8, adult: 8, senior: 8 },
        female: { child: 8, young_teen: 15, teen: 15, young_adult: 18, adult: 18, senior: 8 },
        why: "Oxygen transport, fatigue prevention.",
      },
      {
        nutrient: "Potassium",
        unit: "mg/day",
        male: { child: 2300, young_teen: 2500, teen: 3000, young_adult: 3400, adult: 3400, senior: 3400 },
        female: { child: 2300, young_teen: 2300, teen: 2600, young_adult: 2600, adult: 2600, senior: 2600 },
        why: "Nervous system & blood pressure.",
      },
      {
        nutrient: "Fiber",
        unit: "g/day",
        male: { child: 25, young_teen: 30, teen: 30, young_adult: 30, adult: 30, senior: 28 },
        female: { child: 22, young_teen: 25, teen: 25, young_adult: 25, adult: 25, senior: 22 },
        why: "Gut health, digestion, hunger control.",
      },
    ];

    return data.map((item) => {
      const target = item[s][ageGroup];
      return {
        nutrient: item.nutrient,
        target: `${target} ${item.unit}`,
        why: item.why,
      };
    });
  };

  const micros = getMicronutrientRecs();

  // -------- UI styling --------
  const card = {
    background: "white",
    padding: 20,
    borderRadius: 18,
    marginTop: 16,
    boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
  };

  const chip = (key, label) => (
    <button
      key={key}
      onClick={() => setActiveTab(key)}
      style={{
        padding: "8px 14px",
        marginRight: 8,
        borderRadius: 999,
        border: "none",
        fontSize: 13,
        cursor: "pointer",
        background: activeTab === key ? "#2563eb" : "#e5e7eb",
        color: activeTab === key ? "white" : "#111827",
      }}
    >
      {label}
    </button>
  );


const ForecastChart = () => {
  if (!forecastDays.length) return null;

  // Build data array for Recharts
  const data = forecastDays.map((day, i) => ({
    day,
    weight: forecastWeight[i],
  }));

  return (
    <div style={{ width: "100%", height: 180 }}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <defs>
            <linearGradient id="weightLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />

          <XAxis
            dataKey="day"
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />

          <YAxis
            tick={{ fontSize: 12 }}
            width={30}
            axisLine={false}
            tickLine={false}
            domain={["auto", "auto"]}
          />

          <Tooltip
            contentStyle={{
              background: "white",
              borderRadius: 10,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              border: "none",
            }}
            labelStyle={{ fontWeight: 600 }}
            formatter={(value) => [`${value} kg`, "Weight"]}
          />

          <Line
            type="monotone"
            dataKey="weight"
            stroke="url(#weightLine)"
            strokeWidth={3}
            dot={{ r: 4, fill: "#4f46e5" }}
            activeDot={{ r: 7, stroke: "#22c55e", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

  const ScoreGauge = ({ label, score, color }) => {
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const pct = Math.max(0, Math.min(100, (score ?? 0) * 10));
    const offset = circumference * (1 - pct / 100);
    return (
      <div style={{ textAlign: "center" }}>
        <svg width="110" height="110">
          <circle cx="55" cy="55" r={radius} stroke="#e5e7eb" strokeWidth="8" fill="none" />
          <circle
            cx="55"
            cy="55"
            r={radius}
            stroke={color}
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
          <text
            x="55"
            y="58"
            textAnchor="middle"
            fontSize="18"
            fontWeight="600"
            fill="#111827"
          >
            {score ?? "--"}
          </text>
        </svg>
        <div style={{ fontSize: 12, color: "#4b5563", marginTop: 4 }}>{label}</div>
      </div>
    );
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at top, #eef2ff 0, #f9fafb 40%, #f3f4f6 100%)",
        padding: 20,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <header style={{ marginBottom: 16 }}>
        <h1
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 26,
            fontWeight: 800,
          }}
        >
          <Activity size={22} />
          Zenith
        </h1>
        <p style={{ fontSize: 13, color: "#6b7280" }}>
          An app to optimize your metabolic health.

        A DSSL subsidiary
        </p>
      </header>

      <div style={{ marginBottom: 10 }}>
        {chip("overview", "Metabolic Overview")}
        {chip("micros", "Micronutrient Targets")}
      </div>

      {/* ---------- Core Stats ---------- */}
      <div style={card}>
        <h2 style={{ fontSize: 15, marginBottom: 10 }}>
          <Brain size={16} style={{ marginRight: 6 }} />
          Core Stats
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))",
            gap: 10,
          }}
        >
          <div>
            <label>Height (cm)</label>
            <input value={height} onChange={(e) => setHeight(e.target.value)} style={{
              width: "100%", padding: 6, borderRadius: 8, border: "1px solid #d1d5db"
            }} />
          </div>

          <div>
            <label>Weight (kg)</label>
            <input value={weight} onChange={(e) => setWeight(e.target.value)} style={{
              width: "100%", padding: 6, borderRadius: 8, border: "1px solid #d1d5db"
            }} />
          </div>

          <div>
            <label>Age</label>
            <input value={age} onChange={(e) => setAge(e.target.value)} style={{
              width: "100%", padding: 6, borderRadius: 8, border: "1px solid #d1d5db"
            }} />
          </div>

          <div>
            <label>Sex</label>
            <select value={sex} onChange={(e) => setSex(e.target.value)} style={{
              width: "100%", padding: 6, borderRadius: 8, border: "1px solid #d1d5db"
            }}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>

          <div>
            <label>Goal</label>
            <select value={goal} onChange={(e) => setGoal(e.target.value)} style={{
              width: "100%", padding: 6, borderRadius: 8, border: "1px solid #d1d5db"
            }}>
              <option value="cut">Cut</option>
              <option value="bulk">Bulk</option>
              <option value="recomp">Recomp</option>
            </select>
          </div>
        </div>

        <p style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>
          BMR est: <strong>{bmrVal || "--"}</strong> kcal · Activity est:{" "}
          <strong>{burnedVal || 0}</strong> kcal
        </p>
        <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
          Recommended calories for <strong>{goal}</strong>:{" "}
          <strong>{recommendedCalories || "--"}</strong> kcal/day
        </p>
      </div>

      {/* ---------- Overview ---------- */}
      {activeTab === "overview" && (
        <div style={card}>
          <h2 style={{ fontSize: 16, marginBottom: 10 }}>
            <Sparkles size={16} style={{ marginRight: 6 }} />
            Metabolic Scores & Forecast
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <input placeholder="Calories today" value={calories} onChange={(e) => setCalories(e.target.value)} style={{ padding: 6, borderRadius: 8, border: "1px solid #d1d5db" }} />
            <input placeholder="Protein (g)" value={protein} onChange={(e) => setProtein(e.target.value)} style={{ padding: 6, borderRadius: 8, border: "1px solid #d1d5db" }} />
            <input placeholder="Carbs (g)" value={carbs} onChange={(e) => setCarbs(e.target.value)} style={{ padding: 6, borderRadius: 8, border: "1px solid #d1d5db" }} />
            <input placeholder="Fat (g)" value={fat} onChange={(e) => setFat(e.target.value)} style={{ padding: 6, borderRadius: 8, border: "1px solid #d1d5db" }} />
            <input placeholder="Steps" value={steps} onChange={(e) => setSteps(e.target.value)} style={{ padding: 6, borderRadius: 8, border: "1px solid #d1d5db" }} />
            <input placeholder="Sleep hours" value={sleepHours} onChange={(e) => setSleepHours(e.target.value)} style={{ padding: 6, borderRadius: 8, border: "1px solid #d1d5db" }} />
            <input placeholder="Eating window (hours)" value={eatingWindow} onChange={(e) => setEatingWindow(e.target.value)} style={{ padding: 6, borderRadius: 8, border: "1px solid #d1d5db" }} />
          </div>

          <button
            onClick={handleOverviewAnalyze}
            disabled={loading}
            style={{
              padding: "8px 16px",
              borderRadius: 999,
              border: "none",
              background: "#2563eb",
              color: "white",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            {loading ? "Analyzing..." : "Analyze day"}
          </button>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
              gap: 16,
              marginTop: 18,
              alignItems: "center",
            }}
          >
            <ScoreGauge label="Metabolic Health" score={metaScore} color="#22c55e" />
            <ScoreGauge label="Recovery" score={recoveryScore} color="#0ea5e9" />
            <ScoreGauge label="Consistency" score={consistencyScore} color="#f97316" />

            <div>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                7-day weight forecast
              </div>
              <ForecastChart />
            </div>
          </div>

          {keyNotes.length > 0 && (
            <ul style={{ marginTop: 12, fontSize: 13, color: "#111827" }}>
              {keyNotes.map((n, i) => (
                <li key={i} style={{ marginBottom: 4 }}>
                  • {n}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ---------- Micronutrients ---------- */}
      {activeTab === "micros" && (
        <div style={card}>
          <h2 style={{ fontSize: 16, marginBottom: 10 }}>
            <Refrigerator size={16} style={{ marginRight: 6 }} />
            Micronutrient Targets
          </h2>

          <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
            Based on age and sex. These are daily targets.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
              gap: 12,
              marginTop: 8,
            }}
          >
            {micros.map((m) => (
              <div
                key={m.nutrient}
                style={{
                  borderRadius: 14,
                  border: "1px solid #e5e7eb",
                  padding: 10,
                  background: "#f9fafb",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
                  {m.nutrient}
                </div>
                <div style={{ fontSize: 12, color: "#374151", marginBottom: 4 }}>
                  <strong>{m.target}</strong>
                </div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>{m.why}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
