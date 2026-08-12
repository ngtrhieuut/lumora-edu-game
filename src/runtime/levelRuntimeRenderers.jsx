import { useMemo, useState } from "react";

import { getRuntimePhaseContent } from "./levelRuntimeAdapter.js";

function RuntimeBoardFrame({ label, status, children }) {
  return (
    <div className="runtime-board-frame" aria-label={label}>
      <div className="runtime-board-status" role="status" aria-live="polite"><span>Trạm thao tác</span><strong>{status}</strong></div>
      {children}
    </div>
  );
}

function RuntimeInstructions({ content }) {
  const steps = Array.isArray(content?.steps) ? content.steps : [];
  if (!content?.guideTitleVi && steps.length === 0) return null;
  return (
    <section className="runtime-instructions" aria-label="Cách chơi">
      <div className="runtime-instructions-heading"><span aria-hidden="true">?</span><div><b>{content.guideTitleVi ?? "Cách chơi"}</b><small>{content.objectiveVi ?? "Làm từng bước, không cần vội."}</small></div></div>
      <ol>{steps.slice(0, 3).map((step, index) => <li key={`${index}-${step}`}><b>{index + 1}</b><span>{step}</span></li>)}</ol>
      {content.ruleVi && <p><strong>Quy tắc:</strong> {content.ruleVi}</p>}
    </section>
  );
}

function RuntimeToken({ children, selected = false, guided = false, disabled = false, onClick, className = "" }) {
  return (
    <button
      type="button"
      className={`runtime-token ${selected ? "is-selected" : ""} ${guided ? "is-guided" : ""} ${className}`.trim()}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function fail(onAttempt, errorCode, message) {
  onAttempt({ correct: false, errorCode, message });
}

function succeed(onAttempt) {
  onAttempt({ correct: true });
}

export function CollectRenderer({ content, guided, onAction, onAttempt, onFinish }) {
  const [picked, setPicked] = useState([]);
  const items = Array.isArray(content.items) ? content.items : [];
  const target = Number.isInteger(content.target) ? content.target : items.filter((item) => item.correct).length;
  const nextCorrect = items.find((item) => item.correct && !picked.includes(item.id));

  function choose(item) {
    if (picked.includes(item.id)) return;
    onAction();
    if (!item.correct) {
      fail(onAttempt, "wrong-object", "Hạt này còn ngủ. Hãy tìm hạt đang phát sáng.");
      return;
    }
    succeed(onAttempt);
    const next = [...picked, item.id];
    setPicked(next);
    if (next.length >= target) onFinish();
  }

  return (
    <RuntimeBoardFrame label="Cổng đếm và ghép số với số lượng" status={`${picked.length}/${target} hạt sáng`}>
      <div className="runtime-scene runtime-collect-scene"><span className="runtime-orb">✦</span><p>Đưa đủ hạt sáng về Lõi.</p><small>Không có đồng hồ đếm ngược.</small></div>
      <div className="runtime-token-grid" role="list" aria-label="Các hạt trong khu rừng">
        {items.map((item) => <RuntimeToken key={item.id} guided={guided && item === nextCorrect} disabled={picked.includes(item.id)} className={item.correct ? "is-light" : "is-dormant"} onClick={() => choose(item)}>{item.symbol ?? "✦"}</RuntimeToken>)}
      </div>
      <div className="runtime-target-core" aria-label="Lõi nhận hạt sáng"><b>{picked.length}</b><span>/ {target}</span><small>{picked.length === target ? "Lõi đã đủ ánh sáng." : "Chạm hạt sáng để nạp Lõi."}</small></div>
    </RuntimeBoardFrame>
  );
}

export function SlotFillRenderer({ content, guided, onAction, onAttempt, onFinish }) {
  const slots = Array.isArray(content.slots) ? content.slots : [];
  const choices = Array.isArray(content.choices) ? content.choices : [];
  const centerValue = content.centerValue ?? 3;
  const [selected, setSelected] = useState(null);
  const [filled, setFilled] = useState({});
  const nextSlot = slots.find((slot) => filled[slot.id] === undefined);

  function place(slot) {
    onAction();
    if (selected === null) {
      fail(onAttempt, "no-selection", "Hãy chọn một mảnh rồi đưa vào ô đang sáng.");
      return;
    }
    if (filled[slot.id] !== undefined) return;
    if (selected !== slot.expected) {
      setSelected(null);
      fail(onAttempt, "wrong-slot", "Mảnh này chưa nối đúng vị trí. Hãy nhìn số ở giữa.");
      return;
    }
    succeed(onAttempt);
    const next = { ...filled, [slot.id]: selected };
    setFilled(next);
    setSelected(null);
    if (Object.keys(next).length === slots.length) onFinish();
  }

  return (
    <RuntimeBoardFrame label="Cầu Pha Lê với các slot số trước và sau" status={`${Object.keys(filled).length}/${slots.length} slot đã sáng`}>
      <div className="runtime-sequence-bridge"><span className="runtime-number-node">{centerValue}</span><span className="runtime-bridge-line" /><span className="runtime-number-node is-missing">?</span></div>
      <div className="runtime-slot-grid">
        {slots.map((slot) => <button key={slot.id} type="button" className={`runtime-slot ${filled[slot.id] !== undefined ? "is-filled" : ""} ${guided && nextSlot?.id === slot.id ? "is-guided" : ""}`} disabled={filled[slot.id] !== undefined} onClick={() => place(slot)}><span>{filled[slot.id] ?? "?"}</span><small>{slot.label}</small></button>)}
      </div>
      <div className="runtime-choice-row" aria-label="Các mảnh số">
        {choices.map((choice) => <RuntimeToken key={choice} selected={selected === choice} guided={guided && nextSlot?.expected === choice} disabled={Object.values(filled).includes(choice)} onClick={() => { onAction(); setSelected(choice); }}>{choice}</RuntimeToken>)}
      </div>
    </RuntimeBoardFrame>
  );
}

export function SortRenderer({ content, guided, onAction, onAttempt, onFinish }) {
  const items = Array.isArray(content.items) ? content.items : [];
  const buckets = Array.isArray(content.buckets) ? content.buckets : [];
  const [selected, setSelected] = useState(null);
  const [placed, setPlaced] = useState({});
  const nextItem = items.find((item) => placed[item.id] === undefined);

  function place(bucket) {
    onAction();
    if (!selected) {
      fail(onAttempt, "no-selection", "Hãy chọn một cụm vật trước khi đưa vào cổng.");
      return;
    }
    if (selected.bucket !== bucket.id) {
      setSelected(null);
      fail(onAttempt, "wrong-bucket", "Cổng này chưa hợp với số lượng đang nhìn thấy.");
      return;
    }
    succeed(onAttempt);
    const next = { ...placed, [selected.id]: bucket.id };
    setPlaced(next);
    setSelected(null);
    if (Object.keys(next).length === items.length) onFinish();
  }

  return (
    <RuntimeBoardFrame label="Tháp Cổ phân loại nhóm nhiều hơn và ít hơn" status={`${Object.keys(placed).length}/${items.length} cụm đã đặt`}>
      <div className="runtime-sort-scene"><span>◌</span>{items.map((item) => <span key={item.id}>{"✦ ".repeat(item.count).trim()}<small>{item.label}</small></span>)}<small>So sánh bằng mắt và đếm từng nhóm.</small></div>
      <div className="runtime-choice-row runtime-sort-items">
        {items.map((item) => <RuntimeToken key={item.id} selected={selected?.id === item.id} guided={guided && nextItem?.id === item.id} disabled={placed[item.id] !== undefined} onClick={() => { onAction(); setSelected(item); }}><span className="runtime-count-dots">{"✦ ".repeat(item.count).trim()}</span><small>{item.label}</small></RuntimeToken>)}
      </div>
      <div className="runtime-bucket-grid">
        {buckets.map((bucket) => <button key={bucket.id} type="button" className={`runtime-bucket ${guided && nextItem?.bucket === bucket.id ? "is-guided" : ""}`} onClick={() => place(bucket)}><span>{bucket.id === "more" ? "↑" : "↓"}</span><b>{bucket.label}</b></button>)}
      </div>
    </RuntimeBoardFrame>
  );
}

export function PathRenderer({ content, guided, onAction, onAttempt, onFinish }) {
  const sequence = Array.isArray(content.sequence) ? content.sequence : [1, 2, 3];
  const choices = Array.isArray(content.choices) ? content.choices : sequence;
  const [placed, setPlaced] = useState([]);
  const expected = sequence[placed.length];

  function choose(value) {
    if (placed.includes(value)) return;
    onAction();
    if (value !== expected) {
      fail(onAttempt, "wrong-path-step", "Con đường cần đi từ số nhỏ đến số lớn.");
      return;
    }
    succeed(onAttempt);
    const next = [...placed, value];
    setPlaced(next);
    if (next.length === sequence.length) onFinish();
  }

  return (
    <RuntimeBoardFrame label="Dòng Năng Lượng xếp các số thành đường đi" status={`${placed.length}/${sequence.length} bậc đã nối`}>
      <div className="runtime-path"><span className="runtime-path-tree">🌱</span>{sequence.map((value, index) => <span key={value} className={`runtime-path-step ${index < placed.length ? "is-lit" : index === placed.length ? "is-active" : ""}`}>{index < placed.length ? value : "?"}</span>)}<span className="runtime-path-tree">🌳</span></div>
      <div className="runtime-choice-row">
        {choices.map((value) => <RuntimeToken key={value} guided={guided && value === expected} disabled={placed.includes(value)} onClick={() => choose(value)}>{value}</RuntimeToken>)}
      </div>
      <p className="runtime-helper">Chọn bậc tiếp theo để Linh Thú leo lên cây.</p>
    </RuntimeBoardFrame>
  );
}

export function BuildRepairRenderer({ content, guided, onAction, onAttempt, onFinish }) {
  const target = Number.isInteger(content.target) ? content.target : 4;
  const choices = Array.isArray(content.choices) ? content.choices : Array.from({ length: target }, (_, index) => `piece-${index + 1}`);
  const slots = Array.from({ length: target }, (_, index) => index);
  const [selected, setSelected] = useState(null);
  const [filled, setFilled] = useState([]);
  const nextSlot = filled.length;

  function place(slot) {
    onAction();
    if (selected === null) {
      fail(onAttempt, "no-selection", "Hãy chọn một mảnh rồi sửa ô đang nhấp nháy.");
      return;
    }
    const expected = `firefly-${slot + 1}`;
    const correct = choices.includes(expected) ? selected === expected : selected !== "extra";
    if (!correct) {
      setSelected(null);
      fail(onAttempt, "wrong-piece", "Mảnh này chưa khớp với ô đang thiếu. Con thử mảnh khác nhé.");
      return;
    }
    succeed(onAttempt);
    const next = [...filled, selected];
    setFilled(next);
    setSelected(null);
    if (next.length === target) onFinish();
  }

  return (
    <RuntimeBoardFrame label="Kho Báu tạo đúng số lượng bằng các mảnh sáng" status={`${filled.length}/${target} ô tổ đã sáng`}>
      <div className="runtime-build-structure"><span className="runtime-build-roof">⌂</span><div>{slots.map((slot) => <button key={slot} type="button" className={`runtime-build-slot ${slot < filled.length ? "is-filled" : slot === nextSlot ? "is-active" : ""}`} onClick={() => place(slot)} disabled={slot < filled.length}>{slot < filled.length ? "✦" : "+"}</button>)}</div></div>
      <div className="runtime-choice-row">
        {choices.map((choice) => <RuntimeToken key={choice} selected={selected === choice} guided={guided && choice === `firefly-${nextSlot + 1}`} disabled={filled.includes(choice)} onClick={() => { onAction(); setSelected(choice); }}>{choice === "extra" ? "◇" : "✦"}</RuntimeToken>)}
      </div>
      <p className="runtime-helper">Đưa vừa đủ đom đóm vào tổ; mảnh thừa không làm mất lượt.</p>
    </RuntimeBoardFrame>
  );
}

export function SimulationRenderer({ content, guided, onAction, onAttempt, onFinish }) {
  const splits = Array.isArray(content.splits) ? content.splits : [];
  const options = splits.length ? splits : [
    { id: "safe", label: "Chia đều", left: 2, right: 2, correct: true },
    { id: "uneven", label: "Lệch nhánh", left: 1, right: 4, correct: false },
  ];
  const [chosen, setChosen] = useState(null);
  const correctId = content.correct ?? options.find((option) => option.correct)?.id ?? options[0]?.id;

  function choose(option) {
    if (chosen) return;
    onAction();
    if (option.id !== correctId && option.correct !== true) {
      fail(onAttempt, "unbalanced-split", "Hai nhánh cần giữ đủ số hạt ban đầu. Hãy thử cách chia khác.");
      return;
    }
    succeed(onAttempt);
    setChosen(option.id);
    onFinish();
  }

  return (
    <RuntimeBoardFrame label="Trạm Gió mô phỏng tách một nhóm thành hai phần" status={chosen ? "Hai nhánh đang giữ ánh sáng" : `${content.total ?? 6} hạt đang ở lõi`}>
      <div className="runtime-simulation-core"><span>{content.total ?? 6}</span><small>hạt trong Lõi</small><i>↙</i><i>↘</i></div>
      <div className="runtime-split-grid">
        {options.map((option) => <button key={option.id} type="button" className={`runtime-split-option ${chosen === option.id ? "is-chosen" : ""} ${guided && option.id === correctId ? "is-guided" : ""}`} onClick={() => choose(option)}><strong>{option.left} <span>+</span> {option.right}</strong><small>{option.label ?? "Cách chia này"}</small></button>)}
      </div>
    </RuntimeBoardFrame>
  );
}

export function MatchRenderer({ content, guided, onAction, onAttempt, onFinish }) {
  const pairs = Array.isArray(content.pairs) ? content.pairs : [];
  const [matched, setMatched] = useState([]);
  const nextPair = pairs.find((pair) => !matched.includes(pair.id));
  const targetTotal = pairs[0]?.total ?? 5;

  function choose(pair) {
    if (matched.includes(pair.id)) return;
    onAction();
    if (pair.total !== targetTotal) {
      fail(onAttempt, "merge-total", "Hai nhóm này chưa tạo ra dòng sáng cần tìm. Hãy gộp rồi đếm lại.");
      return;
    }
    succeed(onAttempt);
    const next = [...matched, pair.id];
    setMatched(next);
    if (next.length === pairs.length) onFinish();
  }

  return (
    <RuntimeBoardFrame label="Vườn Sáng gộp hai nhóm bằng thao tác trực quan" status={`${matched.length}/${pairs.length} dòng đã hợp nhất`}>
      <div className="runtime-merge-core"><span>✦</span><small>Hai nhóm → một Lõi</small></div>
      <div className="runtime-pair-grid">
        {pairs.map((pair) => <button key={pair.id} type="button" className={`runtime-pair-card ${matched.includes(pair.id) ? "is-matched" : ""} ${guided && nextPair?.id === pair.id ? "is-guided" : ""}`} onClick={() => choose(pair)} disabled={matched.includes(pair.id)}><span>{"✦ ".repeat(pair.left).trim()}</span><b>+</b><span>{"✦ ".repeat(pair.right).trim()}</span><strong>= {pair.total}</strong></button>)}
      </div>
    </RuntimeBoardFrame>
  );
}

export function SequenceRenderer({ content, guided, onAction, onAttempt, onFinish }) {
  const sequence = Array.isArray(content.sequence) ? content.sequence : null;
  const choices = Array.isArray(content.choices) ? content.choices : [];
  const [placed, setPlaced] = useState([]);
  const expected = sequence ? sequence[placed.length] : content.correct;
  const complete = sequence ? placed.length >= sequence.length : placed.length > 0;

  function choose(value) {
    if (complete) return;
    onAction();
    if (value !== expected) {
      fail(onAttempt, "wrong-sequence", sequence ? "Nhìn lại bậc đang thiếu rồi chọn số kế tiếp." : "Hãy tìm xem cần bớt bao nhiêu vật để còn đúng số.");
      return;
    }
    succeed(onAttempt);
    const next = [...placed, value];
    setPlaced(next);
    if (sequence ? next.length === sequence.length : true) onFinish();
  }

  return (
    <RuntimeBoardFrame label="Máy Cổ sắp xếp hoặc bớt vật theo trình tự" status={sequence ? `${placed.length}/${sequence.length} bước` : complete ? "Đã bớt đúng số vật" : `Nhóm đang có ${content.start ?? 5} vật`}>
      <div className="runtime-subtract-scene"><span>{"✦ ".repeat(Math.max(0, (content.start ?? 5) - placed.length)).trim()}</span><small>{sequence ? "Xếp các bậc theo thứ tự." : "Gỡ vật bị corruption để giữ lại đúng lượng."}</small></div>
      <div className="runtime-choice-row">
        {choices.map((choice) => <RuntimeToken key={choice} guided={guided && choice === expected} disabled={placed.includes(choice)} onClick={() => choose(choice)}>{choice}</RuntimeToken>)}
      </div>
      <p className="runtime-helper">Mỗi lựa chọn đúng sẽ làm máy sáng thêm một nhịp.</p>
    </RuntimeBoardFrame>
  );
}

export function ObservationRenderer({ content, guided, onAction, onAttempt, onFinish }) {
  const scenes = Array.isArray(content.scenes) ? content.scenes : [];
  const [selected, setSelected] = useState(null);
  const correctScene = scenes.find((scene) => scene.correct) ?? scenes[0];

  function choose(scene) {
    if (selected) return;
    onAction();
    if (!scene.correct) {
      fail(onAttempt, "insufficient-evidence", "Hãy quan sát xem mỗi bạn đã có đủ đồ dùng chưa.");
      return;
    }
    succeed(onAttempt);
    setSelected(scene.id);
    onFinish();
  }

  return (
    <RuntimeBoardFrame label="Đường Sao quan sát bằng chứng trong cảnh" status={selected ? "Đã tìm thấy cảnh đủ đồ" : "Đang quan sát"}>
      <div className="runtime-observation-banner"><span>⌁</span><p>Không cần đoán nhanh. Hãy nhìn từng nhóm vật thể.</p></div>
      <div className="runtime-observation-grid">
        {scenes.map((scene) => <button key={scene.id} type="button" className={`runtime-observation-card ${selected === scene.id ? "is-selected" : ""} ${guided && scene.id === correctScene?.id ? "is-guided" : ""}`} onClick={() => choose(scene)}><strong>{scene.label}</strong><span>🪑 {scene.seats}　🥛 {scene.cups}　🍎 {scene.fruit}</span><small>Chạm để kiểm tra cảnh</small></button>)}
      </div>
    </RuntimeBoardFrame>
  );
}

export function DataRenderer({ content, guided, onAction, onAttempt, onFinish }) {
  const options = Array.isArray(content.options) && content.options.length ? content.options : [
    { id: "observe", label: "Quan sát biểu đồ", correct: true },
    { id: "guess", label: "Đoán ngay", correct: false },
  ];
  const [selected, setSelected] = useState(null);
  const correct = options.find((option) => option.correct) ?? options[0];

  function choose(option) {
    if (selected) return;
    onAction();
    if (!option.correct) {
      fail(onAttempt, "data-misread", "Hãy nhìn cột sáng cao hơn trước khi chọn.");
      return;
    }
    succeed(onAttempt);
    setSelected(option.id);
    onFinish();
  }

  return (
    <RuntimeBoardFrame label="Nhiệm vụ dữ liệu trực quan" status={selected ? "Đã đọc được tín hiệu" : "Đang đọc tín hiệu"}>
      <div className="runtime-data-chart" aria-label="Biểu đồ cột trực quan"><i style={{ height: "34%" }} /><i style={{ height: "68%" }} /><i style={{ height: "48%" }} /><i style={{ height: "82%" }} /></div>
      <div className="runtime-observation-grid">{options.map((option) => <button key={option.id} type="button" className={`runtime-observation-card ${selected === option.id ? "is-selected" : ""} ${guided && option.id === correct.id ? "is-guided" : ""}`} onClick={() => choose(option)}><strong>{option.label}</strong><small>Đưa bằng chứng vào quyết định</small></button>)}</div>
    </RuntimeBoardFrame>
  );
}

function UnsupportedRenderer({ mechanicId }) {
  return <RuntimeBoardFrame label="Mechanic chưa được hỗ trợ" status="Cần bổ sung renderer"><div className="runtime-empty-state"><span>◇</span><p>Mechanic <b>{mechanicId ?? "unknown"}</b> chưa có renderer an toàn trong bản này.</p><small>Level vẫn được giữ nguyên, không tự động coi là hoàn thành.</small></div></RuntimeBoardFrame>;
}

export function BossRenderer({ level, phases, initialPhaseIndex = 0, guided, onAction, onAttempt, onPhaseFinish }) {
  const [handoff, setHandoff] = useState(null);
  const safePhaseIndex = Math.min(phases.length, Math.max(0, Number.isFinite(initialPhaseIndex) ? Math.trunc(initialPhaseIndex) : 0));
  const phase = phases[safePhaseIndex];
  const phaseContent = useMemo(() => getRuntimePhaseContent(phase, level), [level, phase]);
  if (!phases.length) return <UnsupportedRenderer mechanicId="boss-phase" />;

  function finishPhase() {
    if (handoff) return;
    onPhaseFinish(phase, safePhaseIndex, () => {
      setHandoff({ nextIndex: safePhaseIndex + 1 });
    });
  }

  return (
    <RuntimeBoardFrame label="Boss chữa lành nhiều phase" status={`Mạch ${Math.min(safePhaseIndex + 1, phases.length)}/${phases.length}`}>
      <div className="runtime-boss-core"><span>◆</span><div><b>{level.titleVi}</b><small>{handoff ? "Mạch vừa hoàn tất, checkpoint đã lưu." : phase.labelVi}</small></div></div>
      <div className="runtime-phase-strip" aria-label="Các checkpoint của boss">{phases.map((item, index) => <span key={item.id} className={index < safePhaseIndex ? "is-done" : index === safePhaseIndex ? "is-active" : ""}><b>{index < safePhaseIndex ? "✓" : index + 1}</b><small>{item.labelVi}</small></span>)}</div>
      {!handoff && phase ? (
        <div className="runtime-boss-phase" key={phase.id}><RuntimeMechanicRenderer rendererId={phase.rendererId} level={level} content={phaseContent} guided={guided} onAction={onAction} onAttempt={onAttempt} onFinish={finishPhase} /></div>
      ) : safePhaseIndex < phases.length ? (
        <div className="runtime-phase-handoff" role="status"><span>✦</span><b>Checkpoint đã lưu</b><small>Mạch tiếp theo: {phases[safePhaseIndex]?.labelVi ?? "hoàn tất"}.</small><button type="button" className="runtime-primary-button" onClick={() => setHandoff(null)}>Tiếp tục chữa lành</button></div>
      ) : (
        <div className="runtime-phase-handoff" role="status"><span>✦</span><b>Lõi Tri Thức đã cộng hưởng</b><small>Toàn bộ phase đã được giữ lại.</small></div>
      )}
    </RuntimeBoardFrame>
  );
}

export function RuntimeMechanicRenderer({ rendererId, level, content, phases = [], initialPhaseIndex = 0, guided = false, onAction = () => {}, onAttempt = () => {}, onFinish = () => {}, onPhaseFinish = () => {} }) {
  let board;
  if (rendererId === "collect") board = <CollectRenderer content={content} guided={guided} onAction={onAction} onAttempt={onAttempt} onFinish={onFinish} />;
  else if (rendererId === "slot-fill") board = <SlotFillRenderer content={content} guided={guided} onAction={onAction} onAttempt={onAttempt} onFinish={onFinish} />;
  else if (rendererId === "sort") board = <SortRenderer content={content} guided={guided} onAction={onAction} onAttempt={onAttempt} onFinish={onFinish} />;
  else if (rendererId === "path") board = <PathRenderer content={content} guided={guided} onAction={onAction} onAttempt={onAttempt} onFinish={onFinish} />;
  else if (rendererId === "build-repair") board = <BuildRepairRenderer content={content} guided={guided} onAction={onAction} onAttempt={onAttempt} onFinish={onFinish} />;
  else if (rendererId === "simulation" || rendererId === "resource-balance") board = <SimulationRenderer content={content} guided={guided} onAction={onAction} onAttempt={onAttempt} onFinish={onFinish} />;
  else if (rendererId === "match") board = <MatchRenderer content={content} guided={guided} onAction={onAction} onAttempt={onAttempt} onFinish={onFinish} />;
  else if (rendererId === "sequence") board = <SequenceRenderer content={content} guided={guided} onAction={onAction} onAttempt={onAttempt} onFinish={onFinish} />;
  else if (rendererId === "observation") board = <ObservationRenderer content={content} guided={guided} onAction={onAction} onAttempt={onAttempt} onFinish={onFinish} />;
  else if (rendererId === "data" || rendererId === "lab") board = <DataRenderer content={content} guided={guided} onAction={onAction} onAttempt={onAttempt} onFinish={onFinish} />;
  else if (rendererId === "boss") board = <BossRenderer level={level} phases={phases} initialPhaseIndex={initialPhaseIndex} guided={guided} onAction={onAction} onAttempt={onAttempt} onPhaseFinish={onPhaseFinish} />;
  else board = <UnsupportedRenderer mechanicId={level?.mechanicId} />;
  return <><RuntimeInstructions content={content} />{board}</>;
}
