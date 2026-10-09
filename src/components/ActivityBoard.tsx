import { useEffect, useState, type MouseEvent } from "react";
import type { CalendarEvent } from "../types";
import { formatDateCN } from "../utils/date";

interface ActivityBoardProps {
  date: string;
  events: CalendarEvent[];
}

function pseudoLikes(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 9973;
  }
  return 88 + (hash % 860);
}

function isSafeJumpUrl(url: string): boolean {
  if (/^https?:\/\//i.test(url)) return true;
  return /^(?!javascript:|data:|vbscript:|file:)[a-z][a-z0-9+.-]*:/i.test(url);
}

export function ActivityBoard({ date, events }: ActivityBoardProps) {
  const [showAppTip, setShowAppTip] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    if (!showAppTip) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowAppTip(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [showAppTip]);

  const handleSchemeJump = (url: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    let settled = false;
    let jumpFailed = false;
    let timer = 0;
    const originalConsoleError = console.error;

    const isJumpError = (...args: unknown[]) => {
      const msg = args.map((a) => (typeof a === "string" ? a : String(a))).join(" ");
      return (
        msg.includes("Failed to launch") ||
        msg.includes("scheme is not registered") ||
        msg.includes("cannot open the page") ||
        msg.includes("addr is not valid")
      );
    };

    const onConsoleError = (...args: unknown[]) => {
      if (isJumpError(...args)) {
        jumpFailed = true;
        settled = true;
        setShowAppTip(true);
      }
      originalConsoleError.apply(console, args);
    };

    const onBlur = () => {
      settled = true;
      setShowAppTip(false);
    };

    const onVisibility = () => {
      if (document.hidden) {
        settled = true;
        setShowAppTip(false);
      }
    };

    const cleanup = () => {
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearTimeout(timer);
      console.error = originalConsoleError;
    };

    timer = window.setTimeout(() => {
      cleanup();
      if (jumpFailed) setShowAppTip(true);
      else if (!settled && !document.hidden) setShowAppTip(true);
    }, 2500);

    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    console.error = onConsoleError;
    window.location.href = url;
  };

  return (
    <div className="activity-board">
      <div className="activity-board__head">
        <h3 className="panel__title">🎉 麦麦活动</h3>
        <div className="activity-board__head-right">
          {events.length > 0 ? <span className="badge">{events.length} 个活动</span> : null}
          <button
            type="button"
            className={`btn btn--icon activity-board__toggle ${isExpanded ? "is-expanded" : ""}`}
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? "收起活动列表" : "展开活动列表"}
            title={isExpanded ? "收起" : "展开"}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}
            >
              <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {showAppTip ? (
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="app-tip-title"
          onClick={() => setShowAppTip(false)}
        >
          <div className="modal__card" onClick={(e) => e.stopPropagation()}>
            <div className="modal__icon">📲</div>
            <h3 className="modal__title" id="app-tip-title">
              未检测到麦当劳 App
            </h3>
            <p className="modal__desc">该活动需在麦当劳 App 内打开，请安装后重试</p>
            <div className="modal__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setShowAppTip(false)}>
                知道了
              </button>
              <a
                className="btn"
                href="https://www.mcdonalds.com.cn/"
                target="_blank"
                rel="noopener noreferrer"
              >
                去下载
              </a>
            </div>
          </div>
        </div>
      ) : null}

      {isExpanded && events.length > 0 ? (
        <div className="activity-grid">
          {events.map((event, index) => {
            const article = event.articleDto ?? {};
            const title = article.title || event.activityTitle || "麦麦活动";
            const author = event.activityTag?.trim() || "麦麦活动";
            const likes = pseudoLikes(event.activityCode);
            const jumpUrl = article.appJumpUrl?.trim() ?? "";
            const jumpable = isSafeJumpUrl(jumpUrl);
            const isHttp = /^https?:\/\//i.test(jumpUrl);
            return (
              <article key={`${event.activityCode}-${index}`} className="activity-card">
                {article.imgList?.[0] ? (
                  <div className="activity-card__cover">
                    <img src={article.imgList[0]} alt="" loading="lazy" />
                  </div>
                ) : null}
                <div className="activity-card__body">
                  <h4 className="activity-card__title">{title}</h4>
                  {article.highlights ? (
                    <p className="activity-card__highlight">{article.highlights}</p>
                  ) : null}
                  {article.content ? (
                    <p className="activity-card__content">{article.content}</p>
                  ) : null}
                  {jumpable ? (
                    <a
                      className="activity-card__cta"
                      href={jumpUrl}
                      {...(isHttp
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : { onClick: handleSchemeJump(jumpUrl) })}
                    >
                      {article.buttonText || "查看详情"}
                    </a>
                  ) : article.buttonText ? (
                    <span className="activity-card__cta">{article.buttonText}</span>
                  ) : null}
                </div>
                <div className="activity-card__foot">
                  <span className="activity-card__avatar">{author.slice(0, 1)}</span>
                  <span className="activity-card__author">{author}</span>
                  <span className="activity-card__likes">♥ {likes}</span>
                </div>
              </article>
            );
          })}
        </div>
      ) : isExpanded ? (
        <p className="empty">{formatDateCN(date)} 暂无活动信息</p>
      ) : null}
    </div>
  );
}
