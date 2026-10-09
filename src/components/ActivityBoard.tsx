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
    let timer = 0;
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
    };
    timer = window.setTimeout(() => {
      cleanup();
      if (!settled && !document.hidden) setShowAppTip(true);
    }, 1500);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    window.location.href = url;
  };

  return (
    <div className="activity-board">
      <div className="activity-board__head">
        <h3 className="panel__title">🎉 麦麦活动</h3>
        {events.length > 0 ? <span className="badge">{events.length} 个活动</span> : null}
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

      {events.length > 0 ? (
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
      ) : (
        <p className="empty">{formatDateCN(date)} 暂无活动信息</p>
      )}
    </div>
  );
}
