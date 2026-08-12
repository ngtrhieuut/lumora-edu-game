import { getChapterLevels } from "../levelCatalog/index.js";
import { getChapterProgress, getNextPlayableLevel, isLevelUnlocked } from "./catalogProgression.js";

function levelStatus(level, progress) {
  if (progress.completedLevelIds.includes(level.id)) return "completed";
  if (isLevelUnlocked(level.id, progress)) return "available";
  return "locked";
}

function chapterRouteState(progress, grade, chapter) {
  const chapterLevels = getChapterLevels(grade, chapter);
  const chapterProgress = getChapterProgress(progress, grade, chapter);
  const firstLevel = chapterLevels[0];
  const unlocked = Boolean(firstLevel && isLevelUnlocked(firstLevel.id, progress));
  return {
    chapter,
    title: firstLevel?.chapterTitleVi ?? `Chương ${chapter}`,
    fantasy: firstLevel?.fantasyVi ?? "",
    subject: firstLevel?.subject ?? "",
    completedCount: chapterProgress.completedCount,
    totalCount: chapterProgress.totalCount,
    complete: chapterProgress.complete,
    state: chapterProgress.complete ? "completed" : unlocked ? "available" : "locked",
  };
}

export function CatalogMapView({
  progress,
  onStart,
  onPreview,
  onBack,
  grade = 1,
  chapter = 1,
  onGradeChange,
  onChapterChange,
}) {
  const levels = getChapterLevels(grade, chapter);
  const chapterProgress = getChapterProgress(progress, grade, chapter);
  const nextInChapter = getNextPlayableLevel(progress, levels, { grade });
  const nextBoundary = getNextPlayableLevel(progress, undefined, { grade });
  const route = Array.from({ length: 10 }, (_, index) => chapterRouteState(progress, grade, index + 1));

  return (
    <main className="catalog-map-view" aria-labelledby="catalog-map-title">
      <header className="catalog-map-header">
        <button type="button" className="runtime-exit-button" onClick={onBack} aria-label="Quay lại trang chính">←</button>
        <div>
          <span>Level Runtime v1 · Lớp {grade} · Chương {chapter}</span>
          <h1 id="catalog-map-title">{levels[0]?.chapterTitleVi ?? `Lớp ${grade}`}</h1>
          <p>{levels[0]?.fantasyVi ?? "Chọn một chặng để học qua thao tác, quan sát và bằng chứng."}</p>
        </div>
        <div className="catalog-progress-orb"><b>{chapterProgress.completedCount}</b><small>/{chapterProgress.totalCount} level</small></div>
      </header>

      <section className="catalog-map-intro">
        <span aria-hidden="true">✦</span>
        <div><b>Đi theo đường sáng, từng chặng một</b><small>Hoàn thành chặng trước để mở chặng sau. Bạn vẫn có thể thử bản review mà không ghi progress hay reward.</small></div>
      </section>

      <nav className="catalog-grade-tabs" aria-label="Chọn lớp">
        {[1, 2, 3, 4, 5].map((item) => <button key={item} type="button" className={item === grade ? "is-active" : ""} onClick={() => onGradeChange?.(item)}>Lớp {item}</button>)}
      </nav>
      <nav className="catalog-chapter-route" aria-label={`Lộ trình Lớp ${grade}`}>
        <div className="catalog-route-heading"><span>Lộ trình Lớp {grade}</span><small>Chạm một chặng để xem các bài bên trong</small></div>
        <ol>
          {route.map((item) => <li key={item.chapter} className={`catalog-route-item ${item.state} ${item.chapter === chapter ? "is-current" : ""}`}>
            <button type="button" onClick={() => onChapterChange?.(item.chapter)} aria-current={item.chapter === chapter ? "step" : undefined}>
              <span className="catalog-route-marker">{item.complete ? "✓" : item.chapter}</span>
              <span className="catalog-route-copy"><strong>Chặng {item.chapter}</strong><b>{item.title}</b><small>{item.subject} · {item.completedCount}/{item.totalCount} bài · {item.state === "locked" ? "Cần đi tiếp từ chặng trước" : item.state === "completed" ? "Đã khôi phục" : "Đang mở"}</small></span>
              <span className="catalog-route-arrow" aria-hidden="true">{item.chapter === chapter ? "●" : "›"}</span>
            </button>
          </li>)}
        </ol>
      </nav>

      <div className="catalog-level-grid" aria-label={`Các level Lớp ${grade} Chương ${chapter}`}>
        {levels.map((level) => {
          const status = levelStatus(level, progress);
          const outcome = progress.outcomes[level.id];
          const playable = status === "available" || status === "completed";
          return (
            <article key={level.id} className={`catalog-level-card ${status} ${level.type !== "standard" ? "is-boss" : ""}`}>
              <div className="catalog-level-number"><span>{level.order}</span>{level.type !== "standard" && <small>BOSS</small>}</div>
              <div className="catalog-level-copy">
                <small>{level.mechanicId} · {level.difficulty.tier} · {level.subject}</small>
                <h2>{level.titleVi}</h2>
                <p>{level.learningObjectiveVi}</p>
                {outcome && <span className="catalog-evidence">Mastery {outcome.bestMastery}/3 · {outcome.completions} lần hoàn tất</span>}
              </div>
              <div className="catalog-level-actions">
                <button type="button" className="runtime-primary-button catalog-level-button" disabled={!playable} onClick={() => onStart(level)}>{status === "completed" ? "Chơi lại" : "Vào chặng"}</button>
                {!playable && <button type="button" className="catalog-review-button" onClick={() => onPreview?.(level)}>Thử bản review</button>}
              </div>
            </article>
          );
        })}
      </div>

      <section className="catalog-boundary-card" aria-label="Tiến độ chương">
        <div><span>Lớp {grade} · Chương {chapter}</span><b>{chapterProgress.complete ? "Chương đã hoàn tất." : "Tiến độ chương hiện tại"}</b><small>{chapterProgress.complete ? `Level tiếp theo: ${nextBoundary?.id ?? "đã hết dữ liệu"}.` : `Level có thể chơi tiếp: ${nextInChapter?.id ?? "cần hoàn tất prerequisite ở chương trước"}.`}</small></div>
        <span className="catalog-boundary-icon" aria-hidden="true">◇</span>
      </section>
      <button type="button" className="catalog-back-link" onClick={onBack}>← Về trang chính</button>
    </main>
  );
}

export function CatalogCompletionView({ level, result, reviewOnly = false, onContinue, onReplay }) {
  const rewards = result?.earnedRewards ?? { knowledgeEnergy: 0, knowledgeShards: 0 };
  const firstClear = result?.firstClear === true;
  const isBoss = level?.type !== "standard";
  return (
    <main className={`catalog-completion-view ${isBoss ? "is-boss" : ""}`} aria-labelledby="catalog-completion-title">
      <div className="catalog-completion-orb"><span>✦</span></div>
      <p className="catalog-kicker">{reviewOnly ? "Bản review · không ghi tiến độ" : isBoss ? "Checkpoint hồi sinh" : "Bằng chứng học tập đã ghi"}</p>
      <h1 id="catalog-completion-title">{isBoss ? "Cây Đếm Sao đã sáng lại." : "Mạch ánh sáng đã hoàn tất."}</h1>
      <p className="catalog-completion-lead">{level?.titleVi}</p>
      <section className="catalog-reward-panel"><div><span>Mastery</span><b>{result?.mastery ?? 0}/3</b></div><div><span>Lượt thử</span><b>{result?.attempts ?? 0}</b></div><div><span>Lần hỗ trợ</span><b>{result?.supportsUsed ?? 0}</b></div><div><span>Độ chính xác</span><b>{Math.round((result?.accuracy ?? 0) * 100)}%</b></div></section>
      {!reviewOnly && <section className="catalog-reward-panel reward-values"><div><span>Năng lượng Tri thức</span><b>+{rewards.knowledgeEnergy}</b></div><div><span>Mảnh Tri thức</span><b>+{rewards.knowledgeShards}</b></div><div><span>Sổ thưởng</span><b>{firstClear ? "Lần đầu" : "Chơi lại · không cộng"}</b></div></section>}
      <p className="catalog-completion-note">{reviewOnly ? "Đây là bản review để kiểm tra logic. Kết quả không mở khóa chặng và không nhận thưởng." : isBoss ? "Mỗi phase và checkpoint được giữ lại; không reset toàn bộ boss." : "Chơi lại vẫn ghi evidence tốt hơn nhưng không nhân reward."}</p>
      <div className="catalog-completion-actions"><button type="button" className="runtime-primary-button" onClick={onContinue}>Về bản đồ</button><button type="button" className="catalog-back-link" onClick={onReplay}>Chơi lại chặng này</button></div>
    </main>
  );
}
