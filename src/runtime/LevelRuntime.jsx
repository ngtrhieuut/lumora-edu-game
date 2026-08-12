import { useEffect, useMemo, useRef, useState } from "react";

import { createRuleBasedOracleProvider, FALLBACK_HINT } from "../services/oracleProvider.js";
import { getRuntimePhaseContent, resolveLevelRuntime } from "./levelRuntimeAdapter.js";
import {
  completeRuntimePhase,
  createLevelRuntimeState,
  finishLevelRuntime,
  getActiveRuntimePhaseId,
  recordRuntimeAction,
  recordRuntimeAttempt,
  recordRuntimeSupport,
  normalizeLevelRuntimeState,
  startLevelRuntime,
} from "./levelRuntimeEngine.js";
import { RuntimeMechanicRenderer } from "./levelRuntimeRenderers.jsx";

const CATALOG_HINTS = Object.freeze({
  collect: ["Quan sát những vật đang phát sáng.", "Đếm từng vật một rồi đưa vật sáng về Lõi.", "Hãy bắt đầu với hạt có ký hiệu ✦."],
  "slot-fill": ["Nhìn số ở giữa trước khi chọn mảnh.", "Ô trước đi lùi một bước, ô sau tiến một bước.", "Đưa mảnh đang được soi sáng vào slot còn thiếu."],
  sort: ["So sánh số vật trong từng nhóm.", "Nhóm có nhiều dấu sáng hơn sẽ vào cổng Nhiều hơn.", "Đếm chậm từng nhóm rồi chọn đúng cổng."],
  path: ["Đường đi sáng theo thứ tự từ nhỏ đến lớn.", "Tìm bậc kế tiếp trong dãy.", "Chọn số đang được gọi sáng."],
  "build-repair": ["Tổ cần đủ số vật trong mục tiêu.", "Đếm ô còn thiếu rồi chọn một mảnh.", "Mạch chỉ cần mảnh vừa khớp với ô đang sáng."],
  simulation: ["Quan sát hai nhánh sau khi chia.", "Tổng của hai nhánh phải giữ nguyên.", "Chọn cách chia vẫn giữ đủ số hạt ban đầu."],
  match: ["Hai nhóm sẽ cùng đi về một Lõi.", "Gộp rồi đếm tổng số dấu sáng.", "Chọn dòng tạo ra tổng đang được gọi."],
  sequence: ["Nhìn nhịp trước và sau khi bớt vật.", "Tìm bước kế tiếp thay vì đoán nhanh.", "Chọn số làm máy giữ lại đúng lượng."],
  observation: ["Quan sát từng nhóm đồ dùng.", "Mỗi bạn cần một vật tương ứng.", "Chọn cảnh có đủ các nhóm bằng nhau."],
  boss: ["Mỗi mạch dùng lại một điều con đã học.", "Checkpoint sẽ giữ lại phase đã hoàn thành.", "Con có thể nhờ Mạch soi thao tác kế tiếp."],
  data: ["Nhìn chiều cao các cột sáng.", "Dùng bằng chứng trong biểu đồ.", "Chọn tín hiệu nổi bật nhất."],
});

const LOCAL_CATALOG_ORACLE = createRuleBasedOracleProvider(CATALOG_HINTS);

function safeHint(provider, request, fallbackProvider = LOCAL_CATALOG_ORACLE) {
  try {
    const result = provider?.getHint?.(request);
    if (result && typeof result.then === "function") return { type: "async", promise: result };
    if (result && typeof result.text === "string" && result.text.trim()) return { type: "sync", hint: result };
  } catch {
    // A provider is optional. The local deterministic fallback is required.
  }
  return { type: "sync", hint: fallbackProvider.getHint(request) };
}

function safeAudio(audioProvider, method, ...args) {
  try {
    const callback = audioProvider?.[method];
    if (typeof callback === "function") void callback.call(audioProvider, ...args);
  } catch {
    // Audio is an enhancement and must never block the level.
  }
}

export default function LevelRuntime({
  level,
  progress = null,
  profile = null,
  reviewOnly = false,
  oracleProvider = LOCAL_CATALOG_ORACLE,
  audioProvider = null,
  onComplete = () => {},
  onExit = () => {},
  onPhaseCheckpoint = () => {},
}) {
  const adapted = useMemo(() => resolveLevelRuntime(level), [level]);
  const [runtimeState, setRuntimeState] = useState(() => adapted.ok
    ? createLevelRuntimeState(level, { phaseIds: adapted.phaseIds })
    : null);
  const [notice, setNotice] = useState("Quan sát cảnh rồi chạm theo cách của con.");
  const [noticeTone, setNoticeTone] = useState("calm");
  const [finishing, setFinishing] = useState(false);
  const runtimeStateRef = useRef(runtimeState);
  const durationRef = useRef(0);
  const completionTimerRef = useRef(null);

  useEffect(() => {
    runtimeStateRef.current = runtimeState;
  }, [runtimeState]);

  useEffect(() => {
    if (!adapted.ok) return undefined;
    const checkpoint = reviewOnly ? null : progress?.runtimeCheckpoints?.[level.id];
    const seeded = createLevelRuntimeState(level, { phaseIds: adapted.phaseIds });
    const resumed = checkpoint
      ? normalizeLevelRuntimeState({ ...seeded, ...checkpoint }, level, { phaseIds: adapted.phaseIds })
      : seeded;
    const started = startLevelRuntime(resumed);
    runtimeStateRef.current = started;
    setRuntimeState(started);
    setNotice("Mạch đang lắng nghe. Con cứ thử theo cách của mình.");
    setNoticeTone("calm");
    setFinishing(false);
    durationRef.current = 0;
    return undefined;
  }, [adapted.ok, adapted.phaseIds, level, reviewOnly]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible" && document.hasFocus()) durationRef.current += 1;
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => () => {
    if (completionTimerRef.current !== null) window.clearTimeout(completionTimerRef.current);
  }, []);

  const runtimePhaseForHints = adapted.ok
    ? adapted.phases?.[runtimeState?.phaseIndex] ?? null
    : null;
  const hintMechanicId = runtimePhaseForHints?.mechanicId ?? level.mechanicId;
  const contentOracle = useMemo(() => {
    const phaseContent = runtimePhaseForHints
      ? getRuntimePhaseContent(runtimePhaseForHints, level)
      : adapted.content;
    const ladder = Array.isArray(phaseContent?.hintLadder) && phaseContent.hintLadder.length
      ? phaseContent.hintLadder
      : CATALOG_HINTS[hintMechanicId] ?? CATALOG_HINTS.observation;
    return createRuleBasedOracleProvider({ [hintMechanicId]: ladder });
  }, [adapted.content, hintMechanicId, level, runtimePhaseForHints]);

  if (!adapted.ok) {
    return (
      <section className="level-runtime-shell runtime-error" aria-labelledby="runtime-error-title">
        <header className="runtime-header"><button type="button" className="runtime-exit-button" onClick={onExit} aria-label="Quay lại">←</button><div><span>Level Runtime</span><h1 id="runtime-error-title">Chặng chưa sẵn sàng</h1></div></header>
        <div className="runtime-empty-state"><span>◇</span><p>{adapted.errors.join(" ")}</p><button type="button" className="runtime-primary-button" onClick={onExit}>Quay lại bản đồ</button></div>
      </section>
    );
  }

  const state = runtimeState ?? createLevelRuntimeState(level, { phaseIds: adapted.phaseIds });
  const supportPlan = oracleProvider?.getSupportPlan?.({
    ageBand: profile?.ageBand,
    bestMastery: progress?.outcomes?.[level.id]?.bestMastery,
    completions: progress?.outcomes?.[level.id]?.completions,
  }) ?? { id: "balanced", autoHintAfter: 2 };
  const currentPhase = adapted.phases[state.phaseIndex] ?? null;
  const isBoss = adapted.rendererId === "boss";

  function applyState(nextState) {
    runtimeStateRef.current = nextState;
    setRuntimeState(nextState);
    return nextState;
  }

  function handleAction() {
    applyState(recordRuntimeAction(runtimeStateRef.current ?? state));
  }

  function showHint(levelNumber, errorCode = null, { guided = false, trigger = "manual" } = {}) {
    const request = { type: hintMechanicId, level: levelNumber, errorCode };
    const result = safeHint(oracleProvider, request, contentOracle);
    const applyHint = (hint) => {
      const safe = hint && typeof hint.text === "string" && hint.text.trim() ? hint : contentOracle.getHint(request);
      const next = recordRuntimeSupport(runtimeStateRef.current ?? state, { hintLevel: safe.level ?? levelNumber, guided });
      applyState(next);
      setNotice(safe.text || FALLBACK_HINT);
      setNoticeTone(guided ? "guided" : "hint");
      safeAudio(audioProvider, "playCue", guided ? "success" : "hint", { dedupeKey: `${level.id}-hint-${safe.level ?? levelNumber}` });
      safeAudio(audioProvider, "narrate", safe.text || FALLBACK_HINT, { dedupeKey: `${level.id}-hint-${safe.level ?? levelNumber}-${trigger}` });
    };
    if (result.type === "async") {
      void Promise.resolve(result.promise).then(applyHint).catch(() => applyHint(contentOracle.getHint(request)));
      return;
    }
    applyHint(result.hint);
  }

  function handleAttempt({ correct = false, errorCode = null, message = null } = {}) {
    let next = recordRuntimeAction(runtimeStateRef.current ?? state);
    next = recordRuntimeAttempt(next, { correct, errorCode });
    applyState(next);
    if (correct) {
      setNotice(isBoss ? "Mạch đã nhận đúng. Ánh sáng được giữ ở checkpoint." : "Đúng rồi. Mạch đang sáng thêm.");
      setNoticeTone("success");
      safeAudio(audioProvider, "playCue", "success", { dedupeKey: `${level.id}-correct-${next.attempts}` });
      return;
    }
    setNotice(message || "Mạch chưa nhận được thao tác này. Con thử lại nhé.");
    setNoticeTone("nudge");
    safeAudio(audioProvider, "playCue", "soft-fail", { dedupeKey: `${level.id}-fail-${next.attempts}` });
    if (next.hintLevel === 0 && next.attempts >= supportPlan.autoHintAfter) showHint(1, errorCode, { trigger: "auto" });
  }

  function askSupport() {
    const current = runtimeStateRef.current ?? state;
    if (current.hintLevel < 3) {
      showHint(current.hintLevel + 1, current.lastErrorCode, { trigger: "manual" });
      return;
    }
    if (!current.guided) showHint(3, current.lastErrorCode, { guided: true, trigger: "guided" });
  }

  function finishCurrentLevel(baseState = runtimeStateRef.current ?? state) {
    const result = finishLevelRuntime(baseState, level, { durationSeconds: durationRef.current });
    if (!result.completed) return;
    applyState({ ...baseState, status: "completed" });
    setFinishing(true);
    safeAudio(audioProvider, isBoss ? "playCue" : "playCue", isBoss ? "evolution" : "success", { dedupeKey: `${level.id}-complete` });
    completionTimerRef.current = window.setTimeout(() => {
      completionTimerRef.current = null;
      onComplete(result);
    }, 260);
  }

  function handleFinish() {
    finishCurrentLevel();
  }

  function handlePhaseFinish(phase, phaseIndex, advance) {
    const current = runtimeStateRef.current ?? state;
    const phaseId = phase?.id ?? current.phaseIds[phaseIndex];
    const transition = completeRuntimePhase(current, phaseId);
    if (!transition.accepted) return;
    applyState(transition.state);
    onPhaseCheckpoint(transition.state.checkpoint);
    setNotice(transition.complete ? "Lõi Tri Thức đã cộng hưởng đủ." : "Checkpoint đã lưu. Mạch tiếp theo đang chờ.");
    setNoticeTone("success");
    advance?.();
    if (transition.complete) finishCurrentLevel(transition.state);
  }

  const progressLabel = isBoss
    ? `Checkpoint ${Math.min(state.phaseIndex + 1, adapted.phases.length)}/${adapted.phases.length}`
    : `Chặng ${level.order}/100`;

  return (
    <section className={`level-runtime-shell ${isBoss ? "is-boss" : ""} ${reviewOnly ? "is-review-only" : ""} ${finishing ? "is-finishing" : ""}`} aria-labelledby="runtime-level-title">
      <header className="runtime-header">
        <button type="button" className="runtime-exit-button" onClick={onExit} aria-label="Quay lại bản đồ">←</button>
        <div className="runtime-header-copy"><span>Lớp {level.grade} · Chương {level.chapter} · {level.chapterTitleVi}</span><h1 id="runtime-level-title">{level.titleVi}</h1></div>
        <strong className="runtime-level-counter">{progressLabel}</strong>
      </header>
      {reviewOnly && <div className="runtime-review-banner" role="status">Bản review: chơi thật để kiểm tra logic, không ghi mở khóa, checkpoint hoặc reward.</div>}
      <div className="runtime-objective"><span aria-hidden="true">{isBoss ? "◆" : "✦"}</span><div><b>{level.learningObjectiveVi}</b><small>{level.designBriefVi}</small></div></div>
      <div className="runtime-body">
        <div className="runtime-nubi"><span>✦</span><div><b>Nubi</b><small>{noticeTone === "guided" ? "Mạch đang soi bước cuối." : "Con vẫn là người điều khiển."}</small></div></div>
        <div className="runtime-board-container">
          <RuntimeMechanicRenderer rendererId={adapted.rendererId} level={level} content={adapted.content} phases={adapted.phases} initialPhaseIndex={state.phaseIndex} guided={state.guided} onAction={handleAction} onAttempt={handleAttempt} onFinish={handleFinish} onPhaseFinish={handlePhaseFinish} />
        </div>
      </div>
      <aside className={`runtime-oracle-dock ${noticeTone}`} aria-live="polite">
        <div><span>MẠCH · GỢI Ý {state.hintLevel}/3</span><p>{notice}</p></div>
        <button type="button" className="runtime-support-button" onClick={askSupport} disabled={finishing || (state.hintLevel >= 3 && state.guided)}>Nhờ Mạch gợi ý</button>
      </aside>
      {finishing && <div className="runtime-success-burst" role="status" aria-live="polite"><span>✦</span><b>{isBoss ? "Lõi Tri Thức đã được hồi sinh." : "Mạch ánh sáng đã hoàn tất."}</b><small>{reviewOnly ? "Bản review không ghi tiến độ." : "Reward chỉ ghi một lần ở lần hoàn tất đầu tiên."}</small></div>}
      {currentPhase && isBoss && <span className="sr-only">Đang ở phase {currentPhase.index + 1}: {currentPhase.labelVi}</span>}
    </section>
  );
}

export { CATALOG_HINTS, LOCAL_CATALOG_ORACLE };
