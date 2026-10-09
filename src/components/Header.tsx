interface HeaderProps {
  dateLabel: string;
  loading: boolean;
  onRefresh: () => void;
  currentView: "calendar" | "profile";
  onNavigate: (view: "calendar" | "profile") => void;
}

export function Header({
  dateLabel,
  loading,
  onRefresh,
  currentView,
  onNavigate,
}: HeaderProps) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand__logo" aria-hidden>
          🍔
        </span>
        <div>
          <h1 className="brand__title">麦麦日记</h1>
          <p className="brand__subtitle">McDiary · 每一次美味，都值得记录</p>
        </div>
      </div>
      <nav className="topbar__nav">
        <button
          type="button"
          className={`nav-btn ${currentView === "calendar" ? "nav-btn--active" : ""}`}
          onClick={() => onNavigate("calendar")}
        >
          日历
        </button>
        <button
          type="button"
          className={`nav-btn ${currentView === "profile" ? "nav-btn--active" : ""}`}
          onClick={() => onNavigate("profile")}
        >
          我的
        </button>
      </nav>
      <div className="topbar__actions">
        {currentView === "calendar" && (
          <>
            <span className="topbar__date">{dateLabel}</span>
            <button type="button" className="btn" onClick={onRefresh} disabled={loading}>
              {loading ? "刷新中…" : "刷新数据"}
            </button>
          </>
        )}
      </div>
    </header>
  );
}
