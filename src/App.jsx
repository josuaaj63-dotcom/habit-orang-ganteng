import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";

/**
 * HABITFLOW V1.0 - All-in-One Habit Tracker
 * Optimized for Mobile & Desktop
 */

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const ICONS = {
  water: "💧",
  food: "🍽️",
  shower: "🚿",
  study: "📚",
  sleep: "😴",
  exercise: "🏃",
  meditation: "🧘",
  journal: "✍️",
  vitamins: "💊",
  walk: "🚶",
  custom: "⭐",
};

const BADGE_THRESHOLDS = [
  { streak: 3, badge: "🌱", title: "Sprout", level: "Beginner" },
  { streak: 7, badge: "🔥", title: "On Fire", level: "Consistent" },
  { streak: 14, badge: "💎", title: "Diamond", level: "Disciplined" },
  { streak: 30, badge: "👑", title: "Legend", level: "Master" },
  { streak: 60, badge: "🌟", title: "Superstar", level: "Elite" },
  { streak: 100, badge: "🏆", title: "Champion", level: "Champion" },
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const DEFAULT_HABITS = [
  {
    id: "1",
    name: "Minum Air",
    icon: "water",
    times: ["07:00", "12:00", "18:00"],
    color: "#60a5fa",
    streak: 5,
    completedDates: [],
    active: true,
    frequency: "daily",
  },
  {
    id: "2",
    name: "Makan",
    icon: "food",
    times: ["08:00", "13:00", "19:00"],
    color: "#f97316",
    streak: 3,
    completedDates: [],
    active: true,
    frequency: "daily",
  },
  {
    id: "3",
    name: "Mandi",
    icon: "shower",
    times: ["06:00", "17:00"],
    color: "#34d399",
    streak: 12,
    completedDates: [],
    active: true,
    frequency: "daily",
  },
  {
    id: "4",
    name: "Belajar",
    icon: "study",
    times: ["09:00", "15:00"],
    color: "#a78bfa",
    streak: 7,
    completedDates: [],
    active: true,
    frequency: "daily",
  },
];

const formatDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
const today = () => formatDate(new Date());

function generateHistory(habits) {
  const history = {};
  const now = new Date();
  for (let i = 89; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = formatDate(d);
    history[key] = {};
    habits.forEach((h) => {
      history[key][h.id] = Math.random() > (i < 7 ? 0.25 : 0.45);
    });
  }
  return history;
}

// ─── HOOKS ───────────────────────────────────────────────────────────────────
function useStorage(key, init) {
  const [val, setVal] = useState(() => {
    try {
      const s = localStorage.getItem(key);
      return s ? JSON.parse(s) : typeof init === "function" ? init() : init;
    } catch {
      return typeof init === "function" ? init() : init;
    }
  });
  const save = useCallback(
    (v) => {
      setVal(v);
      try {
        localStorage.setItem(key, JSON.stringify(v));
      } catch {}
    },
    [key]
  );
  return [val, save];
}

// ─── COMPONENTS ──────────────────────────────────────────────────────────────
function RippleButton({ onClick, className, children, style }) {
  const ref = useRef(null);
  const handleClick = (e) => {
    const btn = ref.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const span = document.createElement("span");
    const size = Math.max(btn.offsetWidth, btn.offsetHeight);
    span.style.cssText = `position:absolute;border-radius:50%;background:rgba(255,255,255,0.3);width:${size}px;height:${size}px;left:${
      e.clientX - r.left - size / 2
    }px;top:${
      e.clientY - r.top - size / 2
    }px;transform:scale(0);animation:ripple 0.6s linear;pointer-events:none;`;
    btn.appendChild(span);
    setTimeout(() => span.remove(), 600);
    onClick?.(e);
  };
  return (
    <button
      ref={ref}
      onClick={handleClick}
      className={className}
      style={{ position: "relative", overflow: "hidden", ...style }}
    >
      {children}
    </button>
  );
}

function CircularProgress({
  value,
  size = 80,
  stroke = 6,
  color = "#60a5fa",
  children,
}) {
  const r = (size - stroke * 2) / 2,
    c = 2 * Math.PI * r,
    offset = c - (value / 100) * c;
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        width={size}
        height={size}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          transform: "rotate(-90deg)",
        }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: "stroke-dashoffset 0.8s cubic-bezier(.4,0,.2,1)",
          }}
        />
      </svg>
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}

function HeatmapCalendar({ history, habitId }) {
  const cells = useMemo(() => {
    const arr = [];
    const now = new Date();
    for (let i = 83; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = formatDate(d);
      const done = history[key]?.[habitId] ?? false;
      arr.push({ key, done, d });
    }
    return arr;
  }, [history, habitId]);

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <div
      style={{
        display: "flex",
        gap: 3,
        flexWrap: "nowrap",
        overflowX: "auto",
        paddingBottom: 4,
      }}
    >
      {weeks.map((week, wi) => (
        <div
          key={wi}
          style={{ display: "flex", flexDirection: "column", gap: 3 }}
        >
          {week.map((cell) => (
            <div
              key={cell.key}
              title={cell.key}
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: cell.done ? "#34d399" : "rgba(255,255,255,0.06)",
                transition: "background 0.3s",
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function WeekStrip({ history, habitId }) {
  const days = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = formatDate(d);
    const isToday = i === 0;
    days.push({
      key,
      isToday,
      label: DAYS[d.getDay()],
      done: history[key]?.[habitId] ?? false,
    });
  }
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "space-between" }}>
      {days.map((day) => (
        <div
          key={day.key}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span
            style={{
              fontSize: 9,
              color: "rgba(255,255,255,0.4)",
              fontFamily: "'DM Sans',sans-serif",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {day.label}
          </span>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: day.done
                ? "#34d399"
                : day.isToday
                ? "rgba(255,255,255,0.1)"
                : "rgba(255,255,255,0.04)",
              border: day.isToday
                ? "1.5px solid rgba(255,255,255,0.2)"
                : "1.5px solid transparent",
              fontSize: 14,
            }}
          >
            {day.done ? "✓" : day.isToday ? "•" : ""}
          </div>
        </div>
      ))}
    </div>
  );
}

function getBadge(streak) {
  let badge = null;
  for (const b of BADGE_THRESHOLDS) {
    if (streak >= b.streak) badge = b;
  }
  return badge;
}

function HabitCard({ habit, onComplete, onEdit, todayCompleted, history }) {
  const [expanded, setExpanded] = useState(false);
  const badge = getBadge(habit.streak);
  const pct = Math.min(100, (habit.streak / 30) * 100);
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        borderRadius: 20,
        padding: "16px",
        marginBottom: 12,
        border: `1px solid rgba(255,255,255,${todayCompleted ? 0.15 : 0.07})`,
        transition: "all 0.3s cubic-bezier(.4,0,.2,1)",
        boxShadow: todayCompleted ? `0 0 20px ${habit.color}22` : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <CircularProgress value={pct} size={54} stroke={4} color={habit.color}>
          <span style={{ fontSize: 20 }}>{ICONS[habit.icon] || "⭐"}</span>
        </CircularProgress>
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 2,
            }}
          >
            <span
              style={{
                fontFamily: "'Playfair Display',serif",
                fontSize: 15,
                color: "#f1f5f9",
                fontWeight: 600,
              }}
            >
              {habit.name}
            </span>
            {badge && (
              <span style={{ fontSize: 12 }} title={badge.title}>
                {badge.badge}
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 11,
                color: habit.color,
                fontFamily: "'DM Sans',sans-serif",
                fontWeight: 600,
              }}
            >
              🔥 {habit.streak} hari
            </span>
            <span
              style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.3)",
                fontFamily: "'DM Sans',sans-serif",
              }}
            >
              {habit.times.slice(0, 2).join(" · ")}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => setExpanded((e) => !e)}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "rgba(255,255,255,0.3)",
              fontSize: 16,
              padding: 4,
            }}
          >
            {expanded ? "▲" : "▼"}
          </button>
          <RippleButton
            onClick={() => onComplete(habit.id)}
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: "none",
              cursor: "pointer",
              fontSize: 18,
              background: todayCompleted
                ? habit.color
                : "rgba(255,255,255,0.08)",
              color: todayCompleted ? "#fff" : "rgba(255,255,255,0.5)",
              transition: "all 0.3s cubic-bezier(.4,0,.2,1)",
              transform: todayCompleted ? "scale(1.1)" : "scale(1)",
            }}
          >
            {todayCompleted ? "✓" : "○"}
          </RippleButton>
        </div>
      </div>
      {expanded && (
        <div
          style={{
            marginTop: 14,
            paddingTop: 14,
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <WeekStrip history={history} habitId={habit.id} />
          <div
            style={{
              marginTop: 12,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.3)",
                fontFamily: "'DM Sans',sans-serif",
              }}
            >
              84 hari terakhir
            </span>
            <button
              onClick={() => onEdit(habit)}
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "none",
                borderRadius: 8,
                padding: "4px 10px",
                color: "rgba(255,255,255,0.5)",
                fontSize: 11,
                cursor: "pointer",
                fontFamily: "'DM Sans',sans-serif",
              }}
            >
              Edit ✏️
            </button>
          </div>
          <div style={{ marginTop: 8 }}>
            <HeatmapCalendar history={history} habitId={habit.id} />
          </div>
        </div>
      )}
    </div>
  );
}

function Modal({ show, onClose, children }) {
  if (!show) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        zIndex: 100,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1a1f2e",
          borderRadius: "24px 24px 0 0",
          padding: 24,
          width: "100%",
          maxWidth: 480,
          maxHeight: "85vh",
          overflowY: "auto",
          animation: "slideUp 0.3s cubic-bezier(.4,0,.2,1)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function EditHabitModal({ habit, onSave, onDelete, onClose }) {
  const [name, setName] = useState(habit?.name || "");
  const [icon, setIcon] = useState(habit?.icon || "custom");
  const [color, setColor] = useState(habit?.color || "#60a5fa");
  const [times, setTimes] = useState(habit?.times?.join(", ") || "08:00");
  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <h3
          style={{
            fontFamily: "'Playfair Display',serif",
            color: "#f1f5f9",
            fontSize: 20,
            margin: 0,
          }}
        >
          {habit?.id ? "Edit Kebiasaan" : "Tambah Kebiasaan"}
        </h3>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            color: "rgba(255,255,255,0.4)",
            fontSize: 20,
            cursor: "pointer",
          }}
        >
          ✕
        </button>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.4)",
            fontFamily: "'DM Sans',sans-serif",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            display: "block",
            marginBottom: 6,
          }}
        >
          Nama
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nama kebiasaan..."
          style={{
            width: "100%",
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12,
            padding: "10px 14px",
            color: "#f1f5f9",
            fontFamily: "'DM Sans',sans-serif",
            fontSize: 14,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.4)",
            fontFamily: "'DM Sans',sans-serif",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            display: "block",
            marginBottom: 6,
          }}
        >
          Ikon
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {Object.entries(ICONS).map(([k, v]) => (
            <button
              key={k}
              onClick={() => setIcon(k)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                border: `2px solid ${
                  icon === k ? color : "rgba(255,255,255,0.1)"
                }`,
                background:
                  icon === k ? `${color}22` : "rgba(255,255,255,0.05)",
                fontSize: 18,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.4)",
            fontFamily: "'DM Sans',sans-serif",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            display: "block",
            marginBottom: 6,
          }}
        >
          Warna
        </label>
        <div style={{ display: "flex", gap: 10 }}>
          {[
            "#60a5fa",
            "#f97316",
            "#34d399",
            "#a78bfa",
            "#f43f5e",
            "#facc15",
            "#06b6d4",
            "#ec4899",
          ].map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: c,
                border: `3px solid ${color === c ? "#fff" : "transparent"}`,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            />
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <label
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.4)",
            fontFamily: "'DM Sans',sans-serif",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            display: "block",
            marginBottom: 6,
          }}
        >
          Waktu (pisahkan dengan koma)
        </label>
        <input
          value={times}
          onChange={(e) => setTimes(e.target.value)}
          placeholder="08:00, 13:00, 18:00"
          style={{
            width: "100%",
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12,
            padding: "10px 14px",
            color: "#f1f5f9",
            fontFamily: "'DM Sans',sans-serif",
            fontSize: 14,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        {habit?.id && (
          <button
            onClick={() => onDelete(habit.id)}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: 14,
              border: "1px solid rgba(244,63,94,0.3)",
              background: "rgba(244,63,94,0.1)",
              color: "#f43f5e",
              fontFamily: "'DM Sans',sans-serif",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Hapus
          </button>
        )}
        <RippleButton
          onClick={() =>
            onSave({
              name,
              icon,
              color,
              times: times
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean),
            })
          }
          style={{
            flex: 2,
            padding: "12px",
            borderRadius: 14,
            border: "none",
            background: color,
            color: "#fff",
            fontFamily: "'DM Sans',sans-serif",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Simpan ✓
        </RippleButton>
      </div>
    </>
  );
}

// ─── PAGES ───────────────────────────────────────────────────────────────────
function Dashboard({ habits, completions, onComplete, history, onEdit }) {
  const total = habits.length;
  const done = habits.filter((h) => completions[h.id]).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Selamat Pagi" : hour < 17 ? "Selamat Siang" : "Selamat Malam";

  const topStreak = habits.reduce(
    (a, b) => (b.streak > (a?.streak || 0) ? b : a),
    null
  );
  const totalStreak = habits.reduce((s, h) => s + h.streak, 0);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: 12,
                color: "rgba(255,255,255,0.4)",
                fontFamily: "'DM Sans',sans-serif",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              {greeting}
            </p>
            <h1
              style={{
                margin: "4px 0 0",
                fontFamily: "'Playfair Display',serif",
                fontSize: 26,
                color: "#f1f5f9",
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              Hari yang
              <br />
              <span style={{ color: "#60a5fa" }}>Produktif</span> ✨
            </h1>
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.3)",
                fontFamily: "'DM Sans',sans-serif",
              }}
            >
              {DAYS[now.getDay()]}, {now.getDate()} {MONTHS[now.getMonth()]}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          background:
            "linear-gradient(135deg,rgba(96,165,250,0.1),rgba(167,139,250,0.1))",
          borderRadius: 24,
          padding: 24,
          marginBottom: 16,
          border: "1px solid rgba(96,165,250,0.2)",
          display: "flex",
          alignItems: "center",
          gap: 20,
        }}
      >
        <CircularProgress
          value={pct}
          size={90}
          stroke={7}
          color={pct === 100 ? "#34d399" : "#60a5fa"}
        >
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontFamily: "'Playfair Display',serif",
                fontSize: 20,
                color: "#f1f5f9",
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              {pct}%
            </div>
          </div>
        </CircularProgress>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: "'Playfair Display',serif",
              fontSize: 16,
              color: "#f1f5f9",
              marginBottom: 4,
            }}
          >
            {done}/{total} Selesai
          </div>
          <div
            style={{
              fontFamily: "'DM Sans',sans-serif",
              fontSize: 12,
              color: "rgba(255,255,255,0.5)",
              marginBottom: 10,
            }}
          >
            {pct === 100
              ? "🎉 Semua selesai hari ini!"
              : `${total - done} aktivitas tersisa`}
          </div>
          <div
            style={{
              height: 6,
              background: "rgba(255,255,255,0.08)",
              borderRadius: 6,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                borderRadius: 6,
                background:
                  pct === 100
                    ? "#34d399"
                    : "linear-gradient(90deg,#60a5fa,#a78bfa)",
                width: `${pct}%`,
                transition: "width 0.8s cubic-bezier(.4,0,.2,1)",
              }}
            />
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 10,
          marginBottom: 20,
        }}
      >
        {[
          {
            label: "Total Streak",
            val: `${totalStreak}🔥`,
            sub: "semua habit",
          },
          {
            label: "Terbaik",
            val: `${topStreak?.streak || 0}d`,
            sub: topStreak?.name || "-",
          },
          { label: "Konsistensi", val: `${pct}%`, sub: "hari ini" },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: "rgba(255,255,255,0.04)",
              borderRadius: 16,
              padding: "12px 10px",
              textAlign: "center",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div
              style={{
                fontFamily: "'Playfair Display',serif",
                fontSize: 18,
                color: "#f1f5f9",
                fontWeight: 700,
              }}
            >
              {s.val}
            </div>
            <div
              style={{
                fontSize: 9,
                color: "rgba(255,255,255,0.4)",
                fontFamily: "'DM Sans',sans-serif",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginTop: 2,
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                fontSize: 9,
                color: "rgba(255,255,255,0.25)",
                fontFamily: "'DM Sans',sans-serif",
              }}
            >
              {s.sub}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <h2
          style={{
            fontFamily: "'Playfair Display',serif",
            fontSize: 16,
            color: "rgba(255,255,255,0.7)",
            margin: 0,
            fontWeight: 600,
          }}
        >
          Aktivitas Hari Ini
        </h2>
        <span
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.3)",
            fontFamily: "'DM Sans',sans-serif",
          }}
        >
          {done} selesai
        </span>
      </div>
      {habits.map((h) => (
        <HabitCard
          key={h.id}
          habit={h}
          onComplete={onComplete}
          onEdit={onEdit}
          todayCompleted={!!completions[h.id]}
          history={history}
        />
      ))}
    </div>
  );
}

function StatsPage({ habits, history }) {
  const weekData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      const key = formatDate(d);
      const count = habits.filter((h) => history[key]?.[h.id]).length;
      return { label: DAYS[d.getDay()], count, total: habits.length, key };
    });
  }, [history, habits]);

  const maxCount = Math.max(...weekData.map((d) => d.count), 1);

  return (
    <div>
      <h1
        style={{
          fontFamily: "'Playfair Display',serif",
          fontSize: 24,
          color: "#f1f5f9",
          marginBottom: 20,
          fontWeight: 700,
        }}
      >
        Statistik 📊
      </h1>

      <div
        style={{
          background: "rgba(255,255,255,0.04)",
          borderRadius: 20,
          padding: 20,
          marginBottom: 16,
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <h3
          style={{
            fontFamily: "'DM Sans',sans-serif",
            fontSize: 12,
            color: "rgba(255,255,255,0.4)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            margin: "0 0 16px",
          }}
        >
          7 Hari Terakhir
        </h3>
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "flex-end",
            height: 80,
          }}
        >
          {weekData.map((day) => (
            <div
              key={day.key}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <div
                style={{
                  width: "100%",
                  borderRadius: "4px 4px 0 0",
                  background: "linear-gradient(180deg,#60a5fa,#a78bfa)",
                  height: `${(day.count / maxCount) * 64}px`,
                  minHeight: day.count > 0 ? 4 : 0,
                  transition: "height 0.5s cubic-bezier(.4,0,.2,1)",
                }}
              />
              <span
                style={{
                  fontSize: 9,
                  color: "rgba(255,255,255,0.35)",
                  fontFamily: "'DM Sans',sans-serif",
                }}
              >
                {day.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          background: "rgba(255,255,255,0.04)",
          borderRadius: 20,
          padding: 20,
          marginBottom: 16,
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <h3
          style={{
            fontFamily: "'DM Sans',sans-serif",
            fontSize: 12,
            color: "rgba(255,255,255,0.4)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            margin: "0 0 16px",
          }}
        >
          Konsistensi 30 Hari
        </h3>
        {habits.map((h) => {
          let done = 0;
          const now = new Date();
          for (let i = 29; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            if (history[formatDate(d)]?.[h.id]) done++;
          }
          const c = Math.round((done / 30) * 100);
          return (
            <div key={h.id} style={{ marginBottom: 12 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    fontFamily: "'DM Sans',sans-serif",
                    fontSize: 13,
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  {ICONS[h.icon]} {h.name}
                </span>
                <span
                  style={{
                    fontFamily: "'DM Sans',sans-serif",
                    fontSize: 13,
                    color: h.color,
                    fontWeight: 600,
                  }}
                >
                  {c}%
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  background: "rgba(255,255,255,0.06)",
                  borderRadius: 6,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    borderRadius: 6,
                    background: h.color,
                    width: `${c}%`,
                    transition: "width 0.8s cubic-bezier(.4,0,.2,1)",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          background: "rgba(255,255,255,0.04)",
          borderRadius: 20,
          padding: 20,
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <h3
          style={{
            fontFamily: "'DM Sans',sans-serif",
            fontSize: 12,
            color: "rgba(255,255,255,0.4)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            margin: "0 0 16px",
          }}
        >
          Badge & Level
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 10,
          }}
        >
          {BADGE_THRESHOLDS.map((b) => {
            const unlocked = habits.some((h) => h.streak >= b.streak);
            return (
              <div
                key={b.streak}
                style={{
                  textAlign: "center",
                  padding: 12,
                  borderRadius: 14,
                  background: unlocked
                    ? `rgba(52,211,153,0.08)`
                    : "rgba(255,255,255,0.03)",
                  border: `1px solid ${
                    unlocked ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.05)"
                  }`,
                  opacity: unlocked ? 1 : 0.4,
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 4 }}>{b.badge}</div>
                <div
                  style={{
                    fontFamily: "'DM Sans',sans-serif",
                    fontSize: 10,
                    color: unlocked ? "#34d399" : "rgba(255,255,255,0.4)",
                    fontWeight: 600,
                  }}
                >
                  {b.title}
                </div>
                <div
                  style={{
                    fontFamily: "'DM Sans',sans-serif",
                    fontSize: 9,
                    color: "rgba(255,255,255,0.3)",
                  }}
                >
                  {b.streak}+ hari
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SettingsPage({ habits, onAddHabit, onEditHabit, onDeleteHabit }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  return (
    <div>
      <h1
        style={{
          fontFamily: "'Playfair Display',serif",
          fontSize: 24,
          color: "#f1f5f9",
          marginBottom: 20,
          fontWeight: 700,
        }}
      >
        Pengaturan ⚙️
      </h1>

      <div
        style={{
          background: "rgba(255,255,255,0.04)",
          borderRadius: 20,
          padding: 16,
          marginBottom: 16,
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <h3
            style={{
              fontFamily: "'DM Sans',sans-serif",
              fontSize: 13,
              color: "rgba(255,255,255,0.5)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              margin: 0,
            }}
          >
            Kelola Kebiasaan
          </h3>
          <RippleButton
            onClick={() => setShowAdd(true)}
            style={{
              background: "#60a5fa",
              border: "none",
              borderRadius: 10,
              padding: "6px 12px",
              color: "#fff",
              fontFamily: "'DM Sans',sans-serif",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            + Tambah
          </RippleButton>
        </div>
        {habits.map((h) => (
          <div
            key={h.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 0",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            <span style={{ fontSize: 20, width: 28, textAlign: "center" }}>
              {ICONS[h.icon]}
            </span>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontFamily: "'DM Sans',sans-serif",
                  fontSize: 14,
                  color: "rgba(255,255,255,0.8)",
                }}
              >
                {h.name}
              </div>
              <div
                style={{
                  fontFamily: "'DM Sans',sans-serif",
                  fontSize: 11,
                  color: "rgba(255,255,255,0.3)",
                }}
              >
                {h.times.join(" · ")}
              </div>
            </div>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: h.color,
              }}
            />
            <button
              onClick={() => setEditTarget(h)}
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "none",
                borderRadius: 8,
                padding: "4px 10px",
                color: "rgba(255,255,255,0.4)",
                fontSize: 11,
                cursor: "pointer",
                fontFamily: "'DM Sans',sans-serif",
              }}
            >
              Edit
            </button>
          </div>
        ))}
      </div>

      <Modal
        show={showAdd || !!editTarget}
        onClose={() => {
          setShowAdd(false);
          setEditTarget(null);
        }}
      >
        <EditHabitModal
          habit={editTarget || {}}
          onSave={(data) => {
            if (editTarget?.id) onEditHabit({ ...editTarget, ...data });
            else onAddHabit(data);
            setShowAdd(false);
            setEditTarget(null);
          }}
          onDelete={(id) => {
            onDeleteHabit(id);
            setEditTarget(null);
          }}
          onClose={() => {
            setShowAdd(false);
            setEditTarget(null);
          }}
        />
      </Modal>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [habits, setHabits] = useStorage("habits", DEFAULT_HABITS);
  const [completions, setCompletions] = useStorage(
    "completions_" + today(),
    {}
  );
  const [history, setHistory] = useStorage("history", () =>
    generateHistory(DEFAULT_HABITS)
  );
  const [activeTab, setActiveTab] = useState("dashboard");

  const handleComplete = (id) => {
    const t = today();
    const isAlreadyDone = !!completions[id];
    const newComp = { ...completions, [id]: !isAlreadyDone };
    setCompletions(newComp);

    const newHist = {
      ...history,
      [t]: { ...(history[t] || {}), [id]: !isAlreadyDone },
    };
    setHistory(newHist);

    setHabits(
      habits.map((h) =>
        h.id === id
          ? {
              ...h,
              streak: isAlreadyDone ? Math.max(0, h.streak - 1) : h.streak + 1,
            }
          : h
      )
    );
  };

  const handleAddHabit = (data) => {
    const newH = {
      id: Date.now().toString(),
      ...data,
      streak: 0,
      completedDates: [],
      active: true,
      frequency: "daily",
    };
    setHabits([...habits, newH]);
  };

  const handleEditHabit = (updated) =>
    setHabits(habits.map((h) => (h.id === updated.id ? updated : h)));
  const handleDeleteHabit = (id) =>
    setHabits(habits.filter((h) => h.id !== id));

  const tabs = [
    { id: "dashboard", label: "Hari Ini", icon: "🏠" },
    { id: "stats", label: "Statistik", icon: "📊" },
    { id: "settings", label: "Pengaturan", icon: "⚙️" },
  ];

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@400;500;600&display=swap"
        rel="stylesheet"
      />
      <style>{`
        * { margin:0;padding:0;box-sizing:border-box; }
        body { background:#0d1117; color: white; }
        @keyframes ripple { to { transform:scale(4);opacity:0; } }
        @keyframes slideUp { from { transform:translateY(100%);opacity:0; } to { transform:translateY(0);opacity:1; } }
        @keyframes fadeIn { from {opacity:0;transform:translateY(8px)} to {opacity:1;transform:translateY(0)} }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          background: "#0d1117",
          backgroundImage:
            "radial-gradient(ellipse 80% 50% at 50% -20%,rgba(96,165,250,0.08),transparent)",
          display: "flex",
          flexDirection: "column",
          maxWidth: 430,
          margin: "0 auto",
          fontFamily: "'DM Sans',sans-serif",
          position: "relative",
        }}
      >
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "48px 16px 90px",
            animation: "fadeIn 0.4s ease",
          }}
        >
          {activeTab === "dashboard" && (
            <Dashboard
              habits={habits}
              completions={completions}
              onComplete={handleComplete}
              history={history}
              onEdit={() => setActiveTab("settings")}
            />
          )}
          {activeTab === "stats" && (
            <StatsPage habits={habits} history={history} />
          )}
          {activeTab === "settings" && (
            <SettingsPage
              habits={habits}
              onAddHabit={handleAddHabit}
              onEditHabit={handleEditHabit}
              onDeleteHabit={handleDeleteHabit}
            />
          )}
        </div>

        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "100%",
            maxWidth: 430,
            background: "rgba(13,17,23,0.95)",
            backdropFilter: "blur(20px)",
            borderTop: "1px solid rgba(255,255,255,0.07)",
            display: "flex",
            padding: "8px 0 20px",
            zIndex: 50,
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "8px 0",
              }}
            >
              <span style={{ fontSize: 20 }}>{tab.icon}</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color:
                    activeTab === tab.id ? "#60a5fa" : "rgba(255,255,255,0.3)",
                }}
              >
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
