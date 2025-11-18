import React, { useState } from "react";
import { Activity, Brain, Sparkles, Apple, Refrigerator } from "lucide-react";

function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const [output, setOutput] = useState("Fill in your stats and hit Analyze.");
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
  const [workout, setWorkout] = useState("");
  const [sleepHours, setSleepHours] = useState("");
  const [eatingWindow, setEatingWindow] = useState("");

  // advanced metrics for dashboard
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
    const h = parseFloat(height) || 0; // cm
    const wKg = parseFloat(weight) || 0; // kg

    if (s === 0 || h === 0 || wKg === 0) return 0;

    // 1. Stride length (meters)
    const heightMeters = h / 100;
    const stride = heightMeters * 0.414;

    // 2. Distance walked (meters)
    const distance = stride * s;

    // 3. Speed estimate (meters/second)
    const speed = stride / 0.55; // biomechanical estimate

    // 4. Time walked (minutes)
    const timeMinutes = distance / speed / 60;

    // 5. Determine MET from speed
    let MET = 2.5;
    if (speed < 1.3) MET = 2.0;
    else if (speed < 1.5) MET = 2.8;
    else if (speed < 1.7) MET = 3.5;
    else if (speed < 1.9) MET = 4.3;
    else MET = 5.0;

    // 6. Final ACSM calorie burn formula
    const calories = (timeMinutes * MET * 3.5 * wKg) / 200;

    return Math.round(calories);
  };

  // derived values for UI
  const bmrVal = Math.round(calcBMR());
  const burnedVal = estimateBurn();
  const tdeeVal = bmrVal + burnedVal;

  let recommendedCalories = tdeeVal;
  if (tdeeVal > 0) {
    if (goal === "cut") {
      // 20% deficit
      recommendedCalories = Math.round(tdeeVal * 0.8);
    } else if (goal === "bulk") {
      // 12% surplus
      recommendedCalories = Math.round(tdeeVal * 1.12);
    } else if (goal === "recomp") {
      // mild deficit
      recommendedCalories = Math.round(tdeeVal * 0.94);
    }
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
    const stepsNum =
      parseFloat((steps || "").replace(/[^0-9.]/g, "")) || 0;

    const totalMacros = p + c + f;
    const macroCals = {
      protein: p * 4,
      carbs: c * 4,
      fat: f * 9,
    };
    const totalMacroCals =
      macroCals.protein + macroCals.carbs + macroCals.fat || 1;

    const carbPct = macroCals.carbs / totalMacroCals;
    const fatPct = macroCals.fat / totalMacroCals;
    const protPct = macroCals.protein / totalMacroCals;

    // ---------- Engine 1: Randle Cycle (carb/fat mix) ----------
    const calcRandleScore = () => {
      if (!calInt || !totalMacros) return 5;
      let score = 7;

      // heavy mixed carb+fat meals → Randle stress
      if (carbPct > 0.35 && fatPct > 0.35) score -= 3;
      if (carbPct > 0.5 && fatPct > 0.3) score -= 1; // very mixed

      // high protein buffers things
      if (protPct > 0.2) score += 1;

      // cleaner split fuels
      if (carbPct > 0.5 && fatPct < 0.3) score += 1;
      if (fatPct > 0.5 && carbPct < 0.3) score += 1;

      return clamp(score);
    };

    // ---------- Engine 2: Metabolic Flexibility ----------
    const calcFlexScore = () => {
      let score = 5;

      if (stepsNum > 10000) score += 2;
      else if (stepsNum < 4000) score -= 2;

      const w = (workout || "").toLowerCase();
      if (w.includes("run") || w.includes("interval"))
        score += 2;
      else if (w.includes("lift") || w.includes("weight"))
        score += 1;

      if (recommendedCalories > 0 && calInt > 0) {
        const diffRatio = Math.abs(calInt - recommendedCalories) /
          recommendedCalories;
        if (diffRatio < 0.1) score += 1;
        else if (diffRatio > 0.3) score -= 1;
      }

      return clamp(score);
    };

    // ---------- Engine 3: Micronutrient Absorption Proxy ----------
    const calcAbsorptionScore = () => {
      if (!calInt) return 5;
      let score = 6;

      const proteinPerKg = wt ? p / wt : 0;
      if (proteinPerKg >= 1.6) score += 2;
      else if (proteinPerKg < 0.8) score -= 2;

      // very sugar-heavy → likely lower micronutrient density
      if (carbPct > 0.6 && fatPct < 0.2) score -= 1;

      if (slp >= 7 && slp <= 9) score += 1;
      else if (slp < 6) score -= 1;

      return clamp(score);
    };

    // ---------- Engine 4: Meal Timing ----------
    const calcMealTimingScore = () => {
      if (!eatWin || eatWin <= 0) return 5;
      let score = 7;

      if (eatWin >= 9 && eatWin <= 13) score = 9;
      else if (eatWin >= 7 && eatWin < 9) score = 8;
      else if (eatWin > 13 && eatWin <= 15) score = 6;
      else if (eatWin > 15) score = 3;
      else if (eatWin < 7 && eatWin >= 5) score = 7;
      else if (eatWin < 5) score = 5;

      // very late eating + low sleep hurts timing
      if (slp < 6 && eatWin > 14) score -= 1;

      return clamp(score);
    };

    // ---------- Engine 5: Insulin Sensitivity Proxy ----------
    const calcInsulinScore = () => {
      let score = 6;

      const carbsPerKg = wt ? c / wt : 0;

      if (carbsPerKg >= 3 && carbsPerKg <= 5) score += 2;
      else if (carbsPerKg > 6) score -= 2;
      else if (carbsPerKg < 2) score -= 1; // maybe under-fueling carbs

      if (stepsNum > 10000) score += 1;
      else if (stepsNum < 4000) score -= 1;

      if (slp < 6) score -= 2;
      else if (slp >= 8) score += 1;

      return clamp(score);
    };

    const randleScore = calcRandleScore();
    const flexScore = calcFlexScore();
    const absorptionScore = calcAbsorptionScore();
    const timingScore = calcMealTimingScore();
    const insulinScore = calcInsulinScore();

    const MHI = clamp(
      (randleScore +
        flexScore +
        absorptionScore +
        timingScore +
        insulinScore) /
        5
    );

    // ---------- Recovery Score ----------
    const calcRecoveryScore = () => {
      let score = 7;
      if (slp < 6) score -= 3;
      else if (slp >= 7 && slp <= 9) score += 1;

      if (burnedVal > 800 && slp < 7) score -= 1;
      if (burnedVal < 300 && slp >= 7) score += 1;

      return clamp(score);
    };

    // ---------- Consistency Score ----------
    const calcConsistencyScore = () => {
      let score = 5;

      if (recommendedCalories > 0 && calInt > 0) {
        const diffRatio = Math.abs(calInt - recommendedCalories) /
          recommendedCalories;
        if (diffRatio < 0.05) score += 3;
        else if (diffRatio < 0.15) score += 1;
        else if (diffRatio > 0.3) score -= 2;
      }

      const proteinTarget = wt ? wt * 1.6 : 0;
      if (proteinTarget && p > 0) {
        const protDiff = Math.abs(p - proteinTarget) / proteinTarget;
        if (protDiff < 0.1) score += 2;
        else if (protDiff > 0.3) score -= 2;
      }

      return clamp(score);
    };

    const recScore = calcRecoveryScore();
    const consScore = calcConsistencyScore();

    // ---------- Simple 7-Day Forecast ----------
    const daysArr = Array.from({ length: 7 }, (_, i) => `Day ${i + 1}`);
    const weightStart = wt || 0;
    const dailyDeltaKg =
      recommendedCalories > 0
        ? (calInt - recommendedCalories) / 7700
        : 0;

    const wArr = daysArr.map((_, idx) =>
      +(weightStart + dailyDeltaKg * (idx + 1)).toFixed(1)
    );

    const baseBF = sex === "male" ? 15 : 24;
    const bfArr = daysArr.map((_, idx) =>
      +(
        baseBF +
        dailyDeltaKg * (idx + 1) * 8 // tiny change scaled up for visibility
      ).toFixed(1)
    );

    // ---------- Key Notes ----------
    const notes = [];

    if (calInt && recommendedCalories) {
      const diffRatio = Math.abs(calInt - recommendedCalories) /
        recommendedCalories;
      if (diffRatio < 0.1)
        notes.push("You were very close to your calorie target today.");
      else if (calInt > recommendedCalories)
        notes.push(
          "You ate above your target; repeated days like this lead to slow weight gain."
        );
      else
        notes.push(
          "You ate below your target; useful for cutting, but monitor recovery and energy."
        );
    }

    const proteinTarget = wt ? wt * 1.6 : 0;
    if (proteinTarget && p) {
      if (p >= proteinTarget * 0.9 && p <= proteinTarget * 1.1)
        notes.push("Protein intake is right in the sweet spot for muscle.");
      else if (p < proteinTarget * 0.7)
        notes.push("Protein seems low for optimal recovery and muscle gain.");
    }

    if (stepsNum > 10000)
      notes.push("Great movement today – step count supports insulin health.");
    else if (stepsNum < 4000)
      notes.push("Very low movement today; even short walks would help a lot.");

    if (slp < 6)
      notes.push("Short sleep weakens recovery and carb handling. Aim for 7–9h.");

    if (eatWin && eatWin > 15)
      notes.push("Your eating window is very long; try compressing it slightly.");

    setMetaScore(MHI);
    setRecoveryScore(recScore);
    setConsistencyScore(consScore);
    setForecastDays(daysArr);
    setForecastWeight(wArr);
    setForecastBodyFat(bfArr);
    setKeyNotes(notes);

    const summary = {
      metabolic_health_index: MHI,
      sub_scores: {
        randle_cycle: randleScore,
        metabolic_flexibility: flexScore,
        micronutrient_absorption_proxy: absorptionScore,
        meal_timing: timingScore,
        insulin_sensitivity_proxy: insulinScore,
      },
      recovery_score: recScore,
      consistency_score: consScore,
      energy: {
        BMR: bmrVal,
        activity_burn_estimate: burnedVal,
        TDEE_estimate: tdeeVal,
        recommended_calories_for_goal: recommendedCalories,
        actual_calories: calInt,
      },
      forecast: {
        days: daysArr,
        weight_kg: wArr,
        body_fat_percent: bfArr,
      },
      notes,
    };

    setOutput(JSON.stringify(summary, null, 2));
    setLoading(false);
  };

  // ---------- Micronutrient Recommendations (non-AI) ----------
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
        values: {
          male: {
            child: 600,
            young_teen: 600,
            teen: 600,
            young_adult: 600,
            adult: 600,
            senior: 800,
          },
          female: {
            child: 600,
            young_teen: 600,
            teen: 600,
            young_adult: 600,
            adult: 600,
            senior: 800,
          },
        },
        why: "Supports bones, hormones, and immune system.",
      },
      {
        nutrient: "Calcium",
        unit: "mg/day",
        values: {
          male: {
            child: 1000,
            young_teen: 1300,
            teen: 1300,
            young_adult: 1000,
            adult: 1000,
            senior: 1200,
          },
          female: {
            child: 1000,
            young_teen: 1300,
            teen: 1300,
            young_adult: 1000,
            adult: 1000,
            senior: 1200,
          },
        },
        why: "Key for bones, teeth, and muscle contraction.",
      },
      {
        nutrient: "Magnesium",
        unit: "mg/day",
        values: {
          male: {
            child: 240,
            young_teen: 410,
            teen: 410,
            young_adult: 400,
            adult: 400,
            senior: 420,
          },
          female: {
            child: 240,
            young_teen: 360,
            teen: 360,
            young_adult: 310,
            adult: 310,
            senior: 320,
          },
        },
        why: "Helps muscle function, sleep quality, and energy.",
      },
      {
        nutrient: "Zinc",
        unit: "mg/day",
        values: {
          male: {
            child: 8,
            young_teen: 11,
            teen: 11,
            young_adult: 11,
            adult: 11,
            senior: 11,
          },
          female: {
            child: 8,
            young_teen: 9,
            teen: 9,
            young_adult: 8,
            adult: 8,
            senior: 8,
          },
        },
        why: "Supports hormones, immune health, and recovery.",
      },
      {
        nutrient: "Iron",
        unit: "mg/day",
        values: {
          male: {
            child: 8,
            young_teen: 11,
            teen: 11,
            young_adult: 8,
            adult: 8,
            senior: 8,
          },
          female: {
            child: 8,
            young_teen: 15,
            teen: 15,
            young_adult: 18,
            adult: 18,
            senior: 8,
          },
        },
        why: "Needed for oxygen delivery and avoiding fatigue.",
      },
      {
        nutrient: "Potassium",
        unit: "mg/day",
        values: {
          male: {
            child: 2300,
            young_teen: 2500,
            teen: 3000,
            young_adult: 3400,
            adult: 3400,
            senior: 3400,
          },
          female: {
            child: 2300,
            young_teen: 2300,
            teen: 2600,
            young_adult: 2600,
            adult: 2600,
            senior: 2600,
          },
        },
        why: "Supports blood pressure, nerve function, and muscle.",
      },
      {
        nutrient: "Omega-3 (EPA+DHA)",
        unit: "mg/day",
        values: {
          male: {
            child: 250,
            young_teen: 250,
            teen: 250,
            young_adult: 250,
            adult: 250,
            senior: 250,
          },
          female: {
            child: 250,
            young_teen: 250,
            teen: 250,
            young_adult: 250,
            adult: 250,
            senior: 250,
          },
        },
        why: "Brain health, inflammation control, and heart health.",
      },
      {
        nutrient: "Fiber",
        unit: "g/day",
        values: {
          male: {
            child: 25,
            young_teen: 30,
            teen: 30,
            young_adult: 30,
            adult: 30,
            senior: 28,
          },
          female: {
            child: 22,
            young_teen: 25,
            teen: 25,
            young_adult: 25,
            adult: 25,
            senior: 22,
          },
        },
        why: "Gut health, stable blood sugar, and fullness.",
      },
    ];

    return data.map((item) => {
      const val = item.values[s][ageGroup];
      return {
        nutrient: item.nutrient,
        target: `${val} ${item.unit}`,
        why: item.why,
      };
    });
  };

  const micros = getMicronutrientRecs();

  // ---------- UI helpers ----------
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
    const w = 260;
    const h = 80;
    const weights = forecastWeight;
    const minW = Math.min(...weights);
    const maxW = Math.max(...weights);
    const span = maxW - minW || 1;
    const points = weights
      .map((val, i) => {
        const x =
          (i / (weights.length - 1 || 1)) * (w - 20) + 10;
        const y = h - ((val - minW) / span) * (h - 20) - 10;
        return `${x},${y}`;
      })
      .join(" ");

    return (
      <svg width={w} height={h}>
        <defs>
          <linearGradient id="grad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#4f46e5" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
        <polyline
          points={points}
          fill="none"
          stroke="url(#grad)"
          strokeWidth="3"
          style={{
            filter:
              "drop-shadow(0 4px 6px rgba(15,23,42,0.15))",
          }}
        />
      </svg>
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
          <circle
            cx="55"
            cy="55"
            r={radius}
            stroke="#e5e7eb"
            strokeWidth="8"
            fill="none"
          />
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
            style={{ transition: "stroke-dashoffset 0.6s ease-out" }}
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
        <div
          style={{
            fontSize: 12,
            color: "#4b5563",
            marginTop: 4,
          }}
        >
          {label}
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #eef2ff 0, #f9fafb 40%, #f3f4f6 100%)",
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
          DSSL: Daily steps saves lives
        </h1>
        <p style={{ fontSize: 13, color: "#6b7280" }}>
          A DSLcorp subsidiary
        </p>
      </header>

      <div style={{ marginBottom: 10 }}>
        {chip("overview", "Metabolic Overview")}
        {chip("micros", "Micronutrient Targets")}
      </div>

      {/* core stats card */}
      <div style={card}>
        <h2 style={{ fontSize: 15, marginBottom: 10 }}>
          <Brain size={16} style={{ marginRight: 6 }} />
          Core Stats
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(130px,1fr))",
            gap: 10,
          }}
        >
          <div>
            <label>Height (cm)</label>
            <input
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              style={{
                width: "100%",
                padding: 6,
                borderRadius: 8,
                border: "1px solid #d1d5db",
              }}
            />
          </div>
          <div>
            <label>Weight (kg)</label>
            <input
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              style={{
                width: "100%",
                padding: 6,
                borderRadius: 8,
                border: "1px solid #d1d5db",
              }}
            />
          </div>
          <div>
            <label>Age</label>
            <input
              value={age}
              onChange={(e) => setAge(e.target.value)}
              style={{
                width: "100%",
                padding: 6,
                borderRadius: 8,
                border: "1px solid #d1d5db",
              }}
            />
          </div>
          <div>
            <label>Sex</label>
            <select
              value={sex}
              onChange={(e) => setSex(e.target.value)}
              style={{
                width: "100%",
                padding: 6,
                borderRadius: 8,
                border: "1px solid #d1d5db",
              }}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div>
            <label>Goal</label>
            <select
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              style={{
                width: "100%",
                padding: 6,
                borderRadius: 8,
                border: "1px solid #d1d5db",
              }}
            >
              <option value="cut">Cut</option>
              <option value="bulk">Bulk</option>
              <option value="recomp">Recomp</option>
            </select>
          </div>
        </div>
        <p
          style={{
            fontSize: 12,
            color: "#6b7280",
            marginTop: 8,
          }}
        >
          BMR est: <strong>{bmrVal || "--"}</strong> kcal · Activity
          est: <strong>{burnedVal || 0}</strong> kcal
        </p>
        <p
          style={{
            fontSize: 12,
            color: "#6b7280",
            marginTop: 4,
          }}
        >
          Recommended calories for{" "}
          <strong>{goal}</strong>:{" "}
          <strong>
            {recommendedCalories && recommendedCalories > 0
              ? recommendedCalories
              : "--"}
          </strong>{" "}
          kcal/day
        </p>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <div style={card}>
          <h2 style={{ fontSize: 16, marginBottom: 10 }}>
            <Sparkles size={16} style={{ marginRight: 6 }} />
            Metabolic Scores & Forecast
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(130px,1fr))",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <input
              placeholder="Calories today"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              style={{
                padding: 6,
                borderRadius: 8,
                border: "1px solid #d1d5db",
              }}
            />
            <input
              placeholder="Protein (g)"
              value={protein}
              onChange={(e) => setProtein(e.target.value)}
              style={{
                padding: 6,
                borderRadius: 8,
                border: "1px solid #d1d5db",
              }}
            />
            <input
              placeholder="Carbs (g)"
              value={carbs}
              onChange={(e) => setCarbs(e.target.value)}
              style={{
                padding: 6,
                borderRadius: 8,
                border: "1px solid #d1d5db",
              }}
            />
            <input
              placeholder="Fat (g)"
              value={fat}
              onChange={(e) => setFat(e.target.value)}
              style={{
                padding: 6,
                borderRadius: 8,
                border: "1px solid #d1d5db",
              }}
            />
            <input
              placeholder="Steps"
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              style={{
                padding: 6,
                borderRadius: 8,
                border: "1px solid #d1d5db",
              }}
            />

            <input
              placeholder="Sleep hours"
              value={sleepHours}
              onChange={(e) => setSleepHours(e.target.value)}
              style={{
                padding: 6,
                borderRadius: 8,
                border: "1px solid #d1d5db",
              }}
            />
            <input
              placeholder="Eating window (hours)"
              value={eatingWindow}
              onChange={(e) => setEatingWindow(e.target.value)}
              style={{
                padding: 6,
                borderRadius: 8,
                border: "1px solid #d1d5db",
              }}
            />
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
              gridTemplateColumns:
                "repeat(auto-fit,minmax(150px,1fr))",
              gap: 16,
              marginTop: 18,
              alignItems: "center",
            }}
          >
            <ScoreGauge
              label="Metabolic Health Index"
              score={metaScore}
              color="#22c55e"
            />
            <ScoreGauge
              label="Recovery"
              score={recoveryScore}
              color="#0ea5e9"
            />
            <ScoreGauge
              label="Consistency"
              score={consistencyScore}
              color="#f97316"
            />
            <div>
              <div
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                  marginBottom: 4,
                }}
              >
                7-day weight forecast
              </div>
              <ForecastChart />
            </div>
          </div>

          {keyNotes.length > 0 && (
            <ul
              style={{
                marginTop: 12,
                fontSize: 13,
                color: "#111827",
              }}
            >
              {keyNotes.map((n, i) => (
                <li key={i} style={{ marginBottom: 4 }}>
                  • {n}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* MICRONUTRIENT TARGETS TAB */}
      {activeTab === "micros" && (
        <div style={card}>
          <h2 style={{ fontSize: 16, marginBottom: 10 }}>
            <Refrigerator size={16} style={{ marginRight: 6 }} />
            Micronutrient Targets for You
          </h2>
          <p
            style={{
              fontSize: 12,
              color: "#6b7280",
              marginBottom: 8,
            }}
          >
            Based on your age and sex, these are{" "}
            <strong>daily target ranges</strong> for key
            vitamins and minerals. Use this as a baseline,
            not a medical diagnosis.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(180px,1fr))",
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
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 2,
                  }}
                >
                  {m.nutrient}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#374151",
                    marginBottom: 4,
                  }}
                >
                  Target: <strong>{m.target}</strong>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#6b7280",
                  }}
                >
                  {m.why}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RAW OUTPUT / DEBUG */}
      <div style={{ ...card, marginBottom: 30 }}>
        <h3
          style={{
            fontSize: 14,
            marginBottom: 6,
          }}
        >
          Internal Metrics (debug view)
        </h3>
        <pre
          style={{
            whiteSpace: "pre-wrap",
            fontSize: 12,
            background: "#f9fafb",
            padding: 10,
            borderRadius: 12,
            maxHeight: 280,
            overflow: "auto",
          }}
        >
          {output}
        </pre>
      </div>
    </div>
  );
}

export default App;
