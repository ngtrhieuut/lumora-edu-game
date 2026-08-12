import { getChapterLevels, getLevelById } from "../levelCatalog/index.js";
import { getChapterProgress, getNextPlayableLevel, isLevelUnlocked } from "./catalogProgression.js";

const WIRED_MAX_ORDER = 10;

function levelStatus(level, progress) {
  if (progress.completedLevelIds.includes(level.id)) return "completed";
  if (level.order <= WIRED_MAX_ORDER && isLevelUnlocked(level.id, progress)) return "available";
  return "locked";
}

export function CatalogMapView({ progress, onStart, onBack }) {
  const levels = getChapterLevels(1, 1);
  const chapterProgress = getChapterProgress(progress, 1, 1);
  const nextWired = getNextPlayableLevel(progress, levels, { maxOrder: WIRED_MAX_ORDER, grade: 1 });
  const nextBoundary = getNextPlayableLevel(progress, undefined, { grade: 1 });
  return (
    <main className="catalog-map-view" aria-labelledby="catalog-map-title">
      <header className="catalog-map-header">
        <button type="button" className="runtime-exit-button" onClick={onBack} aria-label="Quay lại trang chính">←</button>
        <div><span>Level Runtime v1 · Grade 1</span><h1 id="catalog-map-title">Những Mảnh Sáng Đầu Tiên</h1><p>Khôi phục Cây Đếm Sao bằng thao tác, quan sát và bằng chứng học tập.</p></div>
        <div className="catalog-progress-orb"><b>{chapterProgress.completedCount}</b><small>/{chapterProgress.totalCount} level</small></div>
      </header>
      <section className="catalog-map-intro"><span aria-hidden="true">✦</span><div><b>Explore → mechanic → evidence → restoration</b><small>Không timer áp lực · hỗ trợ Oracle local · replay không nhân reward.</small></div></section>
      <div className="catalog-level-grid" aria-label="Các level Chapter 1">
        {levels.map((level) => {
          const status = levelStatus(level, progress);
          const outcome = progress.outcomes[level.id];
          const playable = status === "available" && level.order <= WIRED_MAX_ORDER;
          return (
            <article key={level.id} className={`catalog-level-card ${status} ${level.type !== "standard" ? "is-boss" : ""}`}>
              <div className="catalog-level-number"><span>{level.order}</span>{level.type !== "standard" && <small> BOSS</small>}</div>
              <div className="catalog-level-copy"><small>{level.mechanicId} · {level.difficulty.tier}</small><h2>{level.titleVi}</h2><p>{level.learningObjectiveVi}</p>{outcome && <span className="catalog-evidence">Mastery {outcome.bestMastery}/3 · {outcome.completions} lần hoàn tất</span>}</div>
              <button type="button" className="runtime-primary-button catalog-level-button" disabled={!playable} onClick={() => onStart(level)}>{status === "completed" ? "Chơi lại" : playable ? "Vào chặng" : status === "locked" ? "Chưa mở" : "Đã sẵn sàng"}</button>
            </article>
          );
        })}
      </div>
      <section className="catalog-boundary-card" aria-label="Ranh giới Chapter 2">
        <div><span>Chapter 2 · Cầu Ánh Sáng</span><b>{chapterProgress.complete ? "Ranh giới đã sẵn sàng." : "Checkpoint của Chapter 1"}</b><small>{chapterProgress.complete ? `Level tiếp theo: ${nextBoundary?.id ?? getLevelById("g1-l011")?.id ?? "g1-l011"}. Runtime v1 sẽ giữ dữ liệu prerequisite.` : `Level kế tiếp hiện tại: ${nextWired?.id ?? "g1-l001"}.`}</small></div>
        <span className="catalog-boundary-icon" aria-hidden="true">◇</span>
      </section>
      <button type="button" className="catalog-back-link" onClick={onBack}>← Về trang chính</button>
    </main>
  );
}

export function CatalogCompletionView({ level, result, onContinue, onReplay }) {
  const rewards = result?.earnedRewards ?? { knowledgeEnergy: 0, knowledgeShards: 0 };
  const firstClear = result?.firstClear === true;
  const isBoss = level?.type !== "standard";
  return (
    <main className={`catalog-completion-view ${isBoss ? "is-boss" : ""}`} aria-labelledby="catalog-completion-title">
      <div className="catalog-completion-orb"><span>✦</span></div>
      <p className="catalog-kicker">{isBoss ? "Restoration checkpoint" : "Learning evidence recorded"}</p>
      <h1 id="catalog-completion-title">{isBoss ? "Cây Đếm Sao đã sáng lại." : "Mạch ánh sáng đã hoàn tất."}</h1>
      <p className="catalog-completion-lead">{level?.titleVi}</p>
      <section className="catalog-reward-panel"><div><span>Mastery</span><b>{result?.mastery ?? 0}/3</b></div><div><span>Attempts</span><b>{result?.attempts ?? 0}</b></div><div><span>Supports</span><b>{result?.supportsUsed ?? 0}</b></div><div><span>Accuracy</span><b>{Math.round((result?.accuracy ?? 0) * 100)}%</b></div></section>
      <section className="catalog-reward-panel reward-values"><div><span>Knowledge Energy</span><b>+{rewards.knowledgeEnergy}</b></div><div><span>Knowledge Shards</span><b>+{rewards.knowledgeShards}</b></div><div><span>Reward ledger</span><b>{firstClear ? "First clear" : "Replay · no farm"}</b></div></section>
      <p className="catalog-completion-note">{isBoss ? "Mỗi phase và checkpoint vẫn được giữ lại; không có full reset." : "Lần chơi lại vẫn ghi evidence tốt hơn nhưng không nhân reward."}</p>
      <div className="catalog-completion-actions"><button type="button" className="runtime-primary-button" onClick={onContinue}>Về bản đồ</button><button type="button" className="catalog-back-link" onClick={onReplay}>Chơi lại chặng này</button></div>
    </main>
  );
}
