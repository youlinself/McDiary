import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { ActivityBoard } from "./components/ActivityBoard";
import { CalendarBoard, type DayAgg } from "./components/CalendarBoard";
import { DayDetail } from "./components/DayDetail";
import { Header } from "./components/Header";
import { HealthRings } from "./components/HealthRings";
import { Profile } from "./components/Profile";
import type { CalendarDay, CalendarEvent, NutritionFood, Order } from "./types";
import { formatDateCN, orderDate, parseYmd, toYmd } from "./utils/date";
import { buildNutritionIndex, computeIntake } from "./utils/nutrition";

type View = "calendar" | "profile";

function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 300);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      className="back-to-top"
      aria-label="回到顶部"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      ↑
    </button>
  );
}

export default function App() {
  const [view, setView] = useState<View>("calendar");
  const [orders, setOrders] = useState<Order[]>([]);
  const [dailyList, setDailyList] = useState<CalendarDay[]>([]);
  const [foods, setFoods] = useState<NutritionFood[]>([]);
  const [today, setToday] = useState(() => toYmd(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => toYmd(new Date()));
  const [monthView, setMonthView] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotConfigured(false);
    try {
      const [orderData, calendarData, nutritionData, nowData] = await Promise.all([
        api.orders(),
        api.calendar(),
        api.nutrition(),
        api.now().catch(() => null),
      ]);

      setOrders(orderData);
      setDailyList(calendarData.dailyList ?? []);
      setFoods(nutritionData);

      const todayYmd = nowData?.date ?? toYmd(new Date());
      setToday(todayYmd);

      setSelectedDate(todayYmd);
      const focus = parseYmd(todayYmd);
      setMonthView({ year: focus.getFullYear(), month: focus.getMonth() + 1 });
    } catch (err) {
      if (
        (err as { notConfigured?: boolean }).notConfigured ||
        (err as { code?: string }).code === "MCP_TOKEN_NOT_CONFIGURED"
      ) {
        setNotConfigured(true);
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const ordersByDate = useMemo(() => {
    const map = new Map<string, DayAgg>();
    for (const order of orders) {
      const key = orderDate(order.createTime);
      const amount = Number(order.realTotalAmount) || 0;
      const prev = map.get(key);
      if (prev) {
        prev.total += amount;
        prev.count += 1;
      } else {
        map.set(key, { total: amount, count: 1 });
      }
    }
    return map;
  }, [orders]);

  const activitiesByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const day of dailyList) {
      if (day.events && day.events.length > 0) map.set(day.date, day.events);
    }
    return map;
  }, [dailyList]);

  const nutritionIndex = useMemo(() => buildNutritionIndex(foods), [foods]);

  const selectedOrders = useMemo(
    () => orders.filter((order) => orderDate(order.createTime) === selectedDate),
    [orders, selectedDate],
  );

  const selectedEvents = useMemo(
    () => activitiesByDate.get(selectedDate) ?? [],
    [activitiesByDate, selectedDate],
  );

  const intake = useMemo(
    () => computeIntake(selectedOrders, nutritionIndex),
    [selectedOrders, nutritionIndex],
  );

  const changeMonth = (delta: number) => {
    setMonthView((prev) => {
      const next = new Date(prev.year, prev.month - 1 + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() + 1 };
    });
  };

  const goToday = () => {
    const focus = parseYmd(today);
    setMonthView({ year: focus.getFullYear(), month: focus.getMonth() + 1 });
    setSelectedDate(today);
  };

  const dateLabel = `${selectedDate === today ? "今天 · " : ""}${formatDateCN(selectedDate)}`;

  const handleNavigate = (nextView: View) => {
    setView(nextView);
  };

  const handleConfigChange = () => {
    void load();
  };

  if (view === "profile") {
    return (
      <div className="app">
        <Header
          dateLabel={dateLabel}
          loading={loading}
          onRefresh={() => void load()}
          currentView={view}
          onNavigate={handleNavigate}
        />
        <Profile onConfigChange={handleConfigChange} />
        <footer className="footer">
          <span>麦麦日记 McDiary · 数据来自麦当劳 MCP</span>
          <span>餐品信息与价格以麦当劳官方渠道的实时结果为准</span>
        </footer>
        <BackToTop />
      </div>
    );
  }

  return (
    <div className="app">
      <Header
        dateLabel={dateLabel}
        loading={loading}
        onRefresh={() => void load()}
        currentView={view}
        onNavigate={handleNavigate}
      />

      {notConfigured && (
        <div className="banner banner--warning">
          <span>尚未配置麦当劳 MCP Token，无法加载数据</span>
          <button
            type="button"
            className="btn btn--small"
            onClick={() => setView("profile")}
          >
            去配置
          </button>
        </div>
      )}

      {error && !notConfigured ? (
        <div className="banner banner--error">
          <span>数据加载失败：{error}</span>
          <button type="button" className="btn btn--small" onClick={() => void load()}>
            重试
          </button>
        </div>
      ) : null}

      <main className="layout">
        <div className="main-col">
          <section className="panel panel--calendar">
            <CalendarBoard
              year={monthView.year}
              month={monthView.month}
              selectedDate={selectedDate}
              today={today}
              ordersByDate={ordersByDate}
              activitiesByDate={activitiesByDate}
              onSelectDate={setSelectedDate}
              onPrevMonth={() => changeMonth(-1)}
              onNextMonth={() => changeMonth(1)}
              onToday={goToday}
            />
          </section>

          <section className="panel panel--activities">
            <ActivityBoard date={selectedDate} events={selectedEvents} />
          </section>
        </div>

        <aside className="side">
          <section className="panel panel--rings">
            <HealthRings
              totals={intake.totals}
              dateLabel={selectedDate === today ? "今天" : formatDateCN(selectedDate)}
            />
          </section>

          <section className="panel panel--detail">
            <DayDetail date={selectedDate} orders={selectedOrders} intake={intake} />
          </section>
        </aside>
      </main>

      <footer className="footer">
        <span>麦麦日记 McDiary · 数据来自麦当劳 MCP（order-list / campaign-calendar / list-nutrition-foods）</span>
        <span>餐品信息与价格以麦当劳官方渠道的实时结果为准</span>
      </footer>
      <BackToTop />
    </div>
  );
}
