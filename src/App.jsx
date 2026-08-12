import { useEffect, useMemo, useRef, useState } from "react";
import {
  cityBuildings,
  cityCosmetics,
  cityRestorationFeatures,
  environmentRestorationScenarios,
  getMasteryLabel,
  nubiEvolutionStages,
  nodes,
  optionalQuestIds,
  optionalQuests,
  orderedNodeIds,
  resourceRouteScenarios,
  worlds,
} from "./gameData";
import {
  equipCosmetic,
  getUnlockedBuildingIds,
  getUnlockedCosmeticIds,
  normalizeCityState,
  selectCityBuilding,
} from "./cityEngine";
import {
  createInitialProgress,
  isNodeUnlocked,
  normalizeProgress,
  recordLevelResult,
  recordPracticeSessionCompletion,
  getXpReward,
} from "./gameEngine";
import { addEnergy, ENERGY_TYPE_IDS, ENERGY_TYPES, getEnergyReward } from "./energyEngine";
import { createRuleBasedOracleProvider, LOCAL_ORACLE_PROVIDER } from "./services/oracleProvider";
import { createLocalProfileStore } from "./services/profileStore";
import { createLocalProgressStore, LOCAL_PROGRESS_PROVIDER } from "./services/progressStore";
import { createLocalTelemetry } from "./telemetry";
import { usePointerDrop } from "./usePointerDrop";
import { createNubiFeedbackState, getNubiMood, transitionNubiFeedback } from "./nubiFeedback";
import { getMultiStageConfig } from "./gameplayPhases";
import {
  advancePracticeSession,
  buildPracticeQueue,
  createPracticeSession,
  isPracticeSessionComplete,
  summarizePracticeSession,
} from "./practiceEngine";
import {
  createPracticeResume,
  createPracticeResumeStore,
  normalizePracticeResume,
} from "./practiceResume";
import { buildDiscoveryChallenge, placeDiscoveryFragment } from "./discoveryEngine";
import {
  buildDailyWeaveChallenge,
  createDailyWeaveState,
  getDailyWeaveProgress,
  getDailyWeaveTargetIds,
  placeDailyWeaveToken,
} from "./dailyWeaveEngine";
import { createBridgeState, getNextBridgeCrystal, placeBridgeCrystal } from "./bridgeEngine";
import { createShapeWorkshopState, getNextShape, placeShape } from "./shapeWorkshopEngine";
import { createScenarioState, getNextScenarioPortion, serveScenarioPortion } from "./scenarioEngine";
import { createOrderState, getOrderAvailableSlotIds, placeOrderItem } from "./orderEngine";
import {
  answerComparePair,
  createComparePairState,
  getComparePairProgress,
  getCurrentComparePair,
  getExpectedComparePairObjectId,
} from "./comparePairEngine";
import {
  chooseNumeral,
  createNumeralRecognitionState,
  getCurrentNumeralRound,
  getNumeralProgress,
} from "./numeralRecognitionEngine";
import { getPrototypeNode, prototypeNodes } from "./prototypeNodes";
import {
  createResourceRouteState,
  getResourceRouteProgress,
  getResourceRouteTargetIds,
  placeResource,
} from "./resourceRoutingEngine";
import {
  applyRestorationAction,
  createEnvironmentRestorationState,
  getEnvironmentRestorationProgress,
  getEnvironmentRestorationTargetIds,
} from "./environmentRestorationEngine";
import { completeBossPhase, createBossRestorationState } from "./bossRestorationEngine";
import { getLatestLearningProof, getMasteryTrend, rankSkillInsights, summarizeLearningActivity } from "./parentInsights";
import { buildLeagueSnapshot } from "./leagueEngine";
import { getQuestStatus, normalizeQuestState, recordQuestCompletion } from "./questEngine";
import { getNubiEvolutionStage, getNubiEvolutionTransition } from "./evolutionEngine";
import { getNubiResonance } from "./nubiResonance";
import { createNubiSignalState, getNubiSignal, transitionNubiSignal } from "./nubiSignal";
import { createOraclePresenceState, getOraclePresence, transitionOraclePresence } from "./oraclePresence";
import { buildRestorationProjection } from "./restorationProjectionEngine";
import {
  getActiveWorld,
  getNextWorld,
  getNextWorldNode,
  getWorldNodes,
  getWorldProgress,
  getWorldStatus,
  normalizeCampaignProgress,
} from "./campaignEngine";
import { createLocalAudioPreferenceStore, createLocalAudioProvider } from "./services/audioProvider";
import { getInteractionSpec } from "./interactionSpecs";
import { getInteractionAudioCue, normalizeInteractionRuntime } from "./interactionRuntime";
import { isGameplayFocusView } from "./hudFocus";
import { beginFirstSessionFlow, createFirstSessionFlow, transitionFirstSessionFlow } from "./firstSessionFlow";
import { getFirstSessionNumeralPrototype } from "./firstSessionPrototype";
import { createFirstSessionContinuation, transitionFirstSessionContinuation } from "./firstSessionContinuation";
import {
  createMasteryArcRegistry,
  findMasteryActivity,
  getMasteryArcReport,
  selectFirstSessionContinuationTarget,
} from "./masteryArc";
import {
  SESSION_LIMIT_OPTIONS,
  advanceSessionCompass,
  continueForOneStage,
  createSessionPreferenceStore,
  createSessionStateStore,
  getSessionCompassDisplay,
  normalizeSessionPreferences,
  pauseForSessionBreak,
  shouldPresentSessionBreak,
  startFreshSession,
} from "./sessionCompass";
import {
  PLAY_SESSION_DRAFT_STORAGE_KEY,
  advancePlaySessionDraft,
  createPlaySessionDraft,
  createPlaySessionDraftStore,
  normalizePlaySessionDraft,
} from "./playSessionDraft";
import { ALL_LEVELS, getLevelById } from "./levelCatalog/index.js";
import {
  createCatalogProgress,
  isLevelUnlocked,
  normalizeCatalogProgress,
  recordCatalogLevelResult,
} from "./runtime/catalogProgression.js";
import LevelRuntime from "./runtime/LevelRuntime.jsx";
import { CatalogCompletionView, CatalogMapView } from "./runtime/CatalogCampaignView.jsx";

const STORAGE_KEY = "lumora-rung-thuc-tinh-demo-v2";
const LEGACY_STORAGE_KEY = "lumora-rung-thuc-tinh-demo-v1";
const PROFILE_KEY = "lumora-child-profile-v1";
const PRACTICE_RESUME_KEY = "lumora-daily-adventure-resume-v1";
const PLAY_DRAFT_KEY = PLAY_SESSION_DRAFT_STORAGE_KEY;
const CATALOG_STORAGE_KEY = "lumora.catalog.progress.v1";

function getBrowserStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function getBrowserSessionStorage() {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function normalizeAppProgress(value) {
  const progress = normalizeCampaignProgress({ ...normalizeProgress(value, orderedNodeIds), campaignState: value?.campaignState }, worlds, nodes);
  const questState = normalizeQuestState(value?.questState, optionalQuestIds);
  const progressWithQuests = { ...progress, questState };
  return {
    ...progressWithQuests,
    cityState: normalizeCityState(progress.cityState, progressWithQuests, cityBuildings, cityCosmetics),
  };
}

function readProgress() {
  const storage = getBrowserStorage();
  const current = createLocalProgressStore({ storage, key: STORAGE_KEY }).load();
  if (current.ok) return normalizeAppProgress(current.data);
  const legacy = createLocalProgressStore({ storage, key: LEGACY_STORAGE_KEY }).load();
  return legacy.ok ? normalizeAppProgress(legacy.data) : normalizeAppProgress(createInitialProgress());
}

function readProfile() {
  const result = createLocalProfileStore({ storage: getBrowserStorage(), key: PROFILE_KEY }).load();
  return result.ok ? result.data : null;
}

function getPracticeDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function readPracticeResume() {
  const result = createPracticeResumeStore({ storage: getBrowserStorage(), key: PRACTICE_RESUME_KEY }).load();
  if (!result.ok) return null;
  return normalizePracticeResume(result.data, nodes, { dateKey: getPracticeDateKey() });
}

function readPlayDraft() {
  const result = createPlaySessionDraftStore({ storage: getBrowserStorage(), key: PLAY_DRAFT_KEY }).load();
  if (!result.ok) return null;
  return normalizePlaySessionDraft(result.data, {
    validNodeIds: orderedNodeIds,
    validQuestIds: optionalQuestIds,
  });
}

function readCatalogProgress() {
  const result = createLocalProgressStore({ storage: getBrowserStorage(), key: CATALOG_STORAGE_KEY }).load();
  return result.ok ? normalizeCatalogProgress(result.data, ALL_LEVELS) : createCatalogProgress();
}

function getPlayPhaseCount(node) {
  return getMultiStageConfig(node?.type)?.length ?? 1;
}

const MASTERY_ARC_REGISTRY = createMasteryArcRegistry({
  nodeDefinitions: nodes,
  questDefinitions: optionalQuests,
  worldDefinitions: worlds,
  phaseResolver: getMultiStageConfig,
});

export default function App() {
  const [booting, setBooting] = useState(true);
  const [profile, setProfile] = useState(readProfile);
  const [view, setView] = useState(() => (readProfile() ? "home" : "onboarding"));
  const [progress, setProgress] = useState(readProgress);
  const [catalogProgress, setCatalogProgress] = useState(readCatalogProgress);
  const [selectedCatalogLevelId, setSelectedCatalogLevelId] = useState("g1-l001");
  const [lastCatalogResult, setLastCatalogResult] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState("collect");
  const [selectedQuestId, setSelectedQuestId] = useState(null);
  const [roundKey, setRoundKey] = useState(0);
  const [lastResult, setLastResult] = useState(null);
  const [practiceSession, setPracticeSession] = useState(null);
  const [practicePuzzle, setPracticePuzzle] = useState(null);
  const [practiceDiscovery, setPracticeDiscovery] = useState(null);
  const [practiceCheckpoint, setPracticeCheckpoint] = useState(null);
  const [practiceSummary, setPracticeSummary] = useState(null);
  const [practiceResume, setPracticeResume] = useState(readPracticeResume);
  const [playDraft, setPlayDraft] = useState(readPlayDraft);
  const [mapIntro, setMapIntro] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [parentGateOpen, setParentGateOpen] = useState(false);
  const settingsButtonRef = useRef(null);
  const telemetry = useMemo(() => createLocalTelemetry(), []);
  const audioPreferenceStore = useMemo(() => createLocalAudioPreferenceStore({ storage: getBrowserStorage() }), []);
  const [audioPreferences, setAudioPreferences] = useState(() => audioPreferenceStore.load().data);
  const audio = useMemo(() => createLocalAudioProvider({ windowRef: typeof window === "undefined" ? undefined : window }), []);
  const sessionPreferenceStore = useMemo(() => createSessionPreferenceStore({ storage: getBrowserStorage() }), []);
  const [sessionPreferences, setSessionPreferences] = useState(() => sessionPreferenceStore.load().data);
  const [sessionCompass, setSessionCompass] = useState(() => createSessionStateStore({
    storage: getBrowserSessionStorage(),
    preferences: sessionPreferenceStore.load().data,
  }).load().data);
  const [sessionReturnView, setSessionReturnView] = useState("home");
  const [sessionBreakPreview, setSessionBreakPreview] = useState(false);
  const [reviewNodeId, setReviewNodeId] = useState(null);
  const [reviewPrototypeId, setReviewPrototypeId] = useState(null);
  const [previewWorldId, setPreviewWorldId] = useState(null);
  const [firstSessionFlow, setFirstSessionFlow] = useState(createFirstSessionFlow);
  const [firstSessionContinuation, setFirstSessionContinuation] = useState(createFirstSessionContinuation);

  useEffect(() => {
    const timer = window.setTimeout(() => setBooting(false), 520);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    createLocalProgressStore({ storage: getBrowserStorage(), key: STORAGE_KEY }).save(progress);
  }, [progress]);

  useEffect(() => {
    createLocalProgressStore({ storage: getBrowserStorage(), key: CATALOG_STORAGE_KEY }).save(catalogProgress);
  }, [catalogProgress]);

  useEffect(() => {
    const store = createPracticeResumeStore({ storage: getBrowserStorage(), key: PRACTICE_RESUME_KEY });
    if (practiceResume) store.save(practiceResume);
    else store.clear();
  }, [practiceResume]);

  useEffect(() => {
    const store = createPlaySessionDraftStore({ storage: getBrowserStorage(), key: PLAY_DRAFT_KEY });
    if (playDraft) store.save(playDraft);
    else store.clear();
  }, [playDraft]);

  useEffect(() => {
    if (!practiceResume) return;
    const completed = new Set(Array.isArray(progress.completed) ? progress.completed : []);
    if (practiceResume.session.queue.some((nodeId) => !completed.has(nodeId))) {
      setPracticeResume(null);
    }
  }, [practiceResume, progress.completed]);

  useEffect(() => {
    if (!playDraft) return;
    const mainIsComplete = playDraft.mode === "main" && progress.completed.includes(playDraft.nodeId);
    const questIsComplete = playDraft.mode === "quest" && progress.questState.completedIds.includes(playDraft.questId);
    if (mainIsComplete || questIsComplete) setPlayDraft(null);
  }, [playDraft, progress.completed, progress.questState.completedIds]);

  useEffect(() => {
    audio.setPreferences(audioPreferences);
    audioPreferenceStore.save(audioPreferences);
  }, [audio, audioPreferenceStore, audioPreferences]);

  useEffect(() => () => audio.stop(), [audio]);

  useEffect(() => {
    sessionPreferenceStore.save(sessionPreferences);
    setSessionCompass((current) => createSessionStateStore({
      storage: null,
      preferences: sessionPreferences,
    }).save(current).data);
  }, [sessionPreferenceStore, sessionPreferences]);

  useEffect(() => {
    createSessionStateStore({ storage: getBrowserSessionStorage(), preferences: sessionPreferences }).save(sessionCompass);
  }, [sessionCompass, sessionPreferences]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const isActive = view !== "parent" && view !== "session-break" && view !== "review-play" && document.visibilityState === "visible" && document.hasFocus();
      setSessionCompass((current) => advanceSessionCompass(current, 1, sessionPreferences, isActive));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [sessionPreferences, view]);

  useEffect(() => {
    if (view === "session-break" || !shouldPresentSessionBreak(sessionCompass, view, sessionPreferences)) return;
    setSessionReturnView(view);
    setSessionBreakPreview(false);
    setSessionCompass((current) => current.status === "paused" ? current : pauseForSessionBreak(current, sessionPreferences));
    setView("session-break");
  }, [sessionCompass.reminderPending, sessionPreferences, view]);

  useEffect(() => {
    telemetry.trackGameplay("session-start", { mode: "local-prototype" });
    return () => telemetry.trackGameplay("session-end", { mode: "local-prototype" });
  }, [telemetry]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [view]);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? nodes[0],
    [selectedNodeId],
  );
  const selectedCatalogLevel = useMemo(() => getLevelById(selectedCatalogLevelId), [selectedCatalogLevelId]);
  const selectedQuest = useMemo(
    () => optionalQuests.find((quest) => quest.id === selectedQuestId) ?? null,
    [selectedQuestId],
  );
  const reviewNode = useMemo(
    () => reviewPrototypeId ? getPrototypeNode(reviewPrototypeId) : nodes.find((node) => node.id === reviewNodeId) ?? null,
    [reviewNodeId, reviewPrototypeId],
  );
  const previewWorld = useMemo(
    () => worlds.find((world) => world.id === previewWorldId && world.availability === "preview") ?? null,
    [previewWorldId],
  );
  const activeWorld = getActiveWorld(progress, worlds) ?? worlds[0];
  const activeWorldNodes = getWorldNodes(activeWorld, nodes);
  const activeWorldNodeIds = activeWorldNodes.map((node) => node.id);
  const activeWorldQuests = optionalQuests.filter((quest) => activeWorld.optionalQuestIds.includes(quest.id));
  const nextWorld = getNextWorld(activeWorld, worlds);
  const nextNode = getNextWorldNode(activeWorld, progress, nodes) ?? activeWorldNodes[0];
  const firstSessionTarget = selectFirstSessionContinuationTarget(MASTERY_ARC_REGISTRY, { worldId: activeWorld.id, progress });
  const masteryReport = getMasteryArcReport(MASTERY_ARC_REGISTRY, progress, { worldId: activeWorld.id });

  function unlockAndNarrate(text, dedupeKey, cue = "hint") {
    void audio.unlockFromGesture().then(() => {
      void audio.playCue(cue, { dedupeKey: `${dedupeKey}-cue` });
      void audio.narrate(text, { dedupeKey });
    });
  }

  function changeAudioPreferences(patch) {
    const next = audio.setPreferences({ ...audioPreferences, ...patch });
    setAudioPreferences(next);
    void audio.unlockFromGesture().then(() => {
      if (!next.muted && next.effectsEnabled) void audio.playCue("tap", { dedupeKey: "settings-preview" });
    });
  }

  function changeSessionPreferences(patch) {
    setSessionPreferences((current) => normalizeSessionPreferences({ ...current, ...patch }));
  }

  function previewSessionBreak() {
    setSessionReturnView("parent");
    setSessionBreakPreview(true);
    setView("session-break");
  }

  function previewNode(node) {
    if (!node) return;
    setSelectedNodeId(node.id);
    setRoundKey((value) => value + 1);
    setReviewNodeId(node.id);
    setReviewPrototypeId(null);
    setSettingsOpen(false);
    setView("review-play");
  }

  function previewPrototype(prototypeId = "prototype-order") {
    if (!getPrototypeNode(prototypeId)) return;
    setRoundKey((value) => value + 1);
    setReviewNodeId(null);
    setReviewPrototypeId(prototypeId);
    setSettingsOpen(false);
    setView("review-play");
  }

  function exitReview() {
    setReviewNodeId(null);
    setReviewPrototypeId(null);
    setView("parent");
  }

  function completeReview() {
    setReviewNodeId(null);
    setReviewPrototypeId(null);
    setView("parent");
  }

  function resumeOneStage() {
    setSessionCompass((current) => continueForOneStage(current, sessionPreferences));
    setView(sessionReturnView);
  }

  function beginFreshSession() {
    setSessionCompass((current) => startFreshSession(current, sessionPreferences));
    setView(sessionBreakPreview ? "parent" : sessionReturnView);
  }

  function persistPracticeResume(session, phase) {
    const resume = createPracticeResume({ session, phase, dateKey: getPracticeDateKey() });
    setPracticeResume(resume);
  }

  function clearPracticeResume() {
    setPracticeResume(null);
  }

  function clearPlayDraft() {
    setPlayDraft(null);
  }

  function openCatalog() {
    setSettingsOpen(false);
    setView("catalog-map");
  }

  function startCatalogLevel(level) {
    if (!level || level.grade !== 1 || level.order > 10) return;
    if (!isLevelUnlocked(level.id, catalogProgress, ALL_LEVELS)) return;
    setSelectedCatalogLevelId(level.id);
    setLastCatalogResult(null);
    setView("catalog-play");
  }

  function completeCatalogLevel(result) {
    const level = getLevelById(result?.levelId ?? selectedCatalogLevelId);
    if (!level) return;
    const transition = recordCatalogLevelResult(catalogProgress, level, result, { levels: ALL_LEVELS });
    setCatalogProgress(transition.progress);
    setLastCatalogResult({ ...transition.result, firstClear: transition.firstClear, earnedRewards: transition.earnedRewards, nextLevel: transition.nextLevel });
    setView("catalog-completion");
  }

  function checkpointCatalogLevel(checkpoint) {
    if (!checkpoint || !selectedCatalogLevelId) return;
    setCatalogProgress((current) => normalizeCatalogProgress({
      ...current,
      runtimeCheckpoints: { ...(current.runtimeCheckpoints ?? {}), [selectedCatalogLevelId]: checkpoint },
    }, ALL_LEVELS));
  }

  function checkpointPlayPhase(identity, patch) {
    setPlayDraft((current) => {
      const draft = normalizePlaySessionDraft(current, {
        validNodeIds: orderedNodeIds,
        validQuestIds: optionalQuestIds,
      });
      if (!draft) return current;
      if (draft.mode !== identity.mode || draft.nodeId !== identity.nodeId || (draft.mode === "quest" && draft.questId !== identity.questId)) return current;
      return advancePlaySessionDraft(draft, { ...patch, now: new Date().toISOString() }) ?? current;
    });
  }

  function startNode(node, { bypassContinuation = false } = {}) {
    if (!node || !activeWorldNodeIds.includes(node.id) || !isNodeUnlocked(node.id, activeWorldNodeIds, progress)) return;

    const firstSessionMatch = firstSessionTarget?.nodeId === node.id;
    if (!bypassContinuation && firstSessionMatch && (firstSessionContinuation.phase === "idle" || firstSessionContinuation.phase === "map")) {
      const afterLevel1 = firstSessionContinuation.phase === "idle"
        ? transitionFirstSessionContinuation(firstSessionContinuation, { type: "level1-complete" })
        : firstSessionContinuation;
      const next = transitionFirstSessionContinuation(afterLevel1, {
        type: afterLevel1.mechanicIntroSeen ? "level2-resume" : "mechanic-intro",
      });
      setFirstSessionContinuation(next);
      setSelectedNodeId(node.id);
      setSelectedQuestId(null);
      setSettingsOpen(false);
      if (next.phase === "mechanic-intro") {
        setView("mechanic-intro");
        telemetry.trackGameplay("mechanic-intro-viewed", { nodeId: node.id, mechanic: node.type });
        return;
      }
    }

    setMapIntro(false);
    setSelectedNodeId(node.id);
    setSelectedQuestId(null);
    setRoundKey((value) => value + 1);
    setPlayDraft(createPlaySessionDraft({
      mode: "main",
      nodeId: node.id,
      phaseIndex: 0,
      phaseCount: getPlayPhaseCount(node),
      validNodeIds: orderedNodeIds,
      validQuestIds: optionalQuestIds,
    }));
    setView("play");
    setSettingsOpen(false);
    unlockAndNarrate(node.prompt, `objective-${node.id}-${roundKey + 1}`, "tap");
    telemetry.trackGameplay("level-start", { nodeId: node.id, skillId: node.skillId });
  }

  function beginFirstSessionLevel(eventType = "oracle-continue") {
    const next = transitionFirstSessionFlow(firstSessionFlow, { type: eventType });
    setFirstSessionFlow(next);
    telemetry.trackGameplay("first-session-oracle-continue", { skipped: eventType === "oracle-skip" });

    const numeralPrototype = getFirstSessionNumeralPrototype(getPrototypeNode("prototype-numeral"));
    if (next.phase === "numeral" && numeralPrototype) {
      setView("first-session-numeral");
      telemetry.trackGameplay("first-session-numeral-viewed", { prototypeId: numeralPrototype.id });
      return;
    }

    const level1 = next.phase === "numeral"
      ? transitionFirstSessionFlow(next, { type: "numeral-skip" })
      : next;
    setFirstSessionFlow(level1);
    startNode(nodes[0]);
  }

  function completeFirstSessionNumeral() {
    const next = transitionFirstSessionFlow(firstSessionFlow, { type: "numeral-complete" });
    setFirstSessionFlow(next);
    if (next.phase !== "level-1") {
      setView("map");
      return;
    }
    telemetry.trackGameplay("first-session-numeral-complete", { prototypeId: "prototype-numeral" });
    startNode(nodes[0]);
  }

  function exitFirstSessionFlow() {
    setFirstSessionFlow((current) => transitionFirstSessionFlow(current, { type: "exit" }));
    setView("map");
  }

  function startFirstSessionMatch(eventType) {
    const next = transitionFirstSessionContinuation(firstSessionContinuation, { type: eventType });
    if (next.phase !== "level-2") return;
    setFirstSessionContinuation(next);
    telemetry.trackGameplay(eventType === "mechanic-intro-skip" ? "mechanic-intro-skipped" : "mechanic-intro-started", { nodeId: "match", mechanic: "match" });
    startNode(nodes.find((node) => node.id === "match"), { bypassContinuation: true });
  }

  function exitFirstSessionContinuation() {
    setFirstSessionContinuation((current) => transitionFirstSessionContinuation(current, { type: "exit" }));
    setView("map");
  }

  function dismissBossTease() {
    setFirstSessionContinuation((current) => transitionFirstSessionContinuation(current, { type: "boss-tease-dismiss" }));
    telemetry.trackGameplay("boss-tease-dismissed", { source: "first-session-continuation" });
    setView("map");
  }

  function startQuest(quest) {
    if (!quest || !activeWorld.optionalQuestIds.includes(quest.id)) return;
    const status = getQuestStatus(quest, progress, progress.questState);
    if (status !== "available" && status !== "completed") return;
    setSelectedNodeId(quest.sourceNodeId);
    setSelectedQuestId(quest.id);
    setRoundKey((value) => value + 1);
    setPlayDraft(createPlaySessionDraft({
      mode: "quest",
      nodeId: quest.sourceNodeId,
      questId: quest.id,
      phaseIndex: 0,
      phaseCount: getPlayPhaseCount(quest),
      validNodeIds: orderedNodeIds,
      validQuestIds: optionalQuestIds,
    }));
    setView("quest-play");
    setSettingsOpen(false);
    unlockAndNarrate(quest.prompt, `objective-${quest.id}-${roundKey + 1}`, "tap");
    telemetry.trackGameplay("quest-start", { questId: quest.id, kind: quest.kind, skillId: quest.skillId });
  }

  function resumePlayDraft(savedDraft = playDraft) {
    const draft = normalizePlaySessionDraft(savedDraft, {
      validNodeIds: orderedNodeIds,
      validQuestIds: optionalQuestIds,
    });
    if (!draft) {
      clearPlayDraft();
      return;
    }

    if (draft.mode === "main") {
      const node = nodes.find((item) => item.id === draft.nodeId);
      if (!node || !activeWorldNodeIds.includes(node.id) || progress.completed.includes(node.id) || !isNodeUnlocked(node.id, activeWorldNodeIds, progress)) {
        clearPlayDraft();
        return;
      }
      setSelectedNodeId(node.id);
      setSelectedQuestId(null);
      setRoundKey((value) => value + 1);
      setView("play");
      setSettingsOpen(false);
      unlockAndNarrate(node.prompt, `objective-resume-${node.id}-${roundKey + 1}`, "tap");
      telemetry.trackGameplay("level-resume", { nodeId: node.id, skillId: node.skillId, phaseIndex: draft.phaseIndex });
      return;
    }

    const quest = optionalQuests.find((item) => item.id === draft.questId);
    const status = quest ? getQuestStatus(quest, progress, progress.questState) : "hidden";
    if (!quest || quest.sourceNodeId !== draft.nodeId || !activeWorld.optionalQuestIds.includes(quest.id) || progress.questState.completedIds.includes(quest.id) || (status !== "available" && status !== "completed")) {
      clearPlayDraft();
      return;
    }
    setSelectedNodeId(quest.sourceNodeId);
    setSelectedQuestId(quest.id);
    setRoundKey((value) => value + 1);
    setView("quest-play");
    setSettingsOpen(false);
    unlockAndNarrate(quest.prompt, `objective-resume-${quest.id}-${roundKey + 1}`, "tap");
    telemetry.trackGameplay("quest-resume", { questId: quest.id, kind: quest.kind, phaseIndex: draft.phaseIndex });
  }

  function restartPlayDraft(savedDraft = playDraft) {
    const draft = normalizePlaySessionDraft(savedDraft, {
      validNodeIds: orderedNodeIds,
      validQuestIds: optionalQuestIds,
    });
    if (!draft) {
      clearPlayDraft();
      return;
    }
    if (draft.mode === "main") {
      const node = nodes.find((item) => item.id === draft.nodeId);
      if (node) startNode(node);
      else clearPlayDraft();
      return;
    }
    const quest = optionalQuests.find((item) => item.id === draft.questId);
    if (quest) startQuest(quest);
    else clearPlayDraft();
  }

  function openPractice() {
    const dateKey = getPracticeDateKey();
    const savedResume = normalizePracticeResume(practiceResume, nodes, { dateKey });
    if (savedResume) {
      resumePractice(savedResume);
      return;
    }
    if (practiceResume) clearPracticeResume();
    const queue = buildPracticeQueue(progress, activeWorldNodes, { dateKey, masteryRegistry: MASTERY_ARC_REGISTRY, worldId: activeWorld.id });
    const session = createPracticeSession(queue, { startedAt: new Date().toISOString() });
    if (!session) return;
    const puzzle = buildDailyWeaveChallenge(session.queue, activeWorldNodes, ENERGY_TYPES);
    const discovery = buildDiscoveryChallenge(session.queue, activeWorldNodes, { dateKey });
    setPracticeSession(session);
    setPracticePuzzle(puzzle);
    setPracticeDiscovery(discovery);
    setPracticeCheckpoint(null);
    setPracticeSummary(null);
    persistPracticeResume(session, "practice-intro");
    setView("practice-intro");
    telemetry.trackGameplay("practice-session-start", { challengeCount: session.queue.length, source: "home" });
    if (puzzle) telemetry.trackGameplay("practice-puzzle-start", { puzzleId: puzzle.id, tokenCount: puzzle.tokens.length, source: "daily-adventure" });
    if (discovery) telemetry.trackGameplay("practice-discovery-start", { discoveryId: discovery.id, source: "daily-adventure" });
  }

  function resumePractice(savedResume = practiceResume) {
    const resume = normalizePracticeResume(savedResume, nodes, { dateKey: getPracticeDateKey() });
    if (!resume) {
      clearPracticeResume();
      setPracticeSession(null);
      setPracticePuzzle(null);
      setPracticeDiscovery(null);
      setPracticeCheckpoint(null);
      return;
    }

    const puzzle = buildDailyWeaveChallenge(resume.session.queue, activeWorldNodes, ENERGY_TYPES);
    const discovery = buildDiscoveryChallenge(resume.session.queue, activeWorldNodes, { dateKey: resume.dateKey });
    const lastResult = resume.session.completed.at(-1);
    const checkpointNode = lastResult ? nodes.find((node) => node.id === lastResult.nodeId) : null;
    const checkpoint = checkpointNode
      ? { node: checkpointNode, mastery: lastResult.mastery, nextIndex: resume.session.currentIndex }
      : null;

    setPracticeSession(resume.session);
    setPracticePuzzle(puzzle);
    setPracticeDiscovery(discovery);
    setPracticeCheckpoint(checkpoint);
    setPracticeSummary(null);
    setSelectedNodeId(resume.session.queue[resume.session.currentIndex] ?? resume.session.queue.at(-1));
    telemetry.trackGameplay("practice-session-resume", {
      challengeCount: resume.session.queue.length,
      currentIndex: resume.session.currentIndex,
      phase: resume.phase,
    });

    if (resume.phase === "practice-puzzle" && isPracticeSessionComplete(resume.session) && puzzle) {
      setView("practice-puzzle");
    } else if (resume.phase === "practice-discovery" && isPracticeSessionComplete(resume.session) && discovery) {
      setView("practice-discovery");
    } else if (resume.phase === "practice-checkpoint" && checkpoint && !isPracticeSessionComplete(resume.session)) {
      setView("practice-checkpoint");
    } else {
      setView("practice-intro");
    }
  }

  function startPracticeChallenge(session = practiceSession) {
    if (!session || isPracticeSessionComplete(session)) return;
    const node = nodes.find((item) => item.id === session.queue[session.currentIndex]);
    if (!node) return;
    setSelectedNodeId(node.id);
    setRoundKey((value) => value + 1);
    persistPracticeResume(session, "practice-play");
    setView("practice-play");
    unlockAndNarrate(node.prompt, `practice-objective-${node.id}-${session.currentIndex}`, "tap");
    telemetry.trackGameplay("level-start", { nodeId: node.id, skillId: node.skillId, mode: "practice", practiceIndex: session.currentIndex });
  }

  function chooseCityBuilding(buildingId) {
    const next = selectCityBuilding(progress, buildingId, cityBuildings, cityCosmetics);
    setProgress(next);
    if (next.cityState.selectedBuildingId === buildingId) {
      telemetry.trackGameplay("city-building-viewed", { buildingId });
    }
  }

  function chooseCosmetic(cosmeticId) {
    const next = equipCosmetic(progress, cosmeticId, cityBuildings, cityCosmetics);
    setProgress(next);
    if (next.cityState.equippedCosmeticId === cosmeticId) {
      telemetry.trackGameplay("cosmetic-equipped", { cosmeticId: cosmeticId ?? "none" });
    }
  }

  function openLeague() {
    setView("league");
    telemetry.trackGameplay("league-viewed", { provider: "local-fictional-league" });
  }

  function openWorldPreview(worldToPreview) {
    if (!worldToPreview || worldToPreview.availability !== "preview") return;
    setPreviewWorldId(worldToPreview.id);
    setSettingsOpen(false);
    setView("world-preview");
    telemetry.trackGameplay("world-preview-viewed", { worldId: worldToPreview.id });
  }

  function finalizePracticeSession(baseProgress, session, completedAt, discoveryCompleted) {
    const summary = { ...summarizePracticeSession(session), discoveryCompleted: Boolean(discoveryCompleted) };
    const completedProgress = recordPracticeSessionCompletion(baseProgress, summary, completedAt);
    setProgress(normalizeCampaignProgress({ ...completedProgress, campaignState: baseProgress.campaignState, questState: baseProgress.questState }, worlds, nodes));
    setPracticeSummary(summary);
    setPracticePuzzle(null);
    setPracticeDiscovery(null);
    clearPracticeResume();
    setView("practice-summary");
    telemetry.trackGameplay("practice-session-complete", summary);
  }

  function completePracticePuzzle(result = {}) {
    if (!practiceSession || !practicePuzzle) return;
    const completedAt = new Date().toISOString();
    telemetry.trackGameplay("practice-puzzle-complete", { puzzleId: practicePuzzle.id, actions: Number.isFinite(result.actions) ? result.actions : 0, mistakes: Number.isFinite(result.mistakes) ? result.mistakes : 0 });
    if (practiceDiscovery) {
      persistPracticeResume(practiceSession, "practice-discovery");
      setView("practice-discovery");
      return;
    }
    clearPracticeResume();
    finalizePracticeSession(progress, practiceSession, completedAt, false);
  }

  function completePracticeDiscovery() {
    if (!practiceSession || !practiceDiscovery) return;
    const completedAt = new Date().toISOString();
    telemetry.trackGameplay("practice-discovery-complete", { discoveryId: practiceDiscovery.id });
    clearPracticeResume();
    finalizePracticeSession(progress, practiceSession, completedAt, true);
  }

  function completePracticeChallenge(result) {
    if (!practiceSession) return;
    const completedAt = new Date().toISOString();
    const mastery = result.guided ? 1 : result.supportsUsed > 0 ? 2 : 3;
    const recordedProgress = recordLevelResult(progress, {
      nodeId: result.node.id,
      skillId: result.node.skillId,
      reward: 0,
      attempts: result.mistakes + 1,
      supportsUsed: result.supportsUsed,
      guided: result.guided,
      actions: result.actions,
      durationSeconds: result.durationSeconds,
      completedAt,
      mode: "practice",
      activityId: findMasteryActivity(MASTERY_ARC_REGISTRY, { sourceType: "daily", sourceId: result.node.id })?.id,
      activityContext: "daily",
      variantId: `${result.node.type}-retrieval`,
    });
    const nextProgress = normalizeCampaignProgress({ ...recordedProgress, campaignState: progress.campaignState, questState: normalizeQuestState(progress.questState, optionalQuestIds) }, worlds, nodes);
    const advanced = advancePracticeSession(practiceSession, {
      nodeId: result.node.id,
      skillId: result.node.skillId,
      mastery,
      attempts: result.mistakes + 1,
      supportsUsed: result.supportsUsed,
      durationSeconds: result.durationSeconds,
    });
    setPracticeSession(advanced);
    telemetry.trackGameplay("practice-challenge-complete", { nodeId: result.node.id, skillId: result.node.skillId, mastery, practiceIndex: practiceSession.currentIndex });
    telemetry.trackLearning("level-solved", { nodeId: result.node.id, skillId: result.node.skillId, attempts: result.mistakes + 1, supportsUsed: result.supportsUsed, guided: result.guided, mode: "practice" });

    if (isPracticeSessionComplete(advanced)) {
      setProgress(nextProgress);
      if (practicePuzzle) {
        persistPracticeResume(advanced, "practice-puzzle");
        setView("practice-puzzle");
        return;
      }
      if (practiceDiscovery) {
        persistPracticeResume(advanced, "practice-discovery");
        setView("practice-discovery");
        return;
      }
      clearPracticeResume();
      finalizePracticeSession(nextProgress, advanced, completedAt, false);
      return;
    }

    setProgress(nextProgress);
    setPracticeCheckpoint({ node: result.node, mastery, nextIndex: advanced.currentIndex });
    persistPracticeResume(advanced, "practice-checkpoint");
    setView("practice-checkpoint");
  }

  function completeLevel(result) {
    const node = result.node;
    const firstClear = !progress.completed.includes(node.id);
    const completedAt = new Date().toISOString();
    const mastery = result.guided ? 1 : result.supportsUsed > 0 ? 2 : 3;
    const masteryActivity = findMasteryActivity(MASTERY_ARC_REGISTRY, { sourceType: "main", sourceId: node.id });
    const earnedXp = getXpReward({ reward: node.reward, mastery, firstClear });
    const earnedEnergy = getEnergyReward({ energyTypes: node.energyTypes, mastery, firstClear });
    const recordedProgress = recordLevelResult(progress, {
      nodeId: node.id,
      skillId: node.skillId,
      reward: node.reward,
      attempts: result.mistakes + 1,
      supportsUsed: result.supportsUsed,
      guided: result.guided,
      actions: result.actions,
      durationSeconds: result.durationSeconds,
      completedAt,
      isBoss: node.id === "boss",
      energyTypes: node.energyTypes,
      activityId: masteryActivity?.id,
      activityContext: masteryActivity?.context,
      variantId: masteryActivity?.variantId,
    });
    const nextProgress = normalizeCampaignProgress({ ...recordedProgress, campaignState: progress.campaignState, questState: normalizeQuestState(progress.questState, optionalQuestIds) }, worlds, nodes);
    const evolutionTransition = getNubiEvolutionTransition({ nodeId: node.id, firstClear, beforeProgress: progress, afterProgress: nextProgress }, nubiEvolutionStages);
    setProgress(nextProgress);
    telemetry.trackLearning("level-solved", { nodeId: node.id, skillId: node.skillId, attempts: result.mistakes + 1, supportsUsed: result.supportsUsed, guided: result.guided });
    telemetry.trackGameplay("level-complete", { nodeId: node.id, firstClear });
    if (node.id === "boss") telemetry.trackGameplay("boss-defeated", { nodeId: node.id, skillId: node.skillId, firstClear, phasesCompleted: [0, 1, 2] });
    clearPlayDraft();
    setLastResult({ ...result, firstClear, earnedShards: firstClear ? node.reward : 0, earnedXp, earnedEnergy, evolutionTransition });
    setView("restoration");
  }

  function completeQuest(result) {
    const quest = result.node;
    const firstClear = !progress.questState.completedIds.includes(quest.id);
    const completedAt = new Date().toISOString();
    const mastery = result.guided ? 1 : result.supportsUsed > 0 ? 2 : 3;
    const masteryActivity = findMasteryActivity(MASTERY_ARC_REGISTRY, { sourceType: "quest", sourceId: quest.id });
    const earnedEnergy = getEnergyReward({ energyTypes: quest.energyTypes, mastery, firstClear });
    const baseRecordedProgress = recordLevelResult(progress, {
      nodeId: quest.sourceNodeId,
      skillId: quest.skillId,
      reward: 0,
      attempts: result.mistakes + 1,
      supportsUsed: result.supportsUsed,
      guided: result.guided,
      actions: result.actions,
      durationSeconds: result.durationSeconds,
      completedAt,
      mode: quest.kind === "secret" ? "secret-quest" : "side-quest",
      activityId: masteryActivity?.id,
      activityContext: masteryActivity?.context,
      variantId: masteryActivity?.variantId,
    });
    const recordedProgress = addEnergy(baseRecordedProgress, earnedEnergy);
    const questState = recordQuestCompletion(progress.questState, quest, {
      attempts: result.mistakes + 1,
      supportsUsed: result.supportsUsed,
      mastery,
    }, optionalQuestIds);
    setProgress(normalizeCampaignProgress({ ...recordedProgress, campaignState: progress.campaignState, questState }, worlds, nodes));
    telemetry.trackLearning("level-solved", { nodeId: quest.sourceNodeId, questId: quest.id, skillId: quest.skillId, attempts: result.mistakes + 1, supportsUsed: result.supportsUsed, guided: result.guided, mode: quest.kind });
    telemetry.trackGameplay("quest-complete", { questId: quest.id, kind: quest.kind, firstClear, mastery });
    clearPlayDraft();
    setLastResult({ ...result, firstClear, earnedShards: 0, earnedXp: 0, earnedEnergy, optionalQuest: true, rewardCosmeticId: firstClear ? quest.rewardCosmeticId : null });
    setView("restoration");
  }

  function resetDemo() {
    createLocalProgressStore({ storage: getBrowserStorage(), key: STORAGE_KEY }).clear();
    createLocalProgressStore({ storage: getBrowserStorage(), key: LEGACY_STORAGE_KEY }).clear();
    setProgress(normalizeAppProgress(createInitialProgress()));
    setLastResult(null);
    setPracticeSession(null);
    setPracticeDiscovery(null);
    setPracticeCheckpoint(null);
    setPracticeSummary(null);
    clearPracticeResume();
    clearPlayDraft();
    createLocalProgressStore({ storage: getBrowserStorage(), key: CATALOG_STORAGE_KEY }).clear();
    setCatalogProgress(createCatalogProgress());
    setSelectedCatalogLevelId("g1-l001");
    setLastCatalogResult(null);
    setFirstSessionFlow(createFirstSessionFlow());
    setFirstSessionContinuation(createFirstSessionContinuation());
    setView("home");
  }

  function openParentArea() {
    setSettingsOpen(false);
    setParentGateOpen(true);
  }

  function finishOnboarding(nextProfile) {
    const saved = createLocalProfileStore({ storage: getBrowserStorage(), key: PROFILE_KEY }).save(nextProfile);
    setProfile(saved.ok ? saved.data : nextProfile);
    createLocalProgressStore({ storage: getBrowserStorage(), key: STORAGE_KEY }).clear();
    createLocalProgressStore({ storage: getBrowserStorage(), key: LEGACY_STORAGE_KEY }).clear();
    setProgress(normalizeAppProgress(createInitialProgress()));
    clearPlayDraft();
    createLocalProgressStore({ storage: getBrowserStorage(), key: CATALOG_STORAGE_KEY }).clear();
    setCatalogProgress(createCatalogProgress());
    setLastCatalogResult(null);
    setMapIntro(false);
    setFirstSessionFlow(beginFirstSessionFlow());
    setFirstSessionContinuation(createFirstSessionContinuation());
    setView("catalog-map");
  }

  if (booting) return <BootScreen />;
  if (view === "onboarding") return <OnboardingView onFinish={finishOnboarding} audio={audio} />;
  if (view === "session-break") return (
    <SessionBreakView
      preview={sessionBreakPreview}
      progress={progress}
      onBack={() => setView("parent")}
      onContinue={resumeOneStage}
      onStartFresh={beginFreshSession}
    />
  );
  if (view === "catalog-map") return <CatalogMapView progress={catalogProgress} onStart={startCatalogLevel} onBack={() => setView("home")} />;
  if (view === "catalog-play" && selectedCatalogLevel) return (
    <LevelRuntime
      key={selectedCatalogLevel.id}
      level={selectedCatalogLevel}
      progress={catalogProgress}
      profile={profile}
      audioProvider={audio}
      onComplete={completeCatalogLevel}
      onPhaseCheckpoint={checkpointCatalogLevel}
      onExit={() => setView("catalog-map")}
    />
  );
  if (view === "catalog-completion" && lastCatalogResult && selectedCatalogLevel) return (
    <CatalogCompletionView
      level={selectedCatalogLevel}
      result={lastCatalogResult}
      onContinue={() => setView("catalog-map")}
      onReplay={() => startCatalogLevel(selectedCatalogLevel)}
    />
  );
  if (view === "review-play" && reviewNode) return (
    <PlayView
      key={`review-${reviewNode.id}-${roundKey}`}
      node={reviewNode}
      onBack={exitReview}
      onComplete={completeReview}
      telemetry={null}
      audio={audio}
      learnerContext={{ ageBand: profile?.ageBand, skillMetric: null }}
      modeLabel="Duyệt local · không ghi tiến trình"
      nubiStage={progress.nubiStage}
      rewardPending={false}
      previewMode
    />
  );

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Bỏ qua đến nội dung chính</a>
      <TopBar
        progress={progress}
        world={activeWorld}
        worldNodes={activeWorldNodes}
        audioPreferences={audioPreferences}
        audioCapability={audio.getNarrationCapability()}
        sessionDisplay={getSessionCompassDisplay(sessionCompass, sessionPreferences)}
        onAudioPreferences={changeAudioPreferences}
        view={view}
        settingsOpen={settingsOpen}
        onHome={() => {
          if (view === "first-session-oracle" || view === "first-session-numeral") exitFirstSessionFlow();
          else if (view === "mechanic-intro") exitFirstSessionContinuation();
          else if (view === "boss-tease") dismissBossTease();
          else setView("home");
        }}
        onMap={() => setView("map")}
        onCreature={() => setView("creature")}
        onCity={() => setView("city")}
        onSettings={() => setSettingsOpen((value) => !value)}
        onParent={openParentArea}
        settingsButtonRef={settingsButtonRef}
        focusMode={isGameplayFocusView(view)}
      />
      <main id="main-content" className="view-frame">
        {view === "home" && (
          <HomeView
            progress={progress}
            profile={profile}
            nextNode={nextNode}
            world={activeWorld}
            onStart={() => startNode(nextNode)}
            onMap={() => setView("map")}
            onOpenCatalog={openCatalog}
            onCreature={() => setView("creature")}
            onPractice={openPractice}
            practiceResume={practiceResume}
            playDraft={playDraft}
            onResumePlay={() => resumePlayDraft()}
            onRestartPlay={() => restartPlayDraft()}
            cosmeticId={progress.cityState.equippedCosmeticId}
          />
        )}
        {view === "map" && (
          <MapView
            progress={progress}
            nextNode={nextNode}
            world={activeWorld}
            worldNodes={activeWorldNodes}
            worldQuests={activeWorldQuests}
            nextWorld={nextWorld}
            onStart={startNode}
            onStartQuest={startQuest}
            onCity={() => setView("city")}
            onPreviewWorld={openWorldPreview}
            firstVisit={mapIntro}
            onDismissIntro={() => setMapIntro(false)}
            firstSessionNextId={firstSessionTarget?.nodeId ?? null}
            firstSessionIntroSeen={firstSessionContinuation.mechanicIntroSeen}
            onStartNext={() => firstSessionTarget && startNode(nodes.find((node) => node.id === firstSessionTarget.nodeId))}
          />
        )}
        {view === "first-session-oracle" && (
          <FirstSessionOracleView
            profile={profile}
            onStart={() => beginFirstSessionLevel("oracle-continue")}
            onSkip={() => beginFirstSessionLevel("oracle-skip")}
          />
        )}
        {view === "first-session-numeral" && (
          <FirstSessionNumeralView
            profile={profile}
            prototype={getFirstSessionNumeralPrototype(getPrototypeNode("prototype-numeral"))}
            onComplete={completeFirstSessionNumeral}
            onExit={exitFirstSessionFlow}
          />
        )}
        {view === "mechanic-intro" && selectedNode && (
          <MechanicIntroView
            node={selectedNode}
            onStart={() => startFirstSessionMatch("mechanic-intro-start")}
            onSkip={() => startFirstSessionMatch("mechanic-intro-skip")}
            onExit={exitFirstSessionContinuation}
          />
        )}
        {view === "boss-tease" && (
          <BossTeaseView onContinue={dismissBossTease} />
        )}
        {view === "world-preview" && previewWorld && (
          <WorldPreviewView
            world={previewWorld}
            onBack={() => {
              setPreviewWorldId(null);
              setView("map");
            }}
          />
        )}
        {view === "play" && (
          <PlayView
            key={`${selectedNode.id}-${roundKey}`}
            node={selectedNode}
            onBack={() => {
              if (firstSessionFlow.phase === "level-1" && selectedNode.id === "collect") {
                setFirstSessionFlow((current) => transitionFirstSessionFlow(current, { type: "exit" }));
              }
              if (firstSessionContinuation.phase === "level-2" && selectedNode.id === "match") {
                setFirstSessionContinuation((current) => transitionFirstSessionContinuation(current, { type: "exit" }));
              }
              setView("map");
            }}
            onComplete={completeLevel}
            telemetry={telemetry}
            audio={audio}
            learnerContext={{ ageBand: profile?.ageBand, skillMetric: progress.learningMetrics[selectedNode.skillId] }}
            nubiStage={progress.nubiStage}
            rewardPending={!progress.completed.includes(selectedNode.id)}
            initialPhaseIndex={playDraft?.mode === "main" && playDraft.nodeId === selectedNode.id ? playDraft.phaseIndex : 0}
            onPhaseCheckpoint={(patch) => checkpointPlayPhase({ mode: "main", nodeId: selectedNode.id }, patch)}
          />
        )}
        {view === "quest-play" && selectedQuest && (
          <PlayView
            key={`quest-${selectedQuest.id}-${roundKey}`}
            node={selectedQuest}
            onBack={() => setView("map")}
            onComplete={completeQuest}
            telemetry={telemetry}
            audio={audio}
            learnerContext={{ ageBand: profile?.ageBand, skillMetric: progress.learningMetrics[selectedQuest.skillId] }}
            modeLabel={selectedQuest.kind === "secret" ? "Nhiệm vụ bí mật" : "Nhiệm vụ phụ"}
            nubiStage={progress.nubiStage}
            rewardPending={!progress.questState.completedIds.includes(selectedQuest.id)}
            initialPhaseIndex={playDraft?.mode === "quest" && playDraft.questId === selectedQuest.id ? playDraft.phaseIndex : 0}
            onPhaseCheckpoint={(patch) => checkpointPlayPhase({ mode: "quest", nodeId: selectedQuest.sourceNodeId, questId: selectedQuest.id }, patch)}
          />
        )}
        {view === "practice-intro" && practiceSession && (
          <PracticeIntroView stage={progress.nubiStage} session={practiceSession} onStart={() => startPracticeChallenge(practiceSession)} onExit={() => setView("home")} />
        )}
        {view === "practice-puzzle" && practiceSession && practicePuzzle && (
          <DailyWeaveView challenge={practicePuzzle} stage={progress.nubiStage} learnerContext={{ ageBand: profile?.ageBand }} onComplete={completePracticePuzzle} onExit={() => { persistPracticeResume(practiceSession, "practice-puzzle"); setView("home"); }} />
        )}
        {view === "practice-discovery" && practiceSession && (
          <PracticeDiscoveryView challenge={practiceDiscovery} stage={progress.nubiStage} learnerContext={{ ageBand: profile?.ageBand }} onComplete={completePracticeDiscovery} onExit={() => setView("home")} />
        )}
        {view === "practice-play" && practiceSession && (
          <PlayView
            key={`practice-${practiceSession.id}-${practiceSession.currentIndex}-${roundKey}`}
            node={selectedNode}
            onBack={() => {
              persistPracticeResume(practiceSession, "practice-intro");
              setView("practice-intro");
            }}
            onComplete={completePracticeChallenge}
            telemetry={telemetry}
            audio={audio}
            learnerContext={{ ageBand: profile?.ageBand, skillMetric: progress.learningMetrics[selectedNode.skillId] }}
            modeLabel="Luyện tập hôm nay"
            nubiStage={progress.nubiStage}
            rewardPending={false}
            sessionProgress={{ current: practiceSession.currentIndex + 1, total: practiceSession.queue.length }}
          />
        )}
        {view === "practice-checkpoint" && practiceSession && practiceCheckpoint && (
          <PracticeCheckpointView stage={progress.nubiStage} checkpoint={practiceCheckpoint} session={practiceSession} onContinue={() => startPracticeChallenge(practiceSession)} onExit={() => setView("home")} />
        )}
        {view === "practice-summary" && practiceSummary && (
          <PracticeSummaryView stage={progress.nubiStage} summary={practiceSummary} onHome={() => setView("home")} onParent={openParentArea} />
        )}
        {view === "restoration" && lastResult && (
          <RestorationView
            result={lastResult}
            stage={progress.nubiStage}
            onContinue={() => {
              if (firstSessionFlow.phase === "level-1" && lastResult.node?.id === "collect") {
                setFirstSessionFlow((current) => transitionFirstSessionFlow(current, { type: "level-complete" }));
                setFirstSessionContinuation((current) => transitionFirstSessionContinuation(current, { type: "level1-complete" }));
              }
              if (firstSessionContinuation.phase === "level-2" && lastResult.node?.id === "match") {
                setFirstSessionContinuation((current) => transitionFirstSessionContinuation(current, { type: "level2-complete" }));
                telemetry.trackGameplay("boss-tease-viewed", { source: "first-session-continuation", afterNodeId: "match" });
                setView("boss-tease");
                return;
              }
              setView(lastResult.evolutionTransition ? "evolution" : "map");
            }}
            onReplay={() => lastResult.optionalQuest ? startQuest(lastResult.node) : startNode(lastResult.node)}
          />
        )}
        {view === "evolution" && <EvolutionView progress={progress} transition={lastResult?.evolutionTransition} onCity={() => setView("city")} onMap={() => setView("map")} />}
        {view === "city" && <CityView progress={progress} onMap={() => setView("map")} onLeague={openLeague} onSelectBuilding={chooseCityBuilding} onEquipCosmetic={chooseCosmetic} />}
        {view === "league" && <LeagueView progress={progress} profile={profile} onCity={() => setView("city")} />}
        {view === "creature" && <CreatureView progress={progress} onMap={() => setView("map")} onEvolution={() => setView("evolution")} />}
        {view === "parent" && <ParentView progress={progress} masteryReport={masteryReport} sessionPreferences={sessionPreferences} sessionCompass={sessionCompass} onSessionPreferences={changeSessionPreferences} onPreviewSessionBreak={previewSessionBreak} onPreviewNode={previewNode} onPreviewPrototype={previewPrototype} onReset={resetDemo} onExit={() => setView("home")} />}
      </main>
      {parentGateOpen && (
        <ParentGate
          returnFocusRef={settingsButtonRef}
          onClose={() => setParentGateOpen(false)}
          onPass={() => {
            setParentGateOpen(false);
            setView("parent");
          }}
        />
      )}
    </div>
  );
}

function OnboardingView({ onFinish, audio }) {
  const [step, setStep] = useState("story");
  const [storyBeat, setStoryBeat] = useState(0);
  const [alias, setAlias] = useState("");
  const [ageBand, setAgeBand] = useState("5-6");
  const [error, setError] = useState("");
  const [awakeningStarted, setAwakeningStarted] = useState(false);
  const [awakeningSignal, setAwakeningSignal] = useState(createNubiSignalState);
  const awakeningStartedRef = useRef(false);
  const awakeningTimerRef = useRef(null);
  const story = [
    ["Đại Lãng Quên", "Một màn sương đã làm những con số và hình dạng ngủ quên."],
    ["Một tín hiệu còn sáng", "Mảnh Tri Thức cuối cùng đang tìm người có thể đánh thức khu rừng."],
    ["Lumora cần con", "Chạm vào ánh sáng, học bằng hành động và đưa ký ức trở về."],
  ];

  function nextStory() {
    if (storyBeat < story.length - 1) setStoryBeat((value) => value + 1);
    else setStep("profile");
  }

  function confirmProfile() {
    const cleanAlias = alias.trim().replace(/\s+/g, " ").slice(0, 16);
    if (cleanAlias.length < 2) {
      setError("Con hãy chọn một tên gọi có ít nhất 2 ký tự.");
      return;
    }
    setAlias(cleanAlias);
    setError("");
    setStep("awakening");
  }

  function awaken() {
    if (awakeningStartedRef.current) return;
    awakeningStartedRef.current = true;
    setAwakeningStarted(true);
    setAwakeningSignal((current) => transitionNubiSignal(current, { type: "level-success" }));
    void audio.unlockFromGesture().then(() => audio.playCue("evolution", { dedupeKey: "onboarding-awaken" }));
    awakeningTimerRef.current = window.setTimeout(() => {
      awakeningTimerRef.current = null;
      onFinish({ alias, ageBand });
    }, 1000);
  }

  useEffect(() => () => {
    if (awakeningTimerRef.current !== null) {
      window.clearTimeout(awakeningTimerRef.current);
      awakeningTimerRef.current = null;
    }
  }, []);

  if (step === "story") {
    return (
      <main className="onboarding-scene story-scene" aria-labelledby="story-title">
        <img className="scene-backdrop" src="/assets/world-map.jpg" alt="Lumora chìm trong màn sương của Đại Lãng Quên" />
        <div className="onboarding-shade" aria-hidden="true" />
        <div className="story-copy page-enter" key={storyBeat}>
          <p className="scene-kicker">Mở đầu · {storyBeat + 1}/3</p>
          <h1 id="story-title">{story[storyBeat][0]}</h1>
          <p>{story[storyBeat][1]}</p>
          <button className="tactile-button primary-action" type="button" onClick={nextStory}>{storyBeat === 2 ? "Tìm Mảnh Tri Thức" : "Tiếp tục"} <b aria-hidden="true">➜</b></button>
          <button className="quiet-action" type="button" onClick={() => setStep("profile")}>Bỏ qua đoạn mở đầu</button>
        </div>
      </main>
    );
  }

  if (step === "profile") {
    return (
      <main className="onboarding-scene profile-scene" aria-labelledby="profile-title">
        <div className="profile-card page-enter">
          <p className="scene-kicker">Hồ sơ lưu trên thiết bị này</p>
          <h1 id="profile-title">Nubi nên gọi con là gì?</h1>
          <p>Chỉ cần tên gọi trong game và nhóm tuổi. Lumora không hỏi ngày sinh hay thông tin liên hệ.</p>
          <label>Tên gọi<input value={alias} maxLength={16} autoFocus onChange={(event) => setAlias(event.target.value)} onKeyDown={(event) => event.key === "Enter" && confirmProfile()} placeholder="Ví dụ: An" /></label>
          <fieldset><legend>Nhóm tuổi</legend><button type="button" aria-pressed={ageBand === "5-6"} className={ageBand === "5-6" ? "selected" : ""} onClick={() => setAgeBand("5-6")}>5–6 tuổi</button><button type="button" aria-pressed={ageBand === "7-8"} className={ageBand === "7-8" ? "selected" : ""} onClick={() => setAgeBand("7-8")}>7–8 tuổi</button></fieldset>
          {error && <p className="profile-error" role="alert">{error}</p>}
          <button className="tactile-button primary-action full" type="button" onClick={confirmProfile}>Tạo hành trình <b aria-hidden="true">➜</b></button>
        </div>
      </main>
    );
  }

  return (
    <main className="onboarding-scene awakening-scene" aria-labelledby="awakening-title">
      <img className="scene-backdrop" src="/assets/awakened-forest-clean.png" alt="Một góc rừng chờ được đánh thức" />
      <div className="onboarding-shade" aria-hidden="true" />
      <div className="awakening-copy"><p className="scene-kicker">Tín hiệu đầu tiên</p><h1 id="awakening-title">Ánh sáng đang đáp lại, {alias}.</h1><p>Chạm Mảnh Tri Thức để đánh thức Nubi và bước vào thử thách đầu tiên.</p></div>
      <NubiFigure className="awakening-nubi" stage={1} mood={awakeningStarted ? "resonant" : "curious"} energyTypes={["discovery"]} signalState={awakeningSignal} alt="Nubi đang ngủ, chờ Mảnh Tri Thức đánh thức" />
      <button className={`awakening-shard ${awakeningStarted ? "is-awakened" : ""}`} type="button" onClick={awaken} disabled={awakeningStarted} aria-label="Chạm Mảnh Tri Thức để đánh thức Nubi"><span aria-hidden="true">◆</span><b>Chạm để đánh thức</b></button>
    </main>
  );
}

function BootScreen() {
  return (
    <main className="boot-screen" aria-live="polite">
      <div className="boot-rune" aria-hidden="true"><span /></div>
      <strong>LUMORA</strong>
      <p>Ánh sáng đang trở về…</p>
      <div className="boot-stream" aria-hidden="true"><span /></div>
    </main>
  );
}

function FirstSessionOracleView({ profile, onStart, onSkip }) {
  const alias = profile?.alias?.trim() || "bạn";

  return (
    <section className="first-session-oracle page-enter" aria-labelledby="first-session-oracle-title">
      <img className="first-session-oracle-backdrop" src="/assets/awakened-forest-clean.png" alt="" />
      <div className="first-session-oracle-shade" aria-hidden="true" />
      <div className="first-session-oracle-copy">
        <p className="scene-kicker">Mạch mở đầu · Oracle local</p>
        <h1 id="first-session-oracle-title">Mạch đang gọi {alias}.</h1>
        <p>Ta sẽ ở cạnh con trong thử thách đầu tiên. Con tự thử trước; khi cần, hãy gọi ta.</p>
        <div className="first-session-oracle-actions">
          <button className="tactile-button primary-action" type="button" onClick={onStart}>
            Bắt đầu Bãi Hạt Sáng <b aria-hidden="true">➜</b>
          </button>
          <button className="quiet-action" type="button" onClick={onSkip}>Bỏ qua lời giới thiệu</button>
        </div>
      </div>
      <div className="first-session-oracle-visual" aria-hidden="true">
        <span className="first-session-oracle-ring ring-a" />
        <span className="first-session-oracle-ring ring-b" />
        <div className="first-session-oracle-oracle">
          <img src="/assets/mach-oracle-v2.png" alt="" />
        </div>
        <div className="first-session-oracle-nubi">
          <NubiFigure stage={1} mood="curious" alt="" />
        </div>
      </div>
    </section>
  );
}

function FirstSessionNumeralView({ profile, prototype, onComplete, onExit }) {
  const alias = profile?.alias?.trim() || "bạn";

  if (!prototype) {
    return (
      <section className="first-session-numeral-view first-session-numeral-fallback page-enter" aria-labelledby="first-session-numeral-title">
        <div className="first-session-numeral-copy">
          <p className="scene-kicker">Mạch mở đầu</p>
          <h1 id="first-session-numeral-title">Bãi Hạt Sáng đã sẵn sàng.</h1>
          <p>Hoạt động nhận biết số chưa sẵn sàng trong bản local. Con có thể đi thẳng vào chặng thu thập đầu tiên.</p>
          <div className="first-session-numeral-actions">
            <button className="tactile-button primary-action" type="button" onClick={onComplete}>Vào chặng đầu tiên <b aria-hidden="true">➜</b></button>
            <button className="quiet-action" type="button" onClick={onExit}>Về bản đồ</button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="first-session-numeral-view page-enter" aria-labelledby="first-session-numeral-title">
      <img className="first-session-numeral-backdrop" src={prototype.scene} alt="" />
      <div className="first-session-numeral-shade" aria-hidden="true" />
      <div className="first-session-numeral-layout">
        <div className="first-session-numeral-copy">
          <p className="scene-kicker">Mạch mở đầu · Nhận biết số</p>
          <h1 id="first-session-numeral-title">Gọi tên ánh sáng, {alias}.</h1>
          <p>Đếm nhóm hạt, tìm chữ số phù hợp rồi kéo vào Lõi gọi số. Đây là một vòng làm quen ngắn trước chặng thu thập.</p>
          <div className="first-session-numeral-markers" aria-label="Ba lượt nhận biết số"><span>1</span><i aria-hidden="true" /><span>2</span><i aria-hidden="true" /><span>3</span></div>
        </div>
        <div className="first-session-numeral-play">
          <div className="first-session-numeral-nubi" aria-hidden="true"><NubiFigure stage={1} mood="curious" energyTypes={prototype.energyTypes} alt="" /></div>
          <div className="game-board board-numeral first-session-numeral-board">
            <NumeralRecognitionBoard onAction={() => {}} onFail={() => {}} onFinish={onComplete} guided />
          </div>
          <button className="quiet-action first-session-numeral-exit" type="button" onClick={onExit}>Dừng làm quen và về bản đồ</button>
        </div>
      </div>
    </section>
  );
}

function MechanicIntroView({ node, onStart, onSkip, onExit }) {
  const spec = getInteractionSpec(node?.type);
  if (!node || !spec) {
    return (
      <section className="mechanic-intro-view page-enter" aria-labelledby="mechanic-intro-title">
        <div className="mechanic-intro-copy">
          <p className="scene-kicker">Mạch chưa sẵn sàng</p>
          <h1 id="mechanic-intro-title">Chưa có cách chơi an toàn.</h1>
          <button className="quiet-action" type="button" onClick={onExit}>Về bản đồ</button>
        </div>
      </section>
    );
  }

  return (
    <section className="mechanic-intro-view page-enter" aria-labelledby="mechanic-intro-title">
      <img className="mechanic-intro-backdrop" src={node.scene ?? "/assets/collect-scene.jpg"} alt="" />
      <div className="mechanic-intro-shade" aria-hidden="true" />
      <div className="mechanic-intro-copy">
        <p className="scene-kicker">Mầm 2 · Cách chơi mới</p>
        <h1 id="mechanic-intro-title">{node.title}</h1>
        <p className="mechanic-intro-lead">{spec.learningObjective}</p>
        <article className="mechanic-intro-card">
          <span className="mechanic-intro-card-icon" aria-hidden="true">{node.icon}</span>
          <div>
            <small>Mục tiêu của mạch</small>
            <strong>{spec.entryState}</strong>
            <span className="mechanic-intro-gesture"><i aria-hidden="true">↔</i>{spec.gestureLabel}</span>
          </div>
        </article>
        <div className="mechanic-intro-actions">
          <button className="tactile-button primary-action" type="button" onClick={onStart}>Bắt đầu thử <b aria-hidden="true">➜</b></button>
          <button className="quiet-action" type="button" onClick={onSkip}>Bỏ qua hướng dẫn</button>
        </div>
      </div>
      <div className="mechanic-intro-visual" aria-hidden="true">
        <div className="mechanic-intro-demo">
          <span className="intro-demo-number">4</span>
          <span className="intro-demo-arrow">↔</span>
          <span className="intro-demo-quantity"><i /><i /><i /><i /></span>
        </div>
        <div className="mechanic-intro-nubi"><NubiFigure stage={1} mood="curious" alt="" /></div>
      </div>
    </section>
  );
}

function BossTeaseView({ onContinue }) {
  return (
    <section className="boss-tease-view page-enter" aria-labelledby="boss-tease-title">
      <img className="boss-tease-backdrop" src="/assets/boss-scene.jpg" alt="" />
      <div className="boss-tease-shade" aria-hidden="true" />
      <div className="boss-tease-signal" aria-hidden="true"><span /><i /><i /><i /></div>
      <div className="boss-tease-copy">
        <p className="scene-kicker">Tín hiệu xa · Chưa mở</p>
        <h1 id="boss-tease-title">Có một Lõi khác vừa đáp lại.</h1>
        <p>Cổng Ghép Đôi đã gửi ánh sáng đi rất xa. Một thử thách lớn hơn đang ngủ trong rừng; con sẽ gặp nó sau khi đủ các mạch cần thiết.</p>
        <div className="boss-tease-status"><span aria-hidden="true">◇</span><strong>Boss tease · không mở khóa</strong><small>Không thêm reward, không bỏ qua prerequisite.</small></div>
        <button className="tactile-button primary-action" type="button" onClick={onContinue}>Về bản đồ <b aria-hidden="true">➜</b></button>
      </div>
      <div className="boss-tease-nubi" aria-hidden="true"><NubiFigure stage={1} mood="resonant" alt="" /></div>
    </section>
  );
}

function TopBar({ progress, world, worldNodes, audioPreferences, audioCapability, sessionDisplay, onAudioPreferences, view, settingsOpen, onHome, onMap, onCreature, onCity, onSettings, onParent, settingsButtonRef, focusMode = false }) {
  const { percent } = getWorldProgress(world, progress);
  return (
    <header className={`topbar ${focusMode ? "topbar-focus" : ""}`} data-hud-focus={focusMode ? "true" : "false"}>
      <button className="brand-lockup" type="button" onClick={onHome} aria-label="Về sân chính Lumora">
        <span className="brand-rune" aria-hidden="true">◆</span>
        <span><strong>LUMORA</strong><small>{world.name}</small></span>
      </button>
      <div className="knowledge-stream" aria-label={`${percent}% ${world.name} đã hồi sinh, ${worldNodes.length} chặng`}>
        <span className="stream-label">Năng lượng tri thức</span>
        <span className="stream-track"><i style={{ width: `${percent}%` }} /></span>
        <b>{percent}%</b>
      </div>
      <nav className="hud-actions" aria-label={focusMode ? "Cài đặt phiên chơi" : "Điều hướng nhanh"}>
        {!focusMode && <button className={`hud-icon ${view === "map" || view === "world-preview" ? "active" : ""}`} type="button" onClick={onMap} aria-label="Mở bản đồ">⌖</button>}
        {!focusMode && <button className={`hud-icon ${view === "creature" ? "active" : ""}`} type="button" onClick={onCreature} aria-label="Gặp Nubi">◉</button>}
        {!focusMode && <button className={`hud-icon ${view === "city" ? "active" : ""}`} type="button" onClick={onCity} aria-label="Mở Thành phố Tri Thức">⌂</button>}
        {!focusMode && sessionDisplay.tone !== "off" && <span className={`session-compass-chip ${sessionDisplay.tone}`} title={sessionDisplay.label}><i aria-hidden="true">◔</i><b>{sessionDisplay.label}</b></span>}
        <div className="hud-meters" aria-label={focusMode ? `Kinh nghiệm học tập: ${progress.xp} XP` : `Tiến trình: ${progress.xp} XP và ${progress.shards} Mảnh Tri Thức`}>
          <span className="xp-counter" title="Kinh nghiệm học tập"><i aria-hidden="true">✦</i><b>{progress.xp}</b><small>XP</small></span>
          {!focusMode && <span className="shard-counter" title="Mảnh Tri Thức"><i aria-hidden="true">◆</i><b>{progress.shards}</b></span>}
        </div>
        <div className="settings-wrap">
          <button ref={settingsButtonRef} className="hud-icon" type="button" onClick={onSettings} aria-expanded={settingsOpen} aria-label="Mở cài đặt">⚙</button>
          {settingsOpen && (
            <div className="settings-menu" aria-label="Cài đặt âm thanh và tiện ích">
              <span>Âm thanh</span>
              <button type="button" aria-pressed={!audioPreferences.muted} onClick={() => onAudioPreferences({ muted: !audioPreferences.muted })}>Âm thanh tổng: <b>{audioPreferences.muted ? "Tắt" : "Bật"}</b></button>
              <button type="button" aria-pressed={audioPreferences.effectsEnabled} onClick={() => onAudioPreferences({ effectsEnabled: !audioPreferences.effectsEnabled })}>Hiệu ứng dịu: <b>{audioPreferences.effectsEnabled ? "Bật" : "Tắt"}</b></button>
              <button type="button" aria-pressed={audioPreferences.narrationEnabled} onClick={() => onAudioPreferences({ narrationEnabled: !audioPreferences.narrationEnabled })}>Giọng đọc mục tiêu: <b>{audioPreferences.narrationEnabled ? "Bật" : "Tắt"}</b></button>
              <label className="volume-control"><span>Âm lượng {Math.round(audioPreferences.volume * 100)}%</span><input type="range" min="0" max="1" step="0.05" value={audioPreferences.volume} onChange={(event) => onAudioPreferences({ volume: Number(event.target.value) })} /></label>
              <small className={`voice-capability ${audioCapability.available ? "available" : "unavailable"}`}>{audioCapability.available ? "Có giọng Việt local trên thiết bị" : "Chưa có giọng Việt local · vẫn giữ hướng dẫn chữ"}</small>
              <span>Tiện ích</span>
              <button type="button" onClick={onParent}>Khu vực phụ huynh</button>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}

function HomeView({ progress, profile, nextNode, world, onStart, onMap, onOpenCatalog, onCreature, onPractice, practiceResume, playDraft, onResumePlay, onRestartPlay, cosmeticId }) {
  const started = getWorldProgress(world, progress).completedCount > 0;
  const evolutionStage = getNubiEvolutionStage(progress, nubiEvolutionStages) ?? nubiEvolutionStages[0];
  const homeNubiMood = progress.nubiStage >= 2 ? "resonant" : nextNode ? "curious" : "idle";
  const homeNubiEnergyTypes = Array.isArray(nextNode?.energyTypes) ? nextNode.energyTypes : [];
  const draftNode = playDraft?.mode === "main" ? nodes.find((node) => node.id === playDraft.nodeId) : null;
  const draftQuest = playDraft?.mode === "quest" ? optionalQuests.find((quest) => quest.id === playDraft.questId) : null;
  const draftTarget = draftNode ?? draftQuest;
  return (
    <section className="scene home-scene page-enter" aria-labelledby="home-title">
      <img className="scene-backdrop" src="/assets/awakened-forest-clean.png" alt="Khu rừng Lumora hồi sinh quanh một dòng suối phát sáng" />
      <div className="scene-vignette" aria-hidden="true" />
      <div className="home-copy">
        <p className="scene-kicker">{profile?.alias ? `${profile.alias} · ` : ""}{world.chapter} · {world.name}</p>
        <h1 id="home-title">Đánh thức điều<br />khu rừng đã quên.</h1>
        <p className="home-lead">Mỗi thử thách trả lại một phần ánh sáng cho Lumora.</p>
        <div className="home-actions">
          <button className="tactile-button primary-action" type="button" onClick={onStart}>
            <span>{started ? "Tiếp tục hành trình" : "Chạm để đánh thức"}</span><b aria-hidden="true">➜</b>
          </button>
          <button className="quiet-action" type="button" onClick={onMap}>Xem bản đồ</button>
          <button className="quiet-action catalog-entry-action" type="button" onClick={onOpenCatalog}>Campaign Grade 1 · Level Runtime v1</button>
        </div>
        {draftTarget && (
          <article className="play-resume-card" aria-label={`Phiên đang dở: ${draftTarget.title}`}>
            <div className="play-resume-icon" aria-hidden="true">{draftTarget.icon}</div>
            <div className="play-resume-copy">
              <small>{draftQuest ? "Nhiệm vụ phụ đang dở" : "Chặng đang dở"} · {playDraft.phaseCount > 1 ? `chặng ${Math.min(playDraft.phaseIndex + 1, playDraft.phaseCount)}/${playDraft.phaseCount}` : "sẵn sàng tiếp tục"}</small>
              <strong>{draftTarget.title}</strong>
              <span>Tiến trình local được giữ trên thiết bị này.</span>
            </div>
            <div className="play-resume-actions">
              <button className="tactile-button primary-action" type="button" onClick={onResumePlay}>Tiếp tục <b aria-hidden="true">➜</b></button>
              <button className="quiet-action" type="button" onClick={onRestartPlay}>Bắt đầu lại</button>
            </div>
          </article>
        )}
        {started && (
          <button className="practice-home-action" type="button" onClick={onPractice}>
            <span aria-hidden="true">✦</span>
            <span>
              <small>{practiceResume ? `Phiên đang dở · ${practiceResume.session.currentIndex}/${practiceResume.session.queue.length} thử thách` : "Phiên củng cố Daily Adventure"}</small>
              <strong>{practiceResume ? "Tiếp tục Daily Adventure" : "Luyện tập hôm nay"}</strong>
            </span>
            <b aria-hidden="true">➜</b>
          </button>
        )}
        <div className="next-marker">
          <span className="marker-icon" aria-hidden="true">{nextNode.icon}</span>
          <span><small>Điểm sáng tiếp theo</small><strong>{nextNode.title}</strong></span>
        </div>
      </div>
      <button className="nubi-hero" type="button" onClick={onCreature} aria-label={`Gặp Nubi, Linh Thú ${evolutionStage.name}`}>
        <span className="nubi-aura" aria-hidden="true"><i /><i /><i /><i /></span>
        <NubiFigure className="home-nubi-figure" stage={progress.nubiStage} mood={homeNubiMood} energyTypes={homeNubiEnergyTypes} cosmeticId={cosmeticId} alt="Nubi với ba dải cảm giác và Lõi Tri Thức trên ngực" />
        <span className="nubi-label"><b>NUBI</b><small>Linh Thú {evolutionStage.name}</small></span>
      </button>
      <div className="home-whisper" aria-hidden="true"><span>✦</span> Ánh sáng đang gọi con</div>
    </section>
  );
}

function MapView({ progress, nextNode, world, worldNodes, worldQuests, nextWorld, onStart, onStartQuest, onCity, onPreviewWorld, firstVisit = false, onDismissIntro, firstSessionNextId = null, firstSessionIntroSeen = false, onStartNext }) {
  const worldProgress = getWorldProgress(world, progress);
  const completedQuestCount = worldQuests.filter((quest) => progress.questState.completedIds.includes(quest.id)).length;
  const nextWorldStatus = getWorldStatus(nextWorld, progress, worlds);
  const firstSessionNode = worldNodes.find((node) => node.id === firstSessionNextId) ?? null;
  return (
    <section className="map-view page-enter" aria-labelledby="map-title">
      <div className="map-titlebar">
        <div><p className="scene-kicker">Bản đồ phiêu lưu · {world.chapter}</p><h1 id="map-title">{world.name}</h1></div>
        <div className="map-count"><b>{worldProgress.completedCount}</b><span>/ {worldProgress.totalCount} vùng đã hồi sinh</span><small>{completedQuestCount}/{worldQuests.length} lối rẽ đã khám phá</small></div>
      </div>
      {firstSessionNode && (
        <aside className="first-session-continuation" aria-labelledby="first-session-continuation-title">
          <span className="first-session-continuation-icon" aria-hidden="true">2</span>
          <div className="first-session-continuation-copy">
            <small>{firstSessionIntroSeen ? "Mạch đang tiếp tục" : "Mạch tiếp theo · Cách chơi mới"}</small>
            <strong id="first-session-continuation-title">Cổng Ghép Đôi đang gọi con.</strong>
            <span>Ghép mỗi con số với nhóm đom đóm có cùng số lượng. Mạch sẽ chỉ cho con một bước trước khi thử.</span>
          </div>
          <button className="tactile-button primary-action" type="button" onClick={onStartNext}>{firstSessionIntroSeen ? "Tiếp tục chặng" : "Xem cách chơi"} <b aria-hidden="true">➜</b></button>
        </aside>
      )}
      <div className="map-stage">
        <img src={world.mapAsset ?? "/assets/world-map.jpg"} alt={`Bản đồ ${world.name} với các vùng nối đến thử thách cuối`} />
        <div className="map-shade" aria-hidden="true" />
        {nextWorld && (
          <aside className={`world-horizon-card ${nextWorldStatus}`} aria-label={`Chân trời kế tiếp: ${nextWorld.name}`}>
            <button className="world-horizon-trigger" type="button" onClick={() => onPreviewWorld?.(nextWorld)} aria-label={`Mở bản thiết kế preview của ${nextWorld.name}`}>
              <span aria-hidden="true">◈</span>
              <div><small>Chân trời kế tiếp</small><strong>{nextWorld.name}</strong><p>{nextWorldStatus === "locked" ? `Hoàn thành ${world.name} để soi rõ vùng này.` : nextWorld.description}</p></div>
              <b>{nextWorldStatus === "locked" ? "Đang ngủ" : "Preview"}</b>
            </button>
          </aside>
        )}
        {firstVisit && (
          <aside className="map-first-visit" role="status" aria-live="polite">
            <span className="map-first-rune" aria-hidden="true">✦</span>
            <div>
              <small>ĐIỂM BẮT ĐẦU</small>
              <strong>Đây là ký ức đầu tiên.</strong>
              <p>Chạm vào đốm sáng đang mở để cùng Nubi đánh thức khu rừng.</p>
            </div>
            <button className="quiet-action" type="button" onClick={onDismissIntro}>Đã hiểu</button>
          </aside>
        )}
        <div className="map-node-layer">
          {worldNodes.map((node) => {
            const unlocked = isNodeUnlocked(node.id, world.nodeIds, progress);
            const completed = progress.completed.includes(node.id);
            return (
              <button
                key={node.id}
                type="button"
                className={`map-node ${unlocked ? "unlocked" : "locked"} ${completed ? "completed" : ""} ${nextNode.id === node.id ? "next" : ""} ${firstSessionNextId === node.id ? "first-session-next" : ""}`}
                style={{ left: `${node.position.x}%`, top: `${node.position.y}%` }}
                onClick={() => onStart(node)}
                disabled={!unlocked}
                aria-label={`${node.index}. ${node.title}${completed ? ", đã hồi sinh" : unlocked ? ", đang mở" : ", đang ngủ"}`}
              >
                <span className="node-core" aria-hidden="true">{completed ? "✓" : unlocked ? node.icon : "◇"}</span>
                <span className="node-label"><small>{String(node.index).padStart(2, "0")}</small><b>{node.shortTitle}</b></span>
              </button>
            );
          })}
          {worldQuests.map((quest) => {
            const status = getQuestStatus(quest, progress, progress.questState);
            if (status === "hidden") return null;
            const completed = status === "completed";
            const locked = status === "locked";
            return (
              <button
                key={quest.id}
                type="button"
                className={`optional-map-node quest-${quest.kind} ${status}`}
                style={{ left: `${quest.position.x}%`, top: `${quest.position.y}%` }}
                onClick={() => onStartQuest(quest)}
                disabled={locked}
                aria-label={`${quest.kind === "secret" ? "Nhiệm vụ bí mật" : "Nhiệm vụ phụ"}: ${quest.title}${completed ? ", đã hoàn thành" : locked ? ", chưa mở" : ", đang mở"}`}
              >
                <span className="optional-node-core" aria-hidden="true">{completed ? "✓" : locked ? "◇" : quest.icon}</span>
                {quest.kind === "side" && <span className="optional-node-label"><small>Nhiệm vụ phụ</small><b>{quest.shortTitle}</b></span>}
              </button>
            );
          })}
        </div>
        <aside className="map-quest-card">
          <span className="quest-status">Chặng đang gọi</span>
          <h2>{nextNode.title}</h2>
          <p>{nextNode.prompt}</p>
          <div className="quest-meta"><span>{nextNode.icon} {nextNode.skillNameVi}</span><span>+{nextNode.reward} ◆</span></div>
          <button className="tactile-button primary-action full" type="button" onClick={() => onStart(nextNode)}>Bắt đầu chặng <b aria-hidden="true">➜</b></button>
          <button className="map-city-link" type="button" onClick={onCity}>Xem Thành phố Tri Thức</button>
        </aside>
      </div>
    </section>
  );
}

function WorldPreviewView({ world, onBack }) {
  const preview = world.preview ?? {
    title: world.name,
    kicker: "Bản thiết kế thế giới kế tiếp",
    description: world.description,
    pillars: [],
    gate: "Chưa có curriculum playable được phê duyệt.",
  };

  return (
    <section className="world-preview-view page-enter" aria-labelledby="world-preview-title">
      <div className="world-preview-constellation" aria-hidden="true"><i /><i /><i /><span /></div>
      <header className="world-preview-heading">
        <div>
          <p className="scene-kicker">{preview.kicker}</p>
          <h1 id="world-preview-title">{preview.title}</h1>
          <p className="world-preview-subtitle">{world.chapter} · {world.name}</p>
        </div>
        <span className="preview-status-pill">WORLD BLUEPRINT · PREVIEW</span>
      </header>
      <div className="world-preview-layout">
        <article className="world-preview-card">
          <span className="world-preview-label">Một chân trời đang được soi</span>
          <p className="world-preview-description">{preview.description}</p>
          {preview.pillars.length > 0 && (
            <ul className="world-preview-pillars" aria-label="Các hướng trải nghiệm dự kiến">
              {preview.pillars.map((pillar) => <li key={pillar}><span aria-hidden="true">✦</span><span>{pillar}</span></li>)}
            </ul>
          )}
          <div className="world-preview-gate">
            <span aria-hidden="true">◈</span>
            <div><strong>Chưa mở playable</strong><p>{preview.gate}</p></div>
          </div>
          <p className="world-preview-boundary">Màn hình này chỉ để duyệt hướng thiết kế. Không có node, reward, approval hay progress nào được tạo từ đây.</p>
          <button className="tactile-button primary-action" type="button" onClick={onBack}><span>← Về bản đồ</span></button>
        </article>
        <aside className="world-preview-signal" aria-label="Trạng thái bản thiết kế">
          <div className="preview-signal-orb"><span>◈</span><i /><i /><i /></div>
          <span className="world-preview-label">Tín hiệu chưa kích hoạt</span>
          <h2>Hãy giữ lại khoảng trống cho những điều mới.</h2>
          <p>World này sẽ chỉ chuyển sang playable khi có curriculum evidence chính thức và được con người phê duyệt.</p>
        </aside>
      </div>
    </section>
  );
}

const hintsByType = {
  numeral: ["Nhìn số lượng hạt trong Lõi đang gọi.", "Đếm từng hạt rồi tìm chữ số cùng số lượng.", "Mạch viền sẽ soi chữ số đúng với nhóm hạt hiện tại."],
  "compare-pair": ["Nhìn hai hạt trong cùng một cặp.", "Hạt to hơn vào ô Lớn hơn; hạt nhỏ hơn vào ô Nhỏ hơn.", "Mạch viền làm nổi hạt có kích thước đúng với quan hệ đang gọi."],
  "daily-weave": ["Nhìn biểu tượng trên từng ký ức và tìm dòng năng lượng cùng dấu.", "Mỗi ký ức chỉ hợp với một dòng; hãy so sánh biểu tượng trước khi kéo.", "Kéo ký ức về dòng có cùng biểu tượng năng lượng, rồi tìm nhịp còn trống."],
  discovery: ["Nhìn biểu tượng trên dấu sáng và các mạch đang chờ.", "Mỗi dấu sáng nối với một mạch có cùng dấu; hãy thử từ mạch rõ nhất.", "Đặt dấu sáng vào mạch có cùng biểu tượng để khép lại đúng hành trình."],
  restore: ["Nhìn hai thanh nước và ánh sáng cùng dấu mục tiêu.", "Vạt cỏ đang cần thêm nước và bớt ánh sáng.", "Kéo Gọi mưa nhẹ vào Nước, rồi Hạ lá che vào Ánh sáng."],
  route: ["Mỗi hạt đang có một tuyến nối tới hai bờ.", "So sánh kích thước hạt với dấu hiệu của bờ nông và bờ sâu.", "Kéo hạt nhỏ về bờ nông, hạt lớn về bờ sâu để dòng suối sáng lại."],
  path: ["Nhìn hai khoảng trống ở cuối đường sáng.", "Mỗi quầng sáng tạo thêm đúng một bước.", "Kéo từng quầng sáng vào hai bước còn thiếu."],
  collect: ["Nhìn những hạt có lõi phát sáng.", "Chạm từng hạt và nhìn bộ đếm tăng lên.", "Mạch đã làm nhịp sáng quanh 5 hạt cần tìm."],
  match: ["Đếm số đom đóm trong từng nhóm.", "Chọn con số trước, rồi chọn nhóm có cùng lượng.", "Bắt đầu từ nhóm ít đom đóm nhất."],
  bridge: ["Cây cầu đang có 4 nhịp sáng.", "Mỗi tinh thể sẽ nối thêm một nhịp đến cổng.", "Mạch làm nổi tinh thể gần nhất và bệ cầu."],
  subtract: ["Bắt đầu với 6 đom đóm và đưa bớt từng bạn về tổ.", "Mỗi đom đóm về tổ làm nhóm còn lại ít đi một.", "Đưa đúng 2 bạn về tổ để còn 4 bạn ngoài vườn."],
  sort: ["Nhìn kích thước hạt đang được chọn.", "Hạt nhỏ về bờ nông, hạt lớn về bờ sâu.", "Mạch sẽ giữ sáng đúng bờ cho hạt tiếp theo."],
  order: ["Nhìn nhãn từng dấu sáng và tìm dấu bắt đầu.", "Mỗi lượt chỉ đặt dấu đang đến trước vào ô kế tiếp.", "Theo dõi ô đang sáng rồi nối ba dấu thành một dòng."],
  shape: ["So đường viền của mảnh và ổ khóa.", "Hình tròn không có góc; hình tam giác có 3 góc.", "Chọn mảnh rồi chọn ổ khóa giống hệt."],
  rune: ["Nhìn ba rune đầu tiên.", "Mặt trời, lá, tinh thể đang lặp lại.", "Sau mặt trời và lá sẽ là tinh thể."],
  scenario: ["Míu cần 2 phần, Tí cần 3 phần.", "Chọn một phần ăn rồi chọn đúng bạn.", "Khi một bạn đủ phần, hãy chia phần còn lại cho bạn kia."],
  mixed: ["Mỗi mạch chỉ cần một việc nhỏ.", "Hoàn thành theo thứ tự: đếm, thêm, nhận hình.", "Mạch đang làm sáng thao tác cuối của mỗi pha."],
  challenge: ["Ba khóa dùng ghép đôi, nối đường và so sánh kích thước.", "Ghép số trước, nối đường sau, phân loại hạt cuối cùng.", "Không cần vội; mỗi khóa sẽ giữ nguyên khi đã mở."],
  boss: ["Con không đánh nhau; con đang trả lại ánh sáng.", "Ba pha lần lượt là đếm, cộng và quy luật.", "Mạch sẽ giữ sáng thao tác cuối để con hoàn tất."],
};
const errorHintsByType = {
  numeral: {
    "no-selection": ["Chọn một chữ số trước khi đặt vào Lõi.", "Đếm nhóm hạt rồi chọn chữ số cùng số lượng.", "Chọn chữ số đã sáng viền và kéo vào Lõi gọi số."],
    "wrong-numeral": ["Chữ số này chưa khớp với số hạt.", "Đếm lại từng hạt trong Lõi rồi so với các chữ số.", "Nhóm hạt hiện tại có đúng số lượng bằng chữ số mục tiêu."],
  },
  "compare-pair": {
    "no-selection": ["Chọn một hạt trước khi đặt vào ô.", "Nhìn hạt nào to hơn hoặc nhỏ hơn rồi chọn cùng quan hệ.", "Chọn hạt đã sáng viền và đặt vào ô đang được gọi."],
    "compare-mismatch": ["Cặp này chưa khớp với quan hệ đang gọi.", "So hạt với dấu tròn của ô Lớn hơn và Nhỏ hơn.", "Hạt lớn đi vào Lớn hơn; hạt nhỏ đi vào Nhỏ hơn."],
  },
  "daily-weave": {
    "wrong-lane": ["Dòng này chưa cùng loại năng lượng với ký ức.", "Hãy nhìn biểu tượng trên ký ức và trên từng dòng đang mở.", "Kéo ký ức vào dòng có cùng biểu tượng năng lượng."],
    full: ["Dòng năng lượng này đã đủ chỗ rồi.", "Tìm dòng còn chỗ trống và vẫn có cùng biểu tượng.", "Đưa ký ức sang dòng cùng biểu tượng đang còn nhịp trống."],
    "max-actions": ["Mạch đã dùng hết lượt thử trong nhịp này.", "Hãy dừng lại, nhìn biểu tượng rồi chọn dòng trước khi kéo.", "Mỗi ký ức chỉ cần một lần kéo chính xác vào dòng cùng biểu tượng."],
    "already-placed": ["Ký ức này đã nằm trong mạch rồi.", "Tìm một ký ức chưa có dấu đã đặt trong kho.", "Chọn ký ức còn lại và kéo vào dòng cùng biểu tượng."],
    "no-selection": ["Chọn một ký ức trước khi đưa vào dòng năng lượng.", "Sau khi chọn, hãy tìm dòng có cùng biểu tượng.", "Chọn ký ức rồi kéo hoặc chạm vào đúng dòng đang còn chỗ."],
  },
  discovery: {
    "wrong-slot": ["Dấu sáng này chưa thuộc mạch đang chọn.", "So sánh biểu tượng của dấu sáng với các mạch đang chờ.", "Đặt dấu sáng vào mạch có cùng biểu tượng để nối đúng hành trình."],
    "occupied-slot": ["Mạch này đã có một dấu sáng rồi.", "Tìm mạch còn trống trong hàng đang chờ.", "Chọn dấu sáng chưa dùng và đặt vào mạch còn thiếu cùng biểu tượng."],
    "no-selection": ["Chọn một dấu sáng trước khi đặt vào mạch.", "Sau đó tìm mạch có cùng biểu tượng.", "Kéo dấu sáng đã chọn vào mạch còn trống có cùng biểu tượng."],
  },
  restore: {
    "no-selection": ["Chọn một dụng cụ môi trường trước nhé.", "Gọi mưa nhẹ điều chỉnh Nước; Hạ lá che điều chỉnh Ánh sáng.", "Chạm dụng cụ rồi kéo vào thanh có cùng biểu tượng."],
    "restoration-invalid": ["Dụng cụ này không điều chỉnh nguồn con vừa chọn.", "Nhìn biểu tượng trên dụng cụ và trên thanh mục tiêu.", "Nước dùng ◆/⌁; Ánh sáng dùng ☀/◌."],
    "restoration-drift": ["Chỉ số vừa đi xa mục tiêu hơn một chút.", "Đổi sang dụng cụ có mũi tên ngược chiều.", "Nước cần tăng một nấc, ánh sáng cần giảm một nấc."],
    "action-limit": ["Vạt cỏ chỉ cần vài thao tác chính xác.", "Đọc mục tiêu trước khi dùng dụng cụ.", "Mỗi nguồn chỉ cần kéo về đúng dấu mục tiêu."],
  },
  route: {
    "wrong-route": ["Hạt này chưa hợp với bờ đang chọn.", "Hạt nhỏ đi với bờ nông; hạt lớn đi với bờ sâu.", "Nhìn kích thước hạt rồi kéo theo tuyến có cùng dấu."],
    "invalid-connection": ["Tuyến này chưa nối với bến hạt.", "Chọn một trong hai bờ đang có đường sáng.", "Chỉ hai bờ nông và sâu mới nhận hạt từ bến này."],
    capacity: ["Bờ này đã đủ hạt rồi.", "Hãy tìm bờ còn chỗ sáng.", "Mỗi bờ nhận đúng hai hạt theo kích thước của mình."],
  },
  collect: {
    "dormant-seed": ["Hạt đang ngủ không có lõi sáng.", "Soi phần giữa của từng hạt trước khi chạm.", "Chỉ chọn năm hạt có tia sáng nhỏ bên trong."],
  },
  match: {
    "no-selection": ["Chọn một phiến số trước nhé.", "Sau đó tìm nhóm có đúng số đom đóm ấy.", "Bắt đầu với phiến số đang nằm trong kho số."],
    "quantity-mismatch": ["Hai phía chưa có cùng số lượng.", "Đếm từng đom đóm trong nhóm rồi so với phiến số.", "Đưa số 2 đến nhóm 2, số 4 đến nhóm 4 và số 6 đến nhóm 6."],
  },
  bridge: {
    "invalid-crystal": ["Tinh thể này chưa nằm trong mạch cầu.", "Tìm tinh thể còn sáng trong khay phía dưới.", "Mỗi tinh thể hợp lệ sẽ nối thêm đúng một nhịp cầu."],
    "already-placed": ["Tinh thể này đã nối rồi.", "Nhìn nhịp cầu còn dấu cộng nhé.", "Chọn một tinh thể chưa có chữ Đã nối."],
  },
  path: {
    "no-selection": ["Chọn một quầng sáng trước nhé.", "Sau đó đặt nó vào một bước còn dấu cộng.", "Mỗi quầng sáng chỉ dùng một lần cho một bước trống."],
    "occupied-slot": ["Bước này đã có ánh sáng rồi.", "Tìm ô dấu cộng kế tiếp trên đường.", "Chỉ hai bước cuối còn cần thêm quầng sáng."],
    "duplicate-wisp": ["Quầng sáng này đã ở trên đường rồi.", "Trong khay còn quầng sáng chưa dùng.", "Chọn quầng còn lại rồi kéo vào bước trống."],
  },
  sort: {
    "no-selection": ["Chọn một hạt trước khi chọn bờ.", "Nhìn kích thước hạt đang có viền sáng.", "Hạt nhỏ về bờ nông, hạt lớn về bờ sâu."],
    "size-mismatch": ["Bờ này chưa hợp với kích thước hạt.", "So hạt với dấu tròn trên hai bờ.", "Hạt nhỏ đi bờ nông; hạt lớn đi bờ sâu."],
  },
  order: {
    "no-selection": ["Chọn một dấu sáng trước nhé.", "Sau đó đặt dấu đang đến lượt vào ô đang mở.", "Mạch làm sáng dấu kế tiếp và ô cần nhận nó."],
    "wrong-order": ["Dấu này chưa đến lượt trong dòng ký ức.", "Nhìn ô đang sáng và tìm dấu nối tiếp ngay trước nó.", "Đặt lần lượt dấu đầu, dấu giữa rồi dấu cuối."],
    "occupied-slot": ["Ô này đã có dấu sáng rồi.", "Tìm ô còn trống trong dòng.", "Ô sáng tiếp theo sẽ nhận dấu đang đến lượt."],
    "already-placed": ["Dấu này đã nằm trong dòng rồi.", "Chọn một dấu chưa được đặt.", "Theo dõi các dấu đã sáng và chọn phần còn lại."],
  },
  shape: {
    "no-selection": ["Chọn một mảnh hình trước nhé.", "Sau đó tìm khe có cùng đường viền.", "Mảnh đã chọn sẽ sáng nhẹ để con theo dõi."],
    "shape-mismatch": ["Mảnh này chưa khớp đường viền.", "Đếm góc và cạnh của mảnh với khe.", "Hình tròn vào khe tròn, tam giác vào khe tam giác, vuông vào khe vuông."],
    "occupied-slot": ["Khe này đã được sửa rồi.", "Tìm khe còn dấu cộng trong cỗ máy.", "Chỉ đặt mảnh vào khe chưa có chữ Đã sửa."],
  },
  rune: {
    "wrong-pattern": ["Rune này chưa nối tiếp nhịp.", "Đọc lại chuỗi mặt trời, lá, tinh thể.", "Sau mặt trời và lá, ô trống cần tinh thể."],
  },
  scenario: {
    "no-selection": ["Chọn một phần quả sáng trước nhé.", "Sau đó chọn một người bạn đang chờ.", "Mỗi phần quả chỉ được trao một lần."],
    "full-friend": ["Bạn này đã đủ phần rồi.", "Nhìn bạn còn chữ Đang chờ.", "Míu cần 2 phần, Tí cần 3 phần; chia phần còn lại cho bạn kia."],
    "wrong-portion": ["Phần quả này chưa vào đúng chỗ.", "Chọn một bạn còn đang chờ phần.", "Đưa từng phần quả vào trạm của Míu hoặc Tí còn trống."],
  },
};
const oracleProvider = createRuleBasedOracleProvider(hintsByType, { errorHints: errorHintsByType });
const nubiFeedbackCopy = Object.freeze({
  idle: "Nubi đang lắng nghe",
  curious: "Nubi đang quan sát",
  hint: "Nubi đang soi đường",
  "soft-fail": "Nubi cùng con thử lại",
  "phase-complete": "Nubi giữ mạch vừa sáng",
  resonant: "Nubi đang tỏa sáng",
});

function PlayView({ node, onBack, onComplete, telemetry, audio, learnerContext, modeLabel, sessionProgress, nubiStage = 1, rewardPending = false, previewMode = false, initialPhaseIndex = 0, onPhaseCheckpoint }) {
  const [mistakes, setMistakes] = useState(0);
  const [supportsUsed, setSupportsUsed] = useState(0);
  const [hintLevel, setHintLevel] = useState(0);
  const [guided, setGuided] = useState(false);
  const [actions, setActions] = useState(0);
  const [notice, setNotice] = useState("Mạch đang lắng nghe. Con cứ thử theo cách của mình.");
  const [noticeTone, setNoticeTone] = useState("calm");
  const [finishing, setFinishing] = useState(false);
  const [nubiFeedback, setNubiFeedback] = useState(createNubiFeedbackState);
  const [nubiSignal, setNubiSignal] = useState(createNubiSignalState);
  const [oraclePresence, setOraclePresence] = useState(createOraclePresenceState);
  const [lastErrorCode, setLastErrorCode] = useState(null);
  const roundIdRef = useRef(Date.now());
  const activeDurationRef = useRef(0);
  const completionTimerRef = useRef(null);
  const nubiSignalTimerRef = useRef(null);
  const interactionSpec = getInteractionSpec(node.type);
  const interactionRuntime = normalizeInteractionRuntime(interactionSpec);
  const supportPlan = oracleProvider.getSupportPlan({
    ageBand: learnerContext?.ageBand,
    bestMastery: learnerContext?.skillMetric?.bestMastery,
    completions: learnerContext?.skillMetric?.completions,
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible" && document.hasFocus()) activeDurationRef.current += 1;
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setOraclePresence((current) => transitionOraclePresence(current, { type: "level-open" }));
    setNubiSignal((current) => transitionNubiSignal(current, { type: "level-open" }));
  }, [node.id]);

  useEffect(() => () => {
    if (completionTimerRef.current !== null) window.clearTimeout(completionTimerRef.current);
    if (nubiSignalTimerRef.current !== null) window.clearTimeout(nubiSignalTimerRef.current);
  }, []);

  function pulseNubiSignal(eventType, recoveryEvent = "cooldown", delay = 520) {
    if (nubiSignalTimerRef.current !== null) {
      window.clearTimeout(nubiSignalTimerRef.current);
      nubiSignalTimerRef.current = null;
    }
    setNubiSignal((current) => transitionNubiSignal(current, { type: eventType }));
    if (recoveryEvent === null || delay === null) return;
    nubiSignalTimerRef.current = window.setTimeout(() => {
      nubiSignalTimerRef.current = null;
      setNubiSignal((current) => transitionNubiSignal(current, { type: recoveryEvent }));
    }, delay);
  }

  function onAction() {
    setActions((value) => value + 1);
    setOraclePresence((current) => transitionOraclePresence(current, { type: "player-action" }));
    pulseNubiSignal("player-action");
    setNubiFeedback((current) => {
      const mood = getNubiMood(current);
      const type = mood === "phase-complete"
        ? "next-phase"
        : mood === "hint" || mood === "soft-fail"
          ? "retry"
          : "start";
      return transitionNubiFeedback(current, { type });
    });
  }

  function normalizeFailure(failure) {
    if (failure && typeof failure === "object" && !Array.isArray(failure)) {
      return {
        message: typeof failure.message === "string" && failure.message.trim() ? failure.message : "Mạch chưa nhận được thao tác này. Con thử lại nhé.",
        errorCode: typeof failure.errorCode === "string" && failure.errorCode.trim() ? failure.errorCode.trim() : null,
      };
    }
    return {
      message: typeof failure === "string" && failure.trim() ? failure : "Mạch chưa nhận được thao tác này. Con thử lại nhé.",
      errorCode: null,
    };
  }

  function onFail(failure) {
    const { message, errorCode } = normalizeFailure(failure);
    const nextMistakes = mistakes + 1;
    setMistakes(nextMistakes);
    setLastErrorCode(errorCode);
    setOraclePresence((current) => transitionOraclePresence(current, { type: "soft-fail" }));
    pulseNubiSignal("soft-fail");
    setNubiFeedback((current) => transitionNubiFeedback(current, { type: "soft-fail" }));
    playInteractionCue("soft-fail", "tap", `${node.id}-fail-${nextMistakes}`);
    telemetry?.trackLearning("attempt", { nodeId: node.id, skillId: node.skillId, outcome: "soft-fail", ...(errorCode ? { errorCode } : {}) });
    if (nextMistakes === supportPlan.autoHintAfter && hintLevel === 0) {
      const hint = oracleProvider.getHint({ type: node.type, level: 1, errorCode });
      setHintLevel(1);
      setSupportsUsed((value) => value + 1);
      setOraclePresence((current) => transitionOraclePresence(current, { type: "auto-hint", hintLevel: 1 }));
      pulseNubiSignal("hint-requested", "cooldown", 900);
      setNotice(hint.text);
      setNoticeTone("hint");
      setNubiFeedback((current) => transitionNubiFeedback(current, { type: "hint" }));
      playInteractionCue("hint", "tap", `${node.id}-auto-hint-1`);
      void audio.narrate(hint.text, { dedupeKey: `${node.id}-auto-hint-1` });
      telemetry?.trackLearning("hint-viewed", { nodeId: node.id, skillId: node.skillId, hintLevel: 1, trigger: "auto", supportPolicy: supportPlan.id, priorMastery: learnerContext?.skillMetric?.bestMastery ?? 0, ...(errorCode ? { errorCode } : {}) });
      return;
    }
    setNoticeTone("nudge");
    setNotice(message);
  }

  function askSupport() {
    if (hintLevel < 3) {
      const next = hintLevel + 1;
      const hint = oracleProvider.getHint({ type: node.type, level: next, errorCode: lastErrorCode });
      setHintLevel(next);
      setSupportsUsed((value) => value + 1);
      setOraclePresence((current) => transitionOraclePresence(current, { type: "hint-requested", hintLevel: next }));
      pulseNubiSignal("hint-requested", "cooldown", 900);
      setNotice(hint.text);
      setNoticeTone("hint");
      setNubiFeedback((current) => transitionNubiFeedback(current, { type: "hint" }));
      playInteractionCue("hint", "tap", `${node.id}-hint-${next}`);
      void audio.narrate(hint.text, { dedupeKey: `${node.id}-hint-${next}-${lastErrorCode ?? "generic"}` });
      telemetry?.trackLearning("hint-requested", { nodeId: node.id, skillId: node.skillId, hintLevel: hint.level, provider: oracleProvider.descriptor.id, supportPolicy: supportPlan.id, ...(lastErrorCode ? { errorCode: lastErrorCode } : {}) });
      return;
    }
    if (guided) return;
    setGuided(true);
    setSupportsUsed((value) => value + 1);
    setOraclePresence((current) => transitionOraclePresence(current, { type: "guidance-started", hintLevel: 3 }));
    pulseNubiSignal("hint-requested", "cooldown", 900);
    setNubiFeedback((current) => transitionNubiFeedback(current, { type: "hint" }));
    setNotice("Mạch đã làm sáng thao tác cuối. Con vẫn là người hoàn thành nó.");
    setNoticeTone("guided");
    playInteractionCue("hint", "tap", `${node.id}-guided`);
    void audio.narrate("Mạch đã làm sáng thao tác cuối. Con vẫn là người hoàn thành nó.", { dedupeKey: `${node.id}-guided` });
    telemetry?.trackLearning("support-used", { nodeId: node.id, skillId: node.skillId, kind: "guided-completion" });
  }

  function finish(extraActions = 1) {
    if (finishing) return;
    const durationSeconds = Math.max(1, activeDurationRef.current);
    playInteractionCue(node.id === "boss" ? "evolution" : "success", "success", `${node.id}-complete-${roundIdRef.current}`);
    setOraclePresence((current) => transitionOraclePresence(current, { type: "level-success" }));
    pulseNubiSignal("level-success", null, null);
    setNubiFeedback((current) => transitionNubiFeedback(current, { type: "level-success" }));
    setFinishing(true);
    completionTimerRef.current = window.setTimeout(() => {
      setOraclePresence((current) => transitionOraclePresence(current, { type: "dissolve" }));
      completionTimerRef.current = window.setTimeout(() => {
        completionTimerRef.current = null;
        onComplete({ node, mistakes, supportsUsed, guided, actions: actions + extraActions, durationSeconds });
      }, 260);
    }, 360);
  }

  function narrateObjective() {
    void audio.unlockFromGesture().then(() => {
      playInteractionCue("tap", "hint", `${node.id}-objective-replay-cue`);
      void audio.narrate(node.prompt, { dedupeKey: `${node.id}-objective-replay-${roundIdRef.current}` });
    });
  }

  function playInteractionCue(requestedCue, fallbackCue, dedupeKey) {
    const cue = getInteractionAudioCue(interactionSpec, requestedCue, fallbackCue);
    if (cue) void audio.playCue(cue, { dedupeKey });
  }

  function onPhaseComplete(phase, phaseIndex) {
    setNubiFeedback((current) => transitionNubiFeedback(current, { type: "phase-complete" }));
    pulseNubiSignal("phase-complete", "recovery", 900);
    telemetry?.trackLearning("phase-solved", { nodeId: node.id, skillId: node.skillId, phaseId: phase.id, phaseIndex, mechanic: phase.mechanic, sourceNodeId: phase.sourceNodeId });
    if (node.id === "boss") telemetry?.trackGameplay("boss-phase-complete", { nodeId: node.id, phaseId: phase.id, phaseIndex });
    const phaseCount = getPlayPhaseCount(node);
    if (!previewMode && phaseIndex + 1 < phaseCount) onPhaseCheckpoint?.({ phaseIndex: phaseIndex + 1, phaseCount });
  }

  const nubiMood = getNubiMood(nubiFeedback);
  const nubiSignalView = getNubiSignal(nubiSignal);
  const oracleView = getOraclePresence(oraclePresence);
  const oracleState = oracleView.dataState ?? oracleView.state ?? "dormant";

  return (
    <section className={`play-view page-enter ${finishing ? "is-finishing" : ""}`} style={{ "--level-bg": `url(${node.scene})` }} aria-labelledby="level-title">
      <img className="play-backdrop" src={node.scene} alt={`Khung cảnh ${node.title} trong Rừng Thức Tỉnh`} />
      <div className="play-vignette" aria-hidden="true" />
      {finishing && <div className="success-burst" role="status" aria-live="polite"><NubiFigure className="success-nubi" stage={nubiStage} mood="resonant" signalState={nubiSignal} energyTypes={node.energyTypes} reward={rewardPending} alt="Nubi tỏa sáng khi chặng hoàn tất" /><span aria-hidden="true">✦</span><strong>{node.id === "boss" ? "Lõi Tri Thức đã sáng lại." : "Mạch ánh sáng đã hoàn tất."}</strong><small>Nubi đang giữ ánh sáng cho con.</small></div>}
      <header className="level-header">
        <button className="round-control" type="button" onClick={() => { audio.stop(); onBack(); }} aria-label="Quay lại bản đồ">←</button>
        <div className="level-heading"><span>{modeLabel || node.chapter}</span><h1 id="level-title">{node.title}</h1></div>
        <div className="level-counter"><span>{sessionProgress ? "Thử thách" : node.kind === "secret" ? "Lối ẩn" : node.kind === "side" ? "Lối phụ" : "Mục tiêu"}</span><b>{sessionProgress ? `${sessionProgress.current}/${sessionProgress.total}` : node.index ? `${node.index}/${nodes.length}` : "✦"}</b></div>
      </header>
      {previewMode && <div className="review-play-banner" role="status">Preview local · thao tác thật, không ghi progress, mastery hoặc reward.</div>}
      <div className="level-body">
        <div className="play-nubi-signal" data-nubi-surface="floating" data-nubi-mood={nubiMood} data-nubi-signal={nubiSignalView.dataState} role="status" aria-live="polite">
          <span className="play-nubi-stage" aria-hidden="true">
            <span className="play-nubi-ground" />
            <NubiFigure className="play-nubi-figure" stage={nubiStage} mood={nubiMood} signalState={nubiSignal} energyTypes={node.energyTypes} alt="" />
          </span>
          <span className="play-nubi-copy"><b>Nubi</b><small>{nubiFeedbackCopy[nubiMood] ?? nubiFeedbackCopy.idle}</small></span>
          <span className="play-nubi-tether" aria-hidden="true" />
        </div>
        <div className="goal-banner"><span aria-hidden="true">{node.icon}</span><strong>{node.prompt}</strong>{interactionSpec && <small className={`goal-gesture gesture-${interactionSpec.primaryGesture}`} aria-label={`Cách thao tác: ${interactionSpec.gestureLabel}`}><i aria-hidden="true">{interactionSpec.primaryGesture === "drag" ? "↔" : "✦"}</i>{interactionSpec.gestureLabel}</small>}<button className="goal-audio-button" type="button" onClick={narrateObjective} aria-label="Nghe lại mục tiêu"><span aria-hidden="true">◖))</span><b>Nghe</b></button></div>
        <div className={`game-board board-${node.type}`} data-animation-cue={interactionRuntime.animationCue ?? "default"}>
          <BoardRouter node={node} onAction={onAction} onFail={onFail} onFinish={() => finish(1)} guided={guided} initialPhaseIndex={initialPhaseIndex} onPhaseComplete={onPhaseComplete} />
        </div>
      </div>
      <OracleSupportDock oracleView={oracleView} hintLevel={hintLevel} notice={notice} noticeTone={noticeTone} onAskSupport={askSupport} guided={guided} />
    </section>
  );
}

function OracleSupportDock({ oracleView, hintLevel, notice, noticeTone = "calm", onAskSupport, guided = false, allowGuided = true }) {
  const view = oracleView ?? getOraclePresence(createOraclePresenceState());
  const oracleState = view.dataState ?? view.state ?? "dormant";
  const exhausted = !allowGuided && hintLevel >= 3;
  const buttonLabel = guided
    ? "Mạch đang dẫn bước cuối"
    : hintLevel < 3
      ? "Nhờ Mạch gợi ý"
      : allowGuided
        ? "Dẫn con bước cuối"
        : "Mạch đã soi đủ";

  return (
    <aside className={`oracle-dock ${noticeTone}`} data-oracle-state={oracleState} data-oracle-intensity={view.intensity ?? 0} aria-live="polite">
      <div className="oracle-manifestation" aria-hidden="true">
        <span className="oracle-fragments"><i /><i /><i /><i /><i /></span>
        <span className="oracle-teaching-beam" />
        <img src="/assets/mach-oracle-v2.png" alt="" />
      </div>
      <div><span>MẠCH · GỢI Ý {hintLevel}/3</span><p>{notice}</p></div>
      <button className="oracle-button" type="button" onClick={onAskSupport} disabled={guided || exhausted}>{buttonLabel}</button>
    </aside>
  );
}

function BoardRouter({ node, onAction, onFail, onFinish, guided, initialPhaseIndex = 0, onPhaseComplete }) {
  const props = { onAction, onFail, onFinish, guided };
  if (node.type === "restore") return <EnvironmentRestorationBoard node={node} {...props} />;
  if (node.type === "route") return <ResourceRouteBoard node={node} {...props} />;
  if (node.type === "path") return <PathBoard {...props} />;
  if (node.type === "collect") return <CollectBoard {...props} />;
  if (node.type === "match") return <MatchBoard {...props} />;
  if (node.type === "bridge") return <BridgeBoard {...props} />;
  if (node.type === "subtract") return <SubtractBoard {...props} />;
  if (node.type === "sort") return <SortBoard {...props} />;
  if (node.type === "order") return <OrderBoard {...props} />;
  if (node.type === "compare-pair") return <ComparePairBoard {...props} />;
  if (node.type === "numeral") return <NumeralRecognitionBoard {...props} />;
  if (node.type === "shape") return <ShapeBoard {...props} />;
  if (node.type === "rune") return <RuneBoard {...props} />;
  if (node.type === "scenario") return <ScenarioBoard {...props} />;
  return <MultiStageBoard mode={node.type} {...props} initialPhaseIndex={initialPhaseIndex} onPhaseComplete={onPhaseComplete} />;
}

function PathBoard({ onAction, onFail, onFinish, guided }) {
  const [selected, setSelected] = useState(null);
  const [placed, setPlaced] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [lastPlacedSlot, setLastPlacedSlot] = useState(null);
  const feedbackTimerRef = useRef(null);
  const finishTimerRef = useRef(null);
  const wisps = [0, 1];
  const nextSlot = [4, 5].find((slot) => !placed.some((item) => item.slot === slot)) ?? null;

  useEffect(() => () => {
    if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
    if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current);
  }, []);

  function showFeedback(nextFeedback, slot = null) {
    setFeedback(nextFeedback);
    if (slot !== null) setLastPlacedSlot(slot);
    if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = window.setTimeout(() => {
      setFeedback(null);
      setLastPlacedSlot(null);
      feedbackTimerRef.current = null;
    }, 680);
  }

  function placeWisp(slot, wisp = selected) {
    onAction();
    if (wisp === null) {
      showFeedback("wrong");
      onFail({ errorCode: "no-selection", message: "Hãy chọn một quầng sáng rồi đặt vào bước còn thiếu." });
      return;
    }
    if (placed.some((item) => item.slot === slot)) {
      showFeedback("wrong");
      onFail({ errorCode: "occupied-slot", message: "Bước này đã có ánh sáng. Hãy chọn một ô còn trống." });
      return;
    }
    if (placed.some((item) => item.wisp === wisp)) {
      showFeedback("wrong");
      onFail({ errorCode: "duplicate-wisp", message: "Quầng sáng này đã được đặt rồi. Hãy chọn quầng còn lại." });
      return;
    }
    const next = [...placed, { slot, wisp }];
    setPlaced(next);
    setSelected(null);
    showFeedback("correct", slot);
    if (next.length === 2) {
      if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current);
      finishTimerRef.current = window.setTimeout(() => {
        finishTimerRef.current = null;
        onFinish();
      }, 560);
    }
  }

  return (
    <div className="path-board" data-active-slot={nextSlot ?? "none"} data-path-feedback={feedback ?? (placed.length === 2 ? "complete" : "idle")}>
      <div className="path-readout" role="status" aria-live="polite"><span>Đường dẫn</span><b>{4 + placed.length}<i>/6</i></b><small>{placed.length === 2 ? "Ánh sáng đã nối tới cổng." : selected !== null ? `Đã chọn quầng ${selected + 1}. Đưa vào bước ${nextSlot - 3}.` : `Mạch đang gọi bước ${nextSlot - 3}. Kéo hoặc chạm để nối.`}</small></div>
      <div className="light-path" aria-label={`${4 + placed.length} trên 6 bước sáng`}>
        {Array.from({ length: 6 }, (_, index) => {
          const active = index < 4 || placed.some((item) => item.slot === index);
          const isActive = !active && index === nextSlot;
          const isQueued = !active && !isActive;
          return index < 4
            ? <span key={index} className="active" aria-hidden="true">◆</span>
            : <button key={index} type="button" data-drop-zone={String(index)} data-path-state={active ? "filled" : isActive ? "active" : "queued"} data-path-landed={lastPlacedSlot === index ? "true" : undefined} className={`${active ? "active" : isActive ? "active-slot" : "queued-slot"} ${lastPlacedSlot === index ? "landed-slot" : ""} ${guided && isActive ? "guided" : ""}`} disabled={active} aria-current={isActive ? "step" : undefined} onClick={() => placeWisp(index)} aria-label={`Bước sáng còn thiếu ${index - 3}`}>{active ? "◆" : isActive ? "✦" : "+"}</button>;
        })}
      </div>
      <div className="wisp-bank">
        {wisps.map((id) => <DragToken key={id} payload={id} validDropZones={Array.from({ length: 2 }, (_, index) => String(index + 4)).filter((zone) => !placed.some((item) => item.slot === Number(zone)))} selected={selected === id} disabled={placed.some((item) => item.wisp === id)} className={selected === id ? "selected" : ""} onClick={() => { onAction(); setSelected(id); }} onDrop={(zone, wisp) => placeWisp(Number(zone), wisp)} aria-label="Kéo quầng sáng vào bước đường còn thiếu"><span aria-hidden="true">✦</span></DragToken>)}
      </div>
    </div>
  );
}

function CollectBoard({ onAction, onFail, onFinish, guided }) {
  const items = [
    { id: 1, lit: true }, { id: 2, lit: false }, { id: 3, lit: true },
    { id: 4, lit: true }, { id: 5, lit: false }, { id: 6, lit: true }, { id: 7, lit: true },
  ];
  const [picked, setPicked] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [lastCollectedId, setLastCollectedId] = useState(null);
  const feedbackTimerRef = useRef(null);
  const finishTimerRef = useRef(null);
  const nextLitSeed = items.find((item) => item.lit && !picked.includes(item.id))?.id ?? null;

  useEffect(() => () => {
    if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
    if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current);
  }, []);

  function showFeedback(nextFeedback, itemId = null) {
    setFeedback(nextFeedback);
    if (itemId !== null) setLastCollectedId(itemId);
    if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = window.setTimeout(() => {
      setFeedback(null);
      setLastCollectedId(null);
      feedbackTimerRef.current = null;
    }, 680);
  }

  function choose(item) {
    if (picked.includes(item.id)) return;
    onAction();
    if (!item.lit) {
      showFeedback("wrong", item.id);
      onFail({ errorCode: "dormant-seed", message: "Hạt này còn đang ngủ. Hãy tìm hạt có ánh sáng từ bên trong." });
      return;
    }
    const next = [...picked, item.id];
    setPicked(next);
    showFeedback("correct", item.id);
    if (next.length === 5) {
      if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current);
      finishTimerRef.current = window.setTimeout(() => {
        finishTimerRef.current = null;
        onFinish();
      }, 560);
    }
  }
  return (
    <div className="collect-field" data-active-seed={nextLitSeed ?? "none"} data-collect-feedback={feedback ?? (picked.length === 5 ? "complete" : "idle")}>
      <div className="board-readout" role="status" aria-live="polite"><span>Đã gọi sáng</span><b>{picked.length}<i>/5</i></b><small>{picked.length === 5 ? "Lõi đã nhận đủ năm hạt sáng." : `Mạch đang gọi hạt ${nextLitSeed}. Kéo hạt sáng vào lõi.`}</small></div>
      <div className="seed-grid">
        {items.map((item) => (
          <DragToken key={item.id} payload={item.id} validDropZones={item.lit ? ["core"] : []} data-seed-state={picked.includes(item.id) ? "picked" : lastCollectedId === item.id ? feedback : item.lit ? "lit" : "dormant"} className={`light-seed ${item.lit ? "lit" : "dormant"} ${picked.includes(item.id) ? "picked" : ""} ${lastCollectedId === item.id ? `feedback-${feedback}` : ""} ${guided && item.lit && item.id === nextLitSeed ? "guided" : ""}`} onClick={() => choose(item)} onDrop={(zone, itemId) => zone === "core" && choose(items.find((candidate) => candidate.id === itemId) ?? item)} disabled={picked.includes(item.id)} aria-label={picked.includes(item.id) ? "Hạt sáng đã chọn" : item.lit ? "Kéo hạt sáng vào lõi" : "Hạt này đang ngủ; hãy chọn hạt khác"}>
            <span aria-hidden="true">✦</span>
          </DragToken>
        ))}
      </div>
      <div className={`collect-core ${feedback === "correct" ? "resonating" : ""} ${feedback === "wrong" ? "soft-fail" : ""}`} data-drop-zone="core" data-drop-landed={feedback === "correct" ? "true" : undefined} role="button" tabIndex={0} aria-label="Lõi ánh sáng, thả hạt sáng vào đây; nhấn Enter để gọi hạt sáng tiếp theo" onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        const next = items.find((item) => item.lit && !picked.includes(item.id));
        if (next) choose(next);
      }}><span aria-hidden="true">✦</span><b>{feedback === "correct" ? "Lõi đang cộng hưởng" : "Thả hạt sáng vào lõi"}</b><small>{feedback === "wrong" ? "Hạt này chưa thức giấc." : "Hoặc chạm trực tiếp vào hạt"}</small></div>
    </div>
  );
}

function DragToken({ payload, disabled, selected = null, validDropZones = null, className = "", onDrop, onClick, children, ...buttonProps }) {
  const dragEnabled = !Array.isArray(validDropZones) || validDropZones.length > 0;
  const ignoreClickRef = useRef(false);
  const suppressSyntheticClick = () => {
    ignoreClickRef.current = true;
    window.setTimeout(() => { ignoreClickRef.current = false; }, 0);
  };
  const { bind, dragging } = usePointerDrop({
    payload,
    disabled: disabled || !dragEnabled,
    validDropZones,
    onDrop(zoneId, draggedPayload) {
      suppressSyntheticClick();
      onDrop?.(zoneId, draggedPayload);
    },
    onCancel: suppressSyntheticClick,
  });
  const { style: dragStyle, ...pointerBind } = bind;
  const accessibleLabel = !dragEnabled && typeof buttonProps["aria-label"] === "string"
    ? buttonProps["aria-label"].replace(/^Kéo /, "Chọn ")
    : buttonProps["aria-label"];

  return (
    <button
      {...buttonProps}
      {...pointerBind}
      type="button"
      disabled={disabled}
      aria-label={accessibleLabel}
      aria-pressed={typeof selected === "boolean" ? selected : undefined}
      data-selected={typeof selected === "boolean" ? selected : undefined}
      data-drag-source={dragEnabled ? "true" : undefined}
      data-dragging={dragging ? "true" : "false"}
      className={`${className} ${dragEnabled ? "drag-token" : "click-token"} ${dragging ? "dragging" : ""}`.trim()}
      style={dragEnabled ? (dragging ? dragStyle : { touchAction: "none" }) : undefined}
      onClick={(event) => {
        if (!ignoreClickRef.current) onClick?.(event);
      }}
    >
      {children}
    </button>
  );
}

function MatchBoard({ onAction, onFail, onFinish, guided }) {
  const [number, setNumber] = useState(null);
  const [matched, setMatched] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [lastMatchedValue, setLastMatchedValue] = useState(null);
  const feedbackTimerRef = useRef(null);
  const finishTimerRef = useRef(null);
  const values = [2, 4, 6];
  const nextValue = values.find((value) => !matched.includes(value)) ?? null;

  useEffect(() => () => {
    if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
    if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current);
  }, []);

  function showFeedback(nextFeedback, matchedValue = null) {
    setFeedback(nextFeedback);
    if (matchedValue !== null) setLastMatchedValue(matchedValue);
    if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = window.setTimeout(() => {
      setFeedback(null);
      setLastMatchedValue(null);
      feedbackTimerRef.current = null;
    }, 720);
  }

  function chooseGroup(value, draggedNumber = number) {
    onAction();
    if (!draggedNumber) {
      showFeedback("wrong");
      onFail({ errorCode: "no-selection", message: "Hãy chạm một phiến số trước." });
      return;
    }
    if (draggedNumber !== value) {
      showFeedback("wrong");
      onFail({ errorCode: "quantity-mismatch", message: "Hai phía chưa có cùng số lượng. Con thử đếm lại đom đóm nhé." });
      setNumber(null);
      return;
    }
    const next = [...matched, value];
    setMatched(next);
    setNumber(null);
    showFeedback("correct", value);
    if (next.length === values.length) {
      if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current);
      finishTimerRef.current = window.setTimeout(() => {
        finishTimerRef.current = null;
        onFinish();
      }, 640);
    }
  }
  return (
    <div className="match-board" data-active-group={nextValue ?? "none"} data-match-feedback={feedback ?? (matched.length === values.length ? "complete" : "idle")}>
      <div className="match-readout" role="status" aria-live="polite">
        <span>Mạch ghép đôi</span>
        <strong>{matched.length}<i>/{values.length}</i></strong>
        <small>{matched.length === values.length ? "Ba nhóm đã nhận đúng mạch sáng." : number ? `Đã chọn số ${number}. Đưa vào nhóm ${number}.` : `Mạch đang gọi nhóm ${nextValue}. Kéo hoặc chạm để nối.`}</small>
      </div>
      <div className="number-bank">
        {values.map((value) => {
          const matchedValue = matched.includes(value);
          const isActive = !matchedValue && value === nextValue;
          return <DragToken key={value} payload={value} validDropZones={[String(value)]} disabled={matchedValue} selected={number === value} className={`match-number ${number === value ? "selected" : ""} ${isActive ? "active" : "queued"} ${guided && isActive ? "guided" : ""}`} data-match-state={matchedValue ? "matched" : isActive ? "active" : "queued"} onClick={() => { onAction(); setFeedback(null); setLastMatchedValue(null); setNumber(value); }} onDrop={(zone, dragged) => chooseGroup(Number(zone), dragged)} aria-label={`Kéo số ${value} đến nhóm đom đóm tương ứng`}>{value}</DragToken>;
        })}
      </div>
      <div className="energy-tethers" aria-hidden="true"><i /><i /><i /></div>
      <div className="group-bank">
        {[4, 6, 2].map((value) => (
          <button key={value} type="button" data-drop-zone={value} data-match-state={matched.includes(value) ? "matched" : value === nextValue ? "active" : "queued"} data-match-landed={lastMatchedValue === value ? "true" : undefined} className={`match-group ${matched.includes(value) ? "matched" : value === nextValue ? "active" : "queued"}`} disabled={matched.includes(value)} aria-current={value === nextValue ? "step" : undefined} aria-pressed={number === value} onClick={() => chooseGroup(value)} aria-label={`Nhóm ${value} đom đóm`}>
            {Array.from({ length: value }, (_, index) => <i key={index} />)}
          </button>
        ))}
      </div>
      <div className="board-progress-text" role="status" aria-live="polite">{matched.length}/3 cặp đã nối</div>
    </div>
  );
}

function BridgeBoard({ onAction, onFail, onFinish, guided }) {
  const [state, setState] = useState(createBridgeState);
  const [feedback, setFeedback] = useState(null);
  const [lastPlacedCrystalId, setLastPlacedCrystalId] = useState(null);
  const [lastPlacedStep, setLastPlacedStep] = useState(null);
  const feedbackTimerRef = useRef(null);
  const finishTimerRef = useRef(null);
  const nextCrystal = getNextBridgeCrystal(state);

  useEffect(() => () => {
    if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
    if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current);
  }, []);

  function showFeedback(nextFeedback, crystalId = null, step = null) {
    setFeedback(nextFeedback);
    if (crystalId !== null) setLastPlacedCrystalId(crystalId);
    if (step !== null) setLastPlacedStep(step);
    if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = window.setTimeout(() => {
      setFeedback(null);
      setLastPlacedCrystalId(null);
      setLastPlacedStep(null);
      feedbackTimerRef.current = null;
    }, 680);
  }

  function place(crystalId = nextCrystal) {
    onAction();
    const result = placeBridgeCrystal(state, crystalId);
    if (!result.accepted) {
      showFeedback("wrong");
      const messages = {
        "invalid-crystal": "Tinh thể này chưa thuộc mạch cầu. Hãy chọn tinh thể đang sáng.",
        "already-placed": "Tinh thể này đã nối rồi. Hãy chọn tinh thể còn lại.",
        complete: "Cầu đã thông; dòng sáng đang đi tới cổng.",
      };
      onFail({
        errorCode: result.reason === "invalid-crystal" || result.reason === "already-placed" ? result.reason : "invalid-crystal",
        message: messages[result.reason] ?? "Mạch cầu chưa nhận được tinh thể này. Con thử lại nhé.",
      });
      return;
    }
    setState(result.state);
    showFeedback("correct", crystalId, result.state.steps);
    if (result.complete) {
      if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current);
      finishTimerRef.current = window.setTimeout(() => {
        finishTimerRef.current = null;
        onFinish();
      }, 560);
    }
  }

  return (
    <div className={`bridge-board ${state.complete ? "complete" : ""}`} data-active-step={state.complete ? "none" : state.steps} data-bridge-feedback={feedback ?? (state.complete ? "complete" : "idle")} data-landed-crystal={lastPlacedCrystalId ?? "none"}>
      <div className="bridge-environment" aria-label={`Cầu có ${state.steps} trên ${state.targetSteps} nhịp sáng`}>
        <div className="bridge-bank bridge-bank-start"><span aria-hidden="true">✦</span><small>Bờ đã sáng</small><b>{state.startSteps} nhịp</b></div>
        <div className={`bridge-energy-river ${feedback === "correct" ? "handoff" : ""}`} data-bridge-handoff={feedback === "correct" ? "true" : undefined} aria-hidden="true"><i /><i /><i /></div>
        <div className="bridge-track">
          {Array.from({ length: state.targetSteps }, (_, index) => {
            const active = index < state.steps;
            const landed = lastPlacedStep === index + 1;
            const isNext = !active && index === state.steps;
            return active
              ? <span key={index} data-rung-state="filled" data-rung-landed={landed ? "true" : undefined} className={`bridge-rung active ${landed ? "landed-rung" : ""}`} aria-hidden="true">◆</span>
              : <button key={index} type="button" data-drop-zone="bridge" data-rung-state={isNext ? "active" : "queued"} className={`bridge-rung ${isNext ? "active-rung" : "queued-rung"} ${guided && isNext ? "guided" : ""}`} disabled={state.complete} aria-current={isNext ? "step" : undefined} onClick={() => place()} aria-label={`Nhịp cầu còn thiếu ${index - state.startSteps + 1}`}><span aria-hidden="true">{isNext ? "+" : "·"}</span></button>;
          })}
        </div>
        <div className="bridge-bank bridge-bank-end"><span aria-hidden="true">◈</span><small>Cổng bên kia</small><b>{state.complete ? "Đã nối" : "Đang chờ"}</b></div>
      </div>
      <div className="bridge-status" role="status" aria-live="polite"><span>Nhịp đã nối</span><strong>{state.steps}<i>/{state.targetSteps}</i></strong><small>{state.complete ? "Dòng sáng đã chạm tới cổng." : feedback === "correct" ? `Tinh thể vừa nối nhịp ${state.steps}; ánh sáng đang truyền tới cổng.` : `Còn ${state.targetSteps - state.steps} tinh thể để nối cầu.`}</small></div>
      <div className="crystal-bank" aria-label="Kho tinh thể cần đặt">
        {state.crystalIds.map((id) => {
          const placed = state.placedCrystalIds.includes(id);
          return <DragToken key={id} payload={id} validDropZones={["bridge"]} disabled={placed || state.complete} data-crystal-state={placed ? "placed" : id === nextCrystal ? "active" : "queued"} data-crystal-landed={lastPlacedCrystalId === id ? "true" : undefined} className={`crystal-token ${placed ? "placed" : ""} ${id === nextCrystal ? "active-crystal" : "queued-crystal"} ${lastPlacedCrystalId === id ? "landed-crystal" : ""} ${guided && id === nextCrystal ? "guided" : ""}`} onClick={() => place(id)} onDrop={(zone, draggedId) => zone === "bridge" && place(draggedId)} aria-label={placed ? "Tinh thể đã nối vào cầu" : "Kéo tinh thể vào nhịp cầu còn thiếu"}><span aria-hidden="true">◆</span><small>{placed ? "Đã nối" : id === nextCrystal ? "Đến lượt" : "Chờ lượt"}</small></DragToken>;
        })}
      </div>
      <button className={`crystal-pedestal ${guided ? "guided" : ""}`} type="button" data-drop-zone="bridge" onClick={() => place()} disabled={state.complete} aria-label="Bệ nối cầu, chạm để đặt tinh thể tiếp theo"><span aria-hidden="true">◆</span><b>{state.complete ? "Cầu đã thông" : "Đặt tinh thể vào bệ"}</b><small>{state.complete ? "Lumora đã nhận lại dòng sáng" : "Chạm hoặc kéo vào đây"}</small></button>
    </div>
  );
}

function SubtractBoard({ onAction, onFail, onFinish, guided }) {
  const [returned, setReturned] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [lastReturnedId, setLastReturnedId] = useState(null);
  const feedbackTimerRef = useRef(null);
  const finishTimerRef = useRef(null);
  const fireflies = [0, 1, 2, 3, 4, 5];
  const nextFirefly = fireflies.find((id) => !returned.includes(id)) ?? null;

  useEffect(() => () => {
    if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
    if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current);
  }, []);

  function showFeedback(nextFeedback, returnedId = null) {
    setFeedback(nextFeedback);
    if (returnedId !== null) setLastReturnedId(returnedId);
    if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = window.setTimeout(() => {
      setFeedback(null);
      setLastReturnedId(null);
      feedbackTimerRef.current = null;
    }, 720);
  }

  function sendHome(id) {
    if (returned.includes(id) || returned.length >= 2 || id === undefined) {
      showFeedback("wrong", id);
      onFail?.({ errorCode: "already-returned", message: "Đom đóm này đã về tổ rồi. Hãy chọn một bạn còn ở ngoài." });
      return;
    }
    onAction();
    const next = [...returned, id];
    setReturned(next);
    showFeedback("correct", id);
    if (next.length === 2) {
      if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current);
      finishTimerRef.current = window.setTimeout(() => {
        finishTimerRef.current = null;
        onFinish();
      }, 560);
    }
  }

  return (
    <div className="subtract-board" data-active-firefly={nextFirefly ?? "none"} data-subtract-feedback={feedback ?? (returned.length === 2 ? "complete" : "idle")}>
      <div className="subtract-equation" aria-label={`Sáu bớt ${returned.length} còn ${6 - returned.length}`}><span>6</span><i>−</i><strong>{returned.length}</strong><i>=</i><b>{6 - returned.length}</b></div>
      <div className="firefly-garden">
        {fireflies.map((id) => (
          <DragToken
            key={id}
            payload={id}
            disabled={returned.includes(id)}
            data-firefly-state={returned.includes(id) ? "returned" : id === nextFirefly ? "active" : "queued"}
            data-firefly-landed={lastReturnedId === id ? "true" : undefined}
            className={`${returned.includes(id) ? "returned-firefly" : id === nextFirefly ? "active-firefly" : "queued-firefly"} ${lastReturnedId === id ? "landed-firefly" : ""} ${guided && returned.length < 2 && id === nextFirefly ? "guided" : ""}`}
            onClick={() => sendHome(id)}
            validDropZones={["nest"]}
            onDrop={(zone, draggedId) => zone === "nest" && sendHome(draggedId)}
            aria-label={returned.includes(id) ? "Đom đóm đã về tổ" : "Kéo đom đóm về tổ"}
          >
            <span aria-hidden="true">✦</span>
          </DragToken>
        ))}
      </div>
      <div className={`firefly-nest ${feedback === "correct" ? "resonating" : feedback === "wrong" ? "soft-fail" : ""}`} data-drop-zone="nest" data-drop-landed={feedback === "correct" ? "true" : undefined} role="button" tabIndex={0} aria-label="Tổ đom đóm, thả hai đom đóm vào đây; nhấn Enter để đưa đom đóm tiếp theo về tổ" onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        if (nextFirefly !== null) sendHome(nextFirefly);
        else showFeedback("wrong");
      }}><span aria-hidden="true">⌂</span><b>{feedback === "correct" ? "Tín hiệu đã về tổ" : returned.length === 2 ? "Đã đón đủ đom đóm" : `Đã về tổ ${returned.length}/2`}</b><small>{feedback === "wrong" ? "Bạn này đã về tổ hoặc không còn lượt." : returned.length === 2 ? "Khu vườn đã đủ ánh sáng." : `Còn ${6 - returned.length} bạn ngoài vườn`}</small></div>
    </div>
  );
}

function SortBoard({ onAction, onFail, onFinish, guided }) {
  const items = ["small", "large", "small", "large", "large", "small"];
  const [selected, setSelected] = useState(null);
  const [done, setDone] = useState([]);
  const [lastBank, setLastBank] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [lastPebbleIndex, setLastPebbleIndex] = useState(null);
  const feedbackTimerRef = useRef(null);
  const finishTimerRef = useRef(null);
  const nextIndex = items.findIndex((_, index) => !done.includes(index));
  const nextSize = nextIndex >= 0 ? items[nextIndex] : null;

  useEffect(() => () => {
    if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
    if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current);
  }, []);

  function showFeedback(nextFeedback, pebbleIndex = null) {
    setFeedback(nextFeedback);
    if (pebbleIndex !== null) setLastPebbleIndex(pebbleIndex);
    if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = window.setTimeout(() => {
      setFeedback(null);
      setLastPebbleIndex(null);
      feedbackTimerRef.current = null;
    }, 720);
  }

  function send(size, draggedIndex = selected) {
    onAction();
    if (draggedIndex === null) {
      showFeedback("wrong");
      onFail({ errorCode: "no-selection", message: "Hãy chọn một hạt trước khi chọn bờ." });
      return;
    }
    if (items[draggedIndex] !== size) {
      setLastBank(size);
      showFeedback("wrong", draggedIndex);
      onFail({ errorCode: "size-mismatch", message: "Bờ này chưa hợp với kích thước của hạt. Con nhìn lại nhé." });
      return;
    }
    const next = [...done, draggedIndex];
    setLastBank(size);
    setDone(next);
    setSelected(null);
    showFeedback("correct", draggedIndex);
    if (next.length === items.length) {
      if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current);
      finishTimerRef.current = window.setTimeout(() => {
        finishTimerRef.current = null;
        onFinish();
      }, 560);
    }
  }
  return (
    <div className="sort-board sorting-stream" data-active-pebble={nextIndex >= 0 ? nextIndex : "none"} data-active-bank={nextSize ?? "none"} data-sort-feedback={feedback ?? (done.length === items.length ? "complete" : "idle")}>
      <div className="sorting-instruction" aria-live="polite"><span aria-hidden="true">≈</span><div><b>Để dòng suối tự phân loại</b><small>Hạt nhỏ về bờ nông. Hạt lớn về bờ sâu.</small></div><strong>{done.length}<i>/6</i></strong></div>
      <div className="pebble-rack" aria-label="Khay hạt đang chờ phân loại">
        {items.map((size, index) => <DragToken key={index} payload={index} validDropZones={[size]} disabled={done.includes(index)} selected={selected === index} data-pebble-state={done.includes(index) ? "sorted" : index === nextIndex ? "active" : "queued"} data-pebble-landed={lastPebbleIndex === index ? "true" : undefined} className={`pebble ${size} ${done.includes(index) ? "sorted-pebble" : index === nextIndex ? "active-pebble" : "queued-pebble"} ${selected === index ? "selected" : ""} ${lastPebbleIndex === index ? "landed-pebble" : ""} ${guided && index === nextIndex ? "guided" : ""}`} onClick={() => { onAction(); setSelected(index); }} onDrop={(zone, draggedIndex) => send(zone, draggedIndex)} aria-label={`Kéo hạt ${size === "small" ? "nhỏ" : "lớn"} về đúng bờ`} />)}
      </div>
      <div className="river-banks">
        <button className={`sorting-bank shallow ${lastBank === "small" ? "active" : ""} ${nextSize === "small" ? "target-bank" : ""} ${feedback === "correct" && lastBank === "small" ? "landed-bank" : ""}`} type="button" data-drop-zone="small" data-bank-state={nextSize === "small" ? "active" : "queued"} data-bank-landed={feedback === "correct" && lastBank === "small" ? "true" : undefined} aria-pressed={lastBank === "small"} onClick={() => send("small")}><span aria-hidden="true">◌</span><b>Bờ nông</b><small>Hạt nhỏ</small></button>
        <div className="river-flow" aria-hidden="true">≈≈≈</div>
        <button className={`sorting-bank deep ${lastBank === "large" ? "active" : ""} ${nextSize === "large" ? "target-bank" : ""} ${feedback === "correct" && lastBank === "large" ? "landed-bank" : ""}`} type="button" data-drop-zone="large" data-bank-state={nextSize === "large" ? "active" : "queued"} data-bank-landed={feedback === "correct" && lastBank === "large" ? "true" : undefined} aria-pressed={lastBank === "large"} onClick={() => send("large")}><span className="large-mark" aria-hidden="true">●</span><b>Bờ sâu</b><small>Hạt lớn</small></button>
      </div>
      <div className="board-progress-text" role="status" aria-live="polite">{feedback === "wrong" ? "Bờ này chưa nhận hạt đó." : feedback === "correct" ? "Dòng suối vừa nhận đúng hạt." : `${done.length}/6 hạt đã về đúng bờ`}</div>
    </div>
  );
}

const ORDER_PROTOTYPE_ITEMS = Object.freeze([
  Object.freeze({ id: "first", label: "Mầm đầu tiên", icon: "·", accent: "green" }),
  Object.freeze({ id: "second", label: "Mầm thức giấc", icon: "✦", accent: "blue" }),
  Object.freeze({ id: "third", label: "Cổng mở", icon: "◈", accent: "gold" }),
]);

function OrderBoard({ onAction, onFail, onFinish, guided }) {
  const [state, setState] = useState(() => createOrderState({ itemIds: ORDER_PROTOTYPE_ITEMS.map((item) => item.id) }));
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [lastPlacedSlot, setLastPlacedSlot] = useState(null);
  const feedbackTimerRef = useRef(null);
  const finishTimerRef = useRef(null);
  const progress = getOrderProgressForBoard(state);
  const nextItemId = state.itemIds[state.nextIndex] ?? null;
  const availableSlotIds = getOrderAvailableSlotIds(state);
  const placedBySlot = new Map(state.placements.map((entry) => [entry.slotIndex, entry.itemId]));

  useEffect(() => () => {
    if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
    if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current);
  }, []);

  function showFeedback(nextFeedback, slotIndex = null) {
    setFeedback(nextFeedback);
    if (slotIndex !== null) setLastPlacedSlot(slotIndex);
    if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = window.setTimeout(() => {
      setFeedback(null);
      setLastPlacedSlot(null);
      feedbackTimerRef.current = null;
    }, 720);
  }

  function selectItem(itemId) {
    if (state.complete) return;
    onAction();
    setSelected(itemId);
    setFeedback(null);
  }

  function place(slotIndex, draggedItemId = selected) {
    if (state.complete) return;
    onAction();
    if (!draggedItemId) {
      showFeedback("wrong", slotIndex);
      onFail({ errorCode: "no-selection", message: "Hãy chọn một dấu sáng trước khi đặt vào dòng." });
      return;
    }
    const result = placeOrderItem(state, draggedItemId, slotIndex);
    setState(result.state);
    if (!result.accepted) {
      setSelected(draggedItemId);
      showFeedback("wrong", slotIndex);
      const messages = {
        "wrong-order": "Dấu sáng này chưa đến lượt trong dòng ký ức.",
        "occupied-slot": "Ô này đã có dấu sáng rồi.",
        "already-placed": "Dấu sáng này đã nằm trong dòng rồi.",
      };
      onFail({ errorCode: result.reason, message: messages[result.reason] ?? "Dòng ký ức chưa nhận dấu sáng này." });
      return;
    }
    setSelected(null);
    showFeedback("correct", slotIndex);
    if (!result.complete) return;
    if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current);
    finishTimerRef.current = window.setTimeout(() => {
      finishTimerRef.current = null;
      onFinish();
    }, 560);
  }

  return (
    <div className="order-board" data-order-feedback={feedback ?? (progress.complete ? "complete" : "idle")} data-order-next={nextItemId ?? "none"}>
      <div className="order-readout" aria-live="polite">
        <div><span>Dòng đang mở</span><strong>{progress.placed}<i>/{progress.total}</i></strong></div>
        <small>{progress.complete ? "Dòng Ký Ức đã khép." : `Đặt ${ORDER_PROTOTYPE_ITEMS.find((item) => item.id === nextItemId)?.label ?? "dấu sáng tiếp theo"}.`}</small>
      </div>
      <div className="order-sequence" aria-label="Ba ô của Dòng Ký Ức">
        {state.itemIds.map((itemId, index) => {
          const item = ORDER_PROTOTYPE_ITEMS.find((candidate) => candidate.id === itemId);
          const placedItemId = placedBySlot.get(index);
          const placedItem = ORDER_PROTOTYPE_ITEMS.find((candidate) => candidate.id === placedItemId);
          const active = !placedItem && index === state.nextIndex && !state.complete;
          const lastFeedback = lastPlacedSlot === index ? feedback : null;
          return (
            <button
              key={itemId}
              className={`order-slot ${placedItem ? "filled" : active ? "active" : "queued"} ${lastFeedback === "correct" ? "landed" : ""} ${lastFeedback === "wrong" ? "wrong" : ""}`}
              type="button"
              data-drop-zone={String(index)}
              data-order-slot={String(index)}
              data-order-state={placedItem ? "filled" : active ? "active" : "queued"}
              data-drop-landed={lastFeedback === "correct" ? "true" : undefined}
              disabled={Boolean(placedItem) || progress.complete}
              aria-current={active ? "step" : undefined}
              aria-label={placedItem ? `Ô ${index + 1}: ${placedItem.label}` : `Ô ${index + 1}: ${active ? "đang đến lượt" : "đang chờ"}`}
              onClick={() => place(index)}
            >
              <span className={`order-slot-glyph ${placedItem?.accent ?? item?.accent ?? "blue"}`} aria-hidden="true">{placedItem?.icon ?? "?"}</span>
              <small>Ô {index + 1}</small>
              <b>{placedItem?.label ?? (active ? "Đặt dấu vào đây" : "Đang chờ")}</b>
            </button>
          );
        })}
      </div>
      <div className="order-token-bank" aria-label="Các dấu sáng đang chờ sắp xếp">
        {ORDER_PROTOTYPE_ITEMS.slice().reverse().map((item) => {
          const placed = state.placements.some((entry) => entry.itemId === item.id);
          return (
            <DragToken
              key={item.id}
              payload={item.id}
              validDropZones={availableSlotIds}
              disabled={placed || progress.complete}
              selected={selected === item.id}
              data-order-option={item.id}
              data-order-state={placed ? "placed" : item.id === nextItemId ? "active" : "queued"}
              className={`order-token order-token-${item.accent} ${selected === item.id ? "selected" : ""} ${guided && item.id === nextItemId ? "guided" : ""}`}
              onClick={() => selectItem(item.id)}
              onDrop={(zone, draggedItemId) => place(Number(zone), draggedItemId)}
              aria-label={placed ? `${item.label} đã đặt` : `Kéo ${item.label} vào dòng ký ức`}
            >
              <span aria-hidden="true">{item.icon}</span>
              <small>{item.label}</small>
            </DragToken>
          );
        })}
      </div>
      <p className="order-notice" role="status" aria-live="polite">
        {feedback === "wrong" ? "Dòng chưa nhận dấu này; con thử lại theo ô đang sáng nhé." : feedback === "correct" ? "Đúng rồi. Ánh sáng đang nối sang ô kế tiếp." : `${progress.placed}/${progress.total} dấu sáng đã vào đúng trình tự.`}
      </p>
    </div>
  );
}

function getOrderProgressForBoard(state) {
  const placed = state.placements.length;
  const total = state.itemIds.length;
  return { placed, total, complete: state.complete };
}

const COMPARE_PAIR_ZONE_LABELS = Object.freeze({ larger: "Lớn hơn", smaller: "Nhỏ hơn" });

function getComparePairObjectMeta(side, size) {
  const large = size === "large";
  return {
    id: side,
    size,
    label: large ? "Hạt lớn" : "Hạt nhỏ",
    icon: large ? "●" : "•",
  };
}

function ComparePairBoard({ onAction, onFail, onFinish, guided }) {
  const [state, setState] = useState(createComparePairState);
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [lastObjectId, setLastObjectId] = useState(null);
  const feedbackTimerRef = useRef(null);
  const finishTimerRef = useRef(null);
  const progress = getComparePairProgress(state);
  const pair = getCurrentComparePair(state);
  const targetLabel = pair ? COMPARE_PAIR_ZONE_LABELS[pair.target] : "Đã so sánh đủ";
  const expectedObjectId = getExpectedComparePairObjectId(state);

  useEffect(() => () => {
    if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
    if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current);
  }, []);

  function showFeedback(nextFeedback, objectId = null) {
    setFeedback(nextFeedback);
    if (objectId !== null) setLastObjectId(objectId);
    if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = window.setTimeout(() => {
      setFeedback(null);
      setLastObjectId(null);
      feedbackTimerRef.current = null;
    }, 720);
  }

  function selectObject(objectId) {
    if (!pair || progress.complete) return;
    onAction();
    setSelected(objectId);
    setFeedback(null);
    setLastObjectId(null);
  }

  function answer(zoneId, objectId = selected) {
    if (!pair || progress.complete) return;
    onAction();
    if (!objectId) {
      showFeedback("wrong");
      onFail({ errorCode: "no-selection", message: "Hãy chọn một hạt trước rồi đặt vào ô so sánh." });
      return;
    }
    const result = answerComparePair(state, objectId, zoneId);
    setState(result.state);
    if (!result.accepted) {
      setSelected(objectId);
      showFeedback("wrong", objectId);
      onFail({ errorCode: result.reason, message: "Hạt này chưa trả lời đúng điều con đang được hỏi. Hãy quan sát kích thước rồi thử lại." });
      return;
    }
    setSelected(null);
    showFeedback("correct", objectId);
    if (!result.complete) return;
    if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current);
    finishTimerRef.current = window.setTimeout(() => {
      finishTimerRef.current = null;
      onFinish();
    }, 560);
  }

  return (
    <div className="compare-pair-board" data-compare-feedback={feedback ?? (progress.complete ? "complete" : "idle")} data-compare-target={pair?.target ?? "none"} data-compare-round={pair ? progress.completed + 1 : "complete"}>
      <div className="compare-pair-readout" aria-live="polite">
        <div><span>Cặp đang soi</span><strong>{progress.completed}<i>/{progress.total}</i></strong></div>
        <small>{pair ? `Tìm vật ${targetLabel.toLowerCase()} rồi kéo vào ô cùng tên.` : "Ba cặp đã được so sánh."}</small>
      </div>
      <div className="compare-pair-prompt">
        <span aria-hidden="true">≈</span>
        <div><b>So từng cặp một</b><small>Nhìn kích thước trước, rồi chọn quan hệ được gọi.</small></div>
        <strong>{targetLabel}</strong>
      </div>
      {pair ? (
        <>
          <div className="compare-pair-object-bank" aria-label="Hai hạt đang được so sánh">
            {["left", "right"].map((side) => {
              const object = getComparePairObjectMeta(side, pair[side]);
              const active = selected === side;
              const isExpected = expectedObjectId === side;
              const landed = lastObjectId === side ? feedback : null;
              return (
                <DragToken
                  key={side}
                  payload={side}
                  validDropZones={["larger", "smaller"]}
                  selected={active}
                  data-compare-object={side}
                  data-compare-size={object.size}
                  data-compare-state={landed ?? (active ? "selected" : isExpected && guided ? "guided" : "ready")}
                  className={`compare-pair-object ${object.size} ${active ? "selected" : ""} ${guided && isExpected ? "guided" : ""}`}
                  onClick={() => selectObject(side)}
                  onDrop={(zone, draggedObjectId) => answer(zone, draggedObjectId)}
                  aria-label={`Chọn ${object.label.toLowerCase()} để so sánh; kéo vào ô phù hợp`}
                >
                  <span aria-hidden="true">{object.icon}</span>
                  <b>{object.label}</b>
                  <small>{side === "left" ? "Bên trái" : "Bên phải"}</small>
                </DragToken>
              );
            })}
          </div>
          <div className="compare-pair-zones" aria-label="Các ô trả lời">
            {Object.entries(COMPARE_PAIR_ZONE_LABELS).map(([zoneId, label]) => (
              <button
                key={zoneId}
                className={`compare-pair-zone ${pair.target === zoneId ? "target" : "queued"} ${feedback === "wrong" ? "wrong" : ""} ${feedback === "correct" && pair.target === zoneId ? "landed" : ""} ${guided && pair.target === zoneId ? "guided" : ""}`}
                type="button"
                data-drop-zone={zoneId}
                data-compare-zone={zoneId}
                data-compare-zone-state={pair.target === zoneId ? "target" : "queued"}
                onClick={() => answer(zoneId)}
                aria-label={`Ô ${label}`}
              >
                <span aria-hidden="true">{zoneId === "larger" ? "◉" : "○"}</span>
                <b>{label}</b>
                <small>{selected ? "Chạm để đặt hạt đã chọn" : "Kéo hoặc chọn một hạt"}</small>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="compare-pair-complete" role="status" aria-live="polite"><span aria-hidden="true">✦</span><b>Ba cặp đã sáng đúng.</b><small>Mạch so sánh đang giữ lại cách con nhìn lớn hơn và nhỏ hơn.</small></div>
      )}
      <p className="compare-pair-notice" role="status" aria-live="polite">
        {feedback === "wrong" ? "Chưa khớp. Hãy nhìn lại hạt lớn và hạt nhỏ trước khi thử tiếp." : feedback === "correct" ? "Đúng rồi. Mạch đang gọi cặp tiếp theo." : `${progress.completed}/${progress.total} cặp đã soi đúng.`}
      </p>
    </div>
  );
}


function NumeralRecognitionBoard({ onAction, onFail, onFinish, guided }) {
  const [state, setState] = useState(createNumeralRecognitionState);
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [lastNumeral, setLastNumeral] = useState(null);
  const feedbackTimerRef = useRef(null);
  const finishTimerRef = useRef(null);
  const progress = getNumeralProgress(state);
  const round = getCurrentNumeralRound(state);

  useEffect(() => () => {
    if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
    if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current);
  }, []);

  function showFeedback(nextFeedback, numeral = null) {
    setFeedback(nextFeedback);
    if (numeral !== null) setLastNumeral(numeral);
    if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = window.setTimeout(() => {
      setFeedback(null);
      setLastNumeral(null);
      feedbackTimerRef.current = null;
    }, 720);
  }

  function selectNumeral(numeral) {
    if (!round || progress.complete) return;
    onAction();
    setSelected(numeral);
    setFeedback(null);
    setLastNumeral(null);
  }

  function place(zoneId, numeral = selected) {
    if (!round || progress.complete) return;
    onAction();
    if (numeral === null || numeral === undefined) {
      showFeedback("wrong");
      onFail({ errorCode: "no-selection", message: "Hãy chọn một chữ số trước rồi đặt vào Lõi gọi số." });
      return;
    }
    const result = chooseNumeral(state, Number(numeral), zoneId);
    setState(result.state);
    if (!result.accepted) {
      setSelected(Number(numeral));
      showFeedback("wrong", Number(numeral));
      onFail({ errorCode: result.reason, message: "Chữ số này chưa khớp với số hạt. Hãy đếm lại rồi thử tiếp." });
      return;
    }
    setSelected(null);
    showFeedback("correct", Number(numeral));
    if (!result.complete) return;
    if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current);
    finishTimerRef.current = window.setTimeout(() => {
      finishTimerRef.current = null;
      onFinish();
    }, 560);
  }

  return (
    <div className="numeral-recognition-board" data-numeral-feedback={feedback ?? (progress.complete ? "complete" : "idle")} data-numeral-round={round ? progress.completed + 1 : "complete"}>
      <div className="numeral-readout" aria-live="polite">
        <div><span>Số đang được gọi</span><strong>{progress.completed}<i>/{progress.total}</i></strong></div>
        <small>{round ? "Đếm nhóm hạt rồi kéo chữ số phù hợp vào Lõi." : "Ba số đã được gọi đúng."}</small>
      </div>
      <div className="numeral-prompt">
        <span aria-hidden="true">?</span>
        <div><b>Gọi tên số</b><small>Đếm từng hạt, rồi tìm chữ số có cùng số lượng.</small></div>
        <strong>{round ? "Đếm hạt" : "Đã sáng"}</strong>
      </div>
      {round ? (
        <>
          <div className="numeral-quantity-card" aria-label={`Nhóm này có ${round.quantity} hạt sáng`}>
            <div className="numeral-quantity-display" aria-hidden="true">
              {Array.from({ length: round.quantity }, (_, index) => <span key={index}>✦</span>)}
            </div>
            <div><b>Nhóm hạt sáng</b><small>Con thấy bao nhiêu hạt?</small></div>
          </div>
          <div className="numeral-bank" aria-label="Các chữ số để chọn">
            {round.options.map((value) => {
              const active = selected === value;
              const landed = lastNumeral === value ? feedback : null;
              const expected = value === round.target;
              return (
                <DragToken
                  key={value}
                  payload={value}
                  validDropZones={["core"]}
                  selected={active}
                  data-numeral-value={value}
                  data-numeral-state={landed ?? (active ? "selected" : expected && guided ? "guided" : "ready")}
                  className={`numeral-token ${active ? "selected" : ""} ${guided && expected ? "guided" : ""}`}
                  onClick={() => selectNumeral(value)}
                  onDrop={(zone, draggedValue) => place(zone, Number(draggedValue))}
                  aria-label={`Chọn chữ số ${value}; kéo vào Lõi gọi số`}
                >
                  <span aria-hidden="true">{value}</span>
                </DragToken>
              );
            })}
          </div>
          <button className={`numeral-core ${selected !== null ? "ready" : ""} ${feedback === "wrong" ? "wrong" : ""} ${feedback === "correct" ? "landed" : ""} ${guided ? "guided" : ""}`} type="button" data-drop-zone="core" data-numeral-zone="core" onClick={() => place("core")} aria-label={selected === null ? "Lõi gọi số; chọn một chữ số trước" : "Đặt chữ số đã chọn vào Lõi gọi số"}>
            <span aria-hidden="true">✦</span><b>{selected === null ? "Lõi gọi số" : `Đặt số ${selected} vào đây`}</b><small>{feedback === "wrong" ? "Hãy đếm lại nhóm hạt." : "Kéo hoặc chạm chữ số để trả lời."}</small>
          </button>
        </>
      ) : (
        <div className="numeral-complete" role="status" aria-live="polite"><span aria-hidden="true">✦</span><b>Ba chữ số đã được gọi đúng.</b><small>Mạch đầu tiên đã giúp con nhận ra số qua lượng hạt.</small></div>
      )}
      <p className="numeral-notice" role="status" aria-live="polite">
        {feedback === "wrong" ? "Chưa khớp. Hãy đếm lại rồi thử một chữ số khác." : feedback === "correct" ? "Đúng rồi. Mạch đang gọi nhóm hạt tiếp theo." : `${progress.completed}/${progress.total} số đã được gọi đúng.`}
      </p>
    </div>
  );
}


const shapes = ["circle", "triangle", "square"];
const shapeLabels = { circle: "hình tròn", triangle: "hình tam giác", square: "hình vuông" };
const runeLabels = { sun: "mặt trời", leaf: "chiếc lá", crystal: "tinh thể" };

function EnvironmentRestorationBoard({ node, onAction, onFail, onFinish, guided }) {
  const scenario = environmentRestorationScenarios.find((candidate) => candidate.id === node?.restorationScenarioId || candidate.questId === node?.id) ?? null;
  const [state, setState] = useState(() => scenario
    ? createEnvironmentRestorationState(scenario, { activityId: `quest:${node.id}`, mode: node.kind === "secret" ? "secret" : "side" })
    : null);
  const [selected, setSelected] = useState(null);
  const [lastVariable, setLastVariable] = useState(null);
  const landingTimerRef = useRef(null);

  useEffect(() => () => {
    if (landingTimerRef.current !== null) window.clearTimeout(landingTimerRef.current);
  }, []);

  if (!scenario || !state) {
    return <div className="resource-route-empty" role="status">Mạch hồi sinh chưa sẵn sàng.</div>;
  }

  const progress = getEnvironmentRestorationProgress(state, scenario);
  const selectedAction = scenario.actions.find((action) => action.id === selected) ?? null;
  const targetIds = selectedAction ? getEnvironmentRestorationTargetIds(scenario, selectedAction.id, state) : [];
  const firstAvailableAction = scenario.actions.find((action) => getEnvironmentRestorationTargetIds(scenario, action.id, state).length > 0)?.id;

  function showLanding(variableId) {
    setLastVariable(variableId);
    if (landingTimerRef.current !== null) window.clearTimeout(landingTimerRef.current);
    landingTimerRef.current = window.setTimeout(() => {
      landingTimerRef.current = null;
      setLastVariable(null);
    }, 620);
  }

  function adjustVariable(variableId, draggedActionId = selected) {
    onAction();
    if (!draggedActionId) {
      onFail({ errorCode: "no-selection", message: "Hãy chọn một dụng cụ môi trường rồi đưa vào nguồn cần điều chỉnh." });
      return;
    }
    const validTargets = getEnvironmentRestorationTargetIds(scenario, draggedActionId, state);
    if (!validTargets.includes(variableId)) {
      setSelected(null);
      onFail({ errorCode: "restoration-invalid", message: "Dụng cụ này chưa điều chỉnh nguồn đang chọn. Hãy nhìn lại biểu tượng." });
      return;
    }
    const result = applyRestorationAction(state, scenario, draggedActionId, { completedAt: new Date().toISOString() });
    setState(result.state);
    setSelected(null);
    if (result.accepted) showLanding(variableId);
    if (!result.accepted) {
      const errorCode = result.reason === "max-actions" ? "action-limit" : result.reason === "max-uses" ? "action-limit" : "restoration-invalid";
      const message = result.reason === "max-actions"
        ? "Vạt cỏ đã dùng hết số lần điều chỉnh. Hãy bắt đầu lại và đọc mục tiêu trước khi kéo."
        : result.reason === "max-uses"
          ? "Dụng cụ này đã dùng hết lượt. Hãy chọn dụng cụ đối nghịch còn sáng."
          : "Dụng cụ môi trường chưa được nhận. Hãy thử lại nhé.";
      onFail({ errorCode, message });
      return;
    }
    if (result.reason === "drift") {
      onFail({ errorCode: "restoration-drift", message: "Chỉ số vừa lệch xa mục tiêu hơn một chút. Hãy dùng dụng cụ theo hướng ngược lại." });
      return;
    }
    if (result.complete) onFinish();
  }

  return (
    <div className={`environment-restoration-board ${progress.complete ? "complete" : ""}`}>
      <div className="restoration-header">
        <div className="restoration-core" aria-hidden="true"><span>✣</span><i /><i /><i /></div>
        <div><b>{scenario.title}</b><small>{scenario.objectiveVi}</small></div>
        <strong>{progress.overallHealth}<i>%</i></strong>
      </div>
      <div className="restoration-ecosystem">
        <div className="restoration-grove" aria-label={`Vạt cỏ đang ở mức hồi sinh ${progress.overallHealth} phần trăm`}>
          <i className="restoration-firefly" aria-hidden="true" /><i className="restoration-firefly" aria-hidden="true" /><i className="restoration-firefly" aria-hidden="true" /><i className="restoration-firefly" aria-hidden="true" />
          <div className="restoration-grove-copy">
            <span className="restoration-grove-symbol" aria-hidden="true">{progress.complete ? "✣" : progress.overallHealth >= 67 ? "✦" : "◌"}</span>
            <b>{progress.complete ? "Vạt cỏ đã hồi sinh" : "Vạt cỏ đang chờ cân bằng"}</b>
            <small>{progress.complete ? "Đàn đom đóm đã tìm được đường về bên Nubi." : "Đưa mỗi thanh về đúng dấu vàng để gọi ánh sáng trở lại."}</small>
          </div>
        </div>
        <div className="restoration-variable-grid" aria-label="Các nguồn môi trường cần đưa về mục tiêu">
          {scenario.variables.map((variable) => {
            const value = progress.values[variable.id] ?? variable.initial;
            const target = progress.target[variable.id] ?? variable.target;
            const span = variable.max - variable.min || 1;
            const percent = Math.max(0, Math.min(100, ((value - variable.min) / span) * 100));
            const targetPercent = Math.max(0, Math.min(100, ((target - variable.min) / span) * 100));
            const health = progress.health[variable.id] ?? 0;
            const healthLabel = health >= 100 ? "good" : health <= 0 ? "low" : "mid";
            const ready = targetIds.includes(variable.id);
            return (
              <button key={variable.id} className={`restoration-variable ${ready ? "ready" : ""} ${lastVariable === variable.id ? "landed" : ""}`} type="button" data-drop-zone={variable.id} data-drop-landed={lastVariable === variable.id ? "true" : undefined} data-health={healthLabel} onClick={() => adjustVariable(variable.id)} disabled={progress.complete} aria-label={`${variable.label}: ${value} trên ${variable.max}, mục tiêu ${target}. ${ready ? "Có thể thả dụng cụ đang chọn vào đây" : "Nguồn môi trường"}`}>
                <span className="restoration-variable-heading"><span><b aria-hidden="true">{variable.icon}</b>{variable.label}</span><strong>{value}<i>/{variable.max}</i></strong></span>
                <span className="restoration-variable-bar" aria-hidden="true"><span style={{ width: `${percent}%` }} /><i style={{ left: `${targetPercent}%` }} /></span>
                <small>{ready ? "Tuyến sáng đã sẵn sàng · thả vào đây" : `Mục tiêu ${target} · độ cân bằng ${health}%`}</small>
              </button>
            );
          })}
        </div>
      </div>
      <div className="restoration-tool-rack" aria-label="Khay dụng cụ điều chỉnh môi trường">
        <div className="restoration-tool-label"><span aria-hidden="true">⌁</span><b>Dụng cụ môi trường</b><small>{progress.complete ? "Đã cân bằng" : "Chạm để chọn hoặc kéo vào thanh mục tiêu"}</small></div>
        <div className="restoration-tools">
          {scenario.actions.map((action) => {
            const used = state.usedActions[action.id] ?? 0;
            const available = getEnvironmentRestorationTargetIds(scenario, action.id, state).length > 0;
            const variable = scenario.variables.find((candidate) => candidate.id === action.variableId);
            return (
              <DragToken key={action.id} payload={action.id} validDropZones={getEnvironmentRestorationTargetIds(scenario, action.id, state)} disabled={!available || progress.complete} selected={selected === action.id} className={`restoration-tool ${variable?.id ?? ""} ${selected === action.id ? "selected" : ""} ${guided && action.id === firstAvailableAction ? "guided" : ""}`} onClick={() => { onAction(); setSelected(action.id); }} onDrop={(zone, draggedActionId) => adjustVariable(zone, draggedActionId)} aria-label={`${action.label}: điều chỉnh ${variable?.label ?? "nguồn"}; đã dùng ${used} trên ${action.maxUses}`}><span aria-hidden="true">{action.icon}</span><small>{action.label}</small></DragToken>
            );
          })}
        </div>
      </div>
      <div className="restoration-status" role="status" aria-live="polite"><span>{progress.complete ? "Mạch sống đã trở lại; vạt cỏ đang gọi đàn đom đóm." : selectedAction ? `Đã chọn ${selectedAction.label}. Hãy đưa vào ${scenario.variables.find((variable) => variable.id === selectedAction.variableId)?.label ?? "thanh phù hợp"}.` : "Mỗi dụng cụ chỉ điều chỉnh một nguồn; hãy đọc dấu vàng trên thanh."}</span><strong>{state.actions}<i>/{scenario.constraints.maxActions}</i></strong></div>
      <span className="sr-only" role="status" aria-live="polite">{selectedAction ? `Đã chọn ${selectedAction.label}. Vùng nhận hợp lệ là ${scenario.variables.find((variable) => variable.id === selectedAction.variableId)?.label ?? "nguồn tương ứng"}.` : "Chọn một dụng cụ rồi kéo vào Nước hoặc Ánh sáng."}</span>
    </div>
  );
}

function ResourceRouteBoard({ node, onAction, onFail, onFinish, guided }) {
  const scenario = resourceRouteScenarios.find((candidate) => candidate.id === node?.routeScenarioId || candidate.questId === node?.id) ?? null;
  const [state, setState] = useState(() => scenario
    ? createResourceRouteState(scenario, { activityId: `quest:${node.id}`, mode: node.kind === "secret" ? "secret" : "side" })
    : null);
  const [selected, setSelected] = useState(null);
  const [lastTarget, setLastTarget] = useState(null);
  const landingTimerRef = useRef(null);

  useEffect(() => () => {
    if (landingTimerRef.current !== null) window.clearTimeout(landingTimerRef.current);
  }, []);

  if (!scenario || !state) {
    return <div className="resource-route-empty" role="status">Tuyến hồi sinh chưa sẵn sàng.</div>;
  }

  const progress = getResourceRouteProgress(state, scenario);
  const placedIds = new Set(Object.keys(state.placedResources));
  const resources = scenario.resources.filter((resource) => !placedIds.has(resource.id));
  const destinations = scenario.nodes.filter((routeNode) => routeNode.role === "destination");
  const selectedResource = scenario.resources.find((resource) => resource.id === selected) ?? null;
  const selectedTargetIds = selectedResource ? getResourceRouteTargetIds(scenario, selectedResource.id, state) : [];

  function routeResource(targetNodeId, draggedResourceId = selected) {
    onAction();
    if (!draggedResourceId) {
      onFail({ errorCode: "no-selection", message: "Hãy chọn một hạt rồi đưa hạt vào tuyến sáng." });
      return;
    }
    const result = placeResource(state, scenario, draggedResourceId, targetNodeId);
    setState(result.state);
    setSelected(null);
    setLastTarget(result.accepted ? targetNodeId : null);
    if (landingTimerRef.current !== null) window.clearTimeout(landingTimerRef.current);
    if (result.accepted) {
      landingTimerRef.current = window.setTimeout(() => {
        landingTimerRef.current = null;
        setLastTarget(null);
      }, 620);
    }
    if (!result.accepted) {
      const errorCode = result.reason === "full" || result.reason === "capacity" ? "capacity" : result.reason === "invalid-connection" ? "invalid-connection" : "wrong-route";
      const message = result.reason === "full" || result.reason === "capacity"
        ? "Bờ này đã đủ hạt. Hãy tìm bờ còn chỗ sáng."
        : result.reason === "invalid-connection"
          ? "Tuyến này chưa nối với bến hạt."
          : "Hạt này chưa hợp với bờ đang chọn. Hãy so sánh kích thước rồi thử lại.";
      onFail({ errorCode, message });
      return;
    }
    if (result.complete) onFinish();
  }

  return (
    <div className={`resource-route-board ${progress.complete ? "complete" : ""}`}>
      <div className="route-restoration-header">
        <div className="route-restoration-core" aria-hidden="true"><span>≈</span><i /><i /><i /></div>
        <div><b>{scenario.title}</b><small>{scenario.objectiveVi}</small></div>
        <strong>{progress.placedCount}<i>/{progress.total}</i></strong>
      </div>
      <div className="route-map" aria-label="Bản đồ tuyến dẫn hạt từ bến đến hai bờ">
        <div className="route-source-node">
          <span aria-hidden="true">✦</span>
          <b>Bến hạt</b>
          <small>{resources.length} hạt đang chờ</small>
        </div>
        <div className="route-links" data-route-active={selectedResource?.kind ?? "idle"} data-route-target={selectedTargetIds[0] ?? "none"} aria-hidden="true"><i className={`route-link-shallow ${selectedTargetIds.includes("shallow-bank") ? "active" : ""}`} /><i className={`route-link-deep ${selectedTargetIds.includes("deep-bank") ? "active" : ""}`} /></div>
        <div className="route-destination-grid">
          {destinations.map((destination) => {
            const targetIds = selected ? getResourceRouteTargetIds(scenario, selected, state) : [];
            const placedAtNode = progress.byNode[destination.id] ?? 0;
            const ready = Boolean(selected && targetIds.includes(destination.id));
            return (
              <button
                key={destination.id}
                className={`route-destination ${destination.id} ${ready ? "ready" : ""} ${lastTarget === destination.id ? "landed" : ""}`}
                type="button"
                data-drop-zone={destination.id}
                data-drop-landed={lastTarget === destination.id ? "true" : undefined}
                onClick={() => routeResource(destination.id)}
                disabled={progress.complete}
                aria-label={`${destination.label}, ${placedAtNode}/${destination.capacity} hạt`}
              >
                <span aria-hidden="true">{destination.icon}</span>
                <b>{destination.label}</b>
                <small>{placedAtNode}/{destination.capacity} hạt · {ready ? "Tuyến phù hợp" : "Bờ tiếp nhận"}</small>
              </button>
            );
          })}
        </div>
      </div>
      <div className="route-resource-rack" aria-label="Khay hạt đang chờ được dẫn qua suối">
        <div className="route-rack-label"><span aria-hidden="true">✦</span><b>Hạt đang chờ</b><small>{progress.remaining} hạt còn lại · chạm hoặc kéo</small></div>
        <div className="route-resource-items">
          {resources.map((resource) => {
            const targetIds = getResourceRouteTargetIds(scenario, resource.id, state);
            return (
              <DragToken
                key={resource.id}
                payload={resource.id}
                validDropZones={targetIds}
                selected={selected === resource.id}
                className={`route-resource ${resource.kind} ${selected === resource.id ? "selected" : ""} ${guided && resource.id === resources[0]?.id ? "guided" : ""}`}
                onClick={() => { onAction(); setSelected(resource.id); }}
                onDrop={(zone, draggedResourceId) => routeResource(zone, draggedResourceId)}
                disabled={progress.complete}
                aria-label={`Kéo ${resource.label} về bờ phù hợp`}
              ><span aria-hidden="true">{resource.icon}</span><small>{resource.label}</small></DragToken>
            );
          })}
        </div>
      </div>
      <div className="route-progress" role="status" aria-live="polite">
        <span>{progress.complete ? "Dòng suối đã sáng lại." : selectedResource ? `${selectedResource.label} đang chờ tuyến sáng phù hợp.` : "So sánh kích thước trước khi chọn bờ."}</span>
        <strong>{progress.placedCount}<i>/{progress.total}</i></strong>
      </div>
    </div>
  );
}

function ShapeBoard({ onAction, onFail, onFinish, guided }) {
  const [state, setState] = useState(createShapeWorkshopState);
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [lastPoweredShape, setLastPoweredShape] = useState(null);
  const feedbackTimerRef = useRef(null);
  const finishTimerRef = useRef(null);
  const nextShape = getNextShape(state);

  useEffect(() => () => {
    if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
    if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current);
  }, []);

  function showFeedback(nextFeedback, poweredShape = null) {
    setFeedback(nextFeedback);
    if (poweredShape) setLastPoweredShape(poweredShape);
    if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = window.setTimeout(() => {
      feedbackTimerRef.current = null;
      setFeedback(null);
      setLastPoweredShape(null);
    }, 760);
  }

  function place(targetShape, draggedShape = selected) {
    onAction();
    if (!draggedShape) {
      showFeedback("wrong");
      onFail({ errorCode: "no-selection", message: "Hãy chọn một mảnh hình rồi đưa vào khe đang trống." });
      return;
    }
    if (draggedShape !== targetShape) {
      setSelected(null);
      showFeedback("wrong");
      onFail({ errorCode: "shape-mismatch", message: "Mảnh này chưa khớp khe. Hãy nhìn đường viền của cỗ máy." });
      return;
    }
    const result = placeShape(state, draggedShape);
    if (!result.accepted) {
      onFail({
        errorCode: result.reason === "complete" ? "complete" : "occupied-slot",
        message: result.reason === "complete" ? "Cỗ máy đã sáng đủ rồi." : "Khe này đã có mảnh hình.",
      });
      return;
    }
    setState(result.state);
    setSelected(null);
    showFeedback("correct", draggedShape);
    if (result.complete) {
      if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current);
      finishTimerRef.current = window.setTimeout(() => {
        finishTimerRef.current = null;
        onFinish();
      }, 640);
    }
  }

  return (
    <div className={`shape-workshop ${state.complete ? "complete" : ""}`} data-active-shape={nextShape ?? "none"} data-shape-feedback={feedback ?? (state.complete ? "complete" : "idle")}>
      <div className={`shape-machine ${lastPoweredShape ? "is-resonating" : ""}`} data-landed-shape={lastPoweredShape ?? "none"} aria-label={`Cỗ máy có ${state.poweredModules} trên ${state.shapeIds.length} mạch đã sáng`}>
        <div className="machine-core-badge"><span aria-hidden="true">✦</span><div><b>Cỗ máy cổ</b><small>{state.complete ? "Đã thức giấc" : "Đang chờ mảnh hình"}</small></div></div>
        <div className="machine-conduit" aria-hidden="true"><i /><i /><i /></div>
        <div className="machine-slot-grid">
          {state.shapeIds.map((shape) => {
            const filled = state.placedShapeIds.includes(shape);
            const isActive = !filled && shape === nextShape;
            const slotState = filled ? "powered" : isActive ? "active" : "queued";
            return <button key={shape} type="button" data-drop-zone={shape} data-slot-state={slotState} data-drop-landed={lastPoweredShape === shape ? "true" : undefined} className={`machine-slot ${shape} ${filled ? "filled" : ""} ${slotState} ${lastPoweredShape === shape ? "powered-pulse" : ""} ${guided && isActive ? "guided" : ""}`} onClick={() => place(shape)} disabled={filled || state.complete} aria-current={isActive ? "step" : undefined} aria-label={filled ? `Khe ${shapeLabels[shape]} đã sáng` : isActive ? `Kéo mảnh vào khe ${shapeLabels[shape]}, đang đến lượt` : `Khe ${shapeLabels[shape]} đang chờ lượt`}>
              <span className="slot-spark" aria-hidden="true">{filled ? "✦" : isActive ? "✧" : "+"}</span>
              <ShapeGlyph shape={shape} />
              <small>{filled ? "Đã sửa" : isActive ? "Đến lượt" : "Chờ lượt"}</small>
            </button>;
          })}
        </div>
      </div>
      <div className="shape-workshop-readout" role="status" aria-live="polite"><span>Mạch máy đã nối</span><strong>{state.poweredModules}<i>/{state.shapeIds.length}</i></strong><div className="shape-module-dots" aria-hidden="true">{state.shapeIds.map((shape) => <span key={shape} className={state.placedShapeIds.includes(shape) ? "is-lit" : ""} />)}</div><small>{state.complete ? "Ánh sáng đang chạy qua cỗ máy." : selected ? `Đã chọn ${shapeLabels[selected]}. Đưa vào khe ${shapeLabels[nextShape]}.` : `Mạch đang gọi ${shapeLabels[nextShape]}. Kéo hoặc chạm để sửa.`}</small></div>
      <div className="shape-repair-tray" aria-label="Khay mảnh hình để sửa máy">
        <div className="repair-tray-label"><span aria-hidden="true">◇</span><b>Mảnh sửa máy</b><small>Chạm hoặc kéo</small></div>
        <div className="shape-pieces">
          {state.shapeIds.map((shape) => {
            const placed = state.placedShapeIds.includes(shape);
            return <DragToken key={shape} payload={shape} validDropZones={[shape]} selected={selected === shape} className={`shape-piece ${shape} ${selected === shape ? "selected" : ""} ${guided && shape === nextShape ? "guided" : ""}`} onClick={() => { onAction(); setSelected(shape); }} onDrop={(zone, draggedShape) => place(zone, draggedShape)} disabled={placed || state.complete} aria-label={placed ? `Mảnh ${shapeLabels[shape]} đã dùng` : `Kéo mảnh ${shapeLabels[shape]} vào khe`}><ShapeGlyph shape={shape} /></DragToken>;
          })}
        </div>
      </div>
    </div>
  );
}

function RuneBoard({ onAction, onFail, onFinish, guided }) {
  const [selected, setSelected] = useState(null);
  const [complete, setComplete] = useState(false);
  const [notice, setNotice] = useState("Nhìn nhịp lặp rồi chọn rune đang được gọi.");
  const [feedback, setFeedback] = useState(null);
  const feedbackTimerRef = useRef(null);
  const finishTimerRef = useRef(null);

  useEffect(() => () => {
    if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
    if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current);
  }, []);

  function showFeedback(nextFeedback) {
    setFeedback(nextFeedback);
    if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = window.setTimeout(() => {
      feedbackTimerRef.current = null;
      setFeedback(null);
    }, 720);
  }

  function choose(value) {
    onAction();
    if (!value) {
      setNotice("Hãy chọn một rune rồi chạm vào ô đang sáng.");
      onFail({ errorCode: "no-selection", message: "Hãy chọn một rune rồi đưa vào ô còn thiếu." });
      return;
    }
    setSelected(value);
    if (value !== "crystal") {
      setSelected(null);
      showFeedback("wrong");
      setNotice("Rune này chưa nối tiếp nhịp. Con đọc lại từ mặt trời nhé.");
      onFail({ errorCode: "wrong-pattern", message: "Rune này chưa nối tiếp nhịp. Hãy nhìn lại thứ tự từ đầu." });
      return;
    }
    setComplete(true);
    showFeedback("correct");
    setNotice("Tinh thể đã khớp. Cánh cửa rune đang mở.");
    if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current);
    finishTimerRef.current = window.setTimeout(() => {
      finishTimerRef.current = null;
      onFinish();
    }, 640);
  }
  return (
    <div className={`rune-board ${complete ? "complete" : ""}`} data-rune-feedback={feedback ?? "idle"}>
      <div className="rune-gate-header"><span className="rune-gate-core" aria-hidden="true">⌁</span><div><b>Cổng nhịp rune</b><small>{complete ? "Đã nhận đúng quy luật" : "Một nhịp đang bị khuyết"}</small></div><strong aria-hidden="true">3 / 3 / 3</strong></div>
      <div className="rune-sequence" aria-label="Mặt trời, lá, tinh thể, mặt trời, lá, còn thiếu một rune">
        {["sun", "leaf", "crystal", "sun", "leaf"].map((rune, index) => <span className={`rune-node ${rune}`} key={`${rune}-${index}`}><RuneGlyph rune={rune} /></span>)}
        <button className={`missing-rune ${guided ? "guided" : ""} ${complete ? "filled" : ""}`} type="button" data-drop-zone="missing" disabled={complete} onClick={() => choose(selected)} aria-label={complete ? "Ô rune đã được lấp đầy" : "Ô rune còn thiếu; chạm hoặc kéo rune vào đây"}>{complete ? <RuneGlyph rune="crystal" /> : "?"}</button>
      </div>
      <div className="rune-environment" aria-hidden="true"><span className="rune-environment-orbit" /><span className="rune-environment-orbit secondary" /><div><b>{complete ? "Cổng đã cộng hưởng" : "Khu rừng đang gọi nhịp"}</b><small>{complete ? "Tinh thể đang mở đường sáng." : "Đưa đúng rune vào ô sáng để đánh thức lối đi."}</small></div></div>
      <div className="rune-choice-tray">
        <div className="rune-choice-label"><span aria-hidden="true">✦</span><b>Chọn mảnh tiếp theo</b><small>Chạm hoặc kéo vào ô sáng</small></div>
        <div className="rune-choices">
          {["leaf", "sun", "crystal"].map((rune) => <DragToken key={rune} payload={rune} validDropZones={["missing"]} data-rune-option={rune} selected={selected === rune} className={`${guided && rune === "crystal" ? "guided" : ""} ${selected === rune ? "selected" : ""}`} onClick={() => { onAction(); setSelected(rune); setNotice(`Đã chọn rune ${runeLabels[rune]}. Chạm vào ô đang sáng.`); }} onDrop={(zone, draggedRune) => zone === "missing" && choose(draggedRune)} disabled={complete} aria-label={`Chọn rune ${runeLabels[rune]} để đưa vào ô còn thiếu`}><RuneGlyph rune={rune} /></DragToken>)}
        </div>
      </div>
      <p className="rune-status" role="status" aria-live="polite">{notice}</p>
    </div>
  );
}

function ScenarioBoard({ onAction, onFail, onFinish, guided }) {
  const [state, setState] = useState(createScenarioState);
  const [selected, setSelected] = useState(null);
  const [lastServedFriend, setLastServedFriend] = useState(null);
  const [lastServedStationId, setLastServedStationId] = useState(null);
  const scenarioPulseTimerRef = useRef(null);
  const stations = [
    { id: "miu-0", friend: "miu", index: 0, label: "Míu", icon: "✦" },
    { id: "miu-1", friend: "miu", index: 1, label: "Míu", icon: "✦" },
    { id: "ti-0", friend: "ti", index: 0, label: "Tí", icon: "◈" },
    { id: "ti-1", friend: "ti", index: 1, label: "Tí", icon: "◈" },
    { id: "ti-2", friend: "ti", index: 2, label: "Tí", icon: "◈" },
  ];
  const totalServed = Object.values(state.servedByFriend).reduce((total, portions) => total + portions.length, 0);
  const servedPortionIds = new Set(Object.values(state.servedByFriend).flat());
  const friendTargets = { miu: 2, ti: 3 };
  const remainingByFriend = {
    miu: Math.max(0, friendTargets.miu - state.servedByFriend.miu.length),
    ti: Math.max(0, friendTargets.ti - state.servedByFriend.ti.length),
  };
  const activeFriend = state.complete ? null : remainingByFriend.miu > 0 ? "miu" : remainingByFriend.ti > 0 ? "ti" : null;
  const activeStationId = activeFriend
    ? stations.find((station) => station.friend === activeFriend && state.servedByFriend[station.friend].length <= station.index)?.id ?? null
    : null;
  const activeLabel = activeFriend === "miu" ? "Míu" : activeFriend === "ti" ? "Tí" : null;
  const scenarioNotice = state.complete
    ? "Tất cả bạn đã đủ phần. Bếp dã ngoại đã sẵn sàng."
    : lastServedFriend
      ? `${lastServedFriend === "miu" ? "Míu" : "Tí"} vừa nhận một phần quả sáng. ${activeLabel} đang chờ ${remainingByFriend[activeFriend]} phần nữa.`
      : `${activeLabel} đang gọi con. Hãy kéo một phần quả sáng đến bạn ấy.`;

  useEffect(() => () => {
    if (scenarioPulseTimerRef.current !== null) window.clearTimeout(scenarioPulseTimerRef.current);
  }, []);

  function give(friend, draggedPortion = selected) {
    onAction();
    if (draggedPortion === null) {
      onFail({ errorCode: "no-selection", message: "Hãy chọn một phần quả sáng rồi đưa đến một bạn." });
      return;
    }
    const result = serveScenarioPortion(state, friend, draggedPortion);
    if (!result.accepted) {
      onFail({
        errorCode: result.reason === "full" ? "full-friend" : "wrong-portion",
        message: result.reason === "full" ? "Bạn này đã đủ phần. Hãy đưa phần còn lại cho bạn kia." : "Phần quả này chưa được đặt đúng chỗ. Con thử lại nhé.",
      });
      return;
    }
    const targetStation = stations.find((station) => station.friend === friend && state.servedByFriend[friend].length === station.index);
    setState(result.state);
    setSelected(null);
    setLastServedFriend(friend);
    setLastServedStationId(targetStation?.id ?? null);
    if (scenarioPulseTimerRef.current !== null) window.clearTimeout(scenarioPulseTimerRef.current);
    scenarioPulseTimerRef.current = window.setTimeout(() => {
      setLastServedFriend(null);
      setLastServedStationId(null);
      scenarioPulseTimerRef.current = null;
    }, 900);
    if (result.complete) onFinish();
  }

  return (
    <div className={`scenario-simulation ${state.complete ? "complete" : ""}`} data-active-friend={activeFriend ?? "none"} data-progress={`${totalServed}/${state.portionIds.length}`}>
      <div className="campfire-scene" aria-label={`Bếp dã ngoại đã chuẩn bị ${totalServed} trên ${state.portionIds.length} phần`}>
        <div className="campfire-core" aria-hidden="true"><span>✦</span><i /><i /><i /></div>
        <div className="campfire-copy"><b>{state.complete ? "Bữa ăn đã sẵn sàng" : "Bếp dã ngoại"}</b><small>{totalServed}/{state.portionIds.length} phần đã trao</small><div className="scenario-progress-dots" aria-hidden="true">{state.portionIds.map((id) => <span key={id} className={servedPortionIds.has(id) ? "is-lit" : ""} />)}</div></div>
      </div>
      <p className="scenario-callout" role="status" aria-live="polite"><span aria-hidden="true">✦</span>{scenarioNotice}</p>
      <div className="creature-stations" aria-label="Các bạn nhỏ đang chờ phần ăn">
        {stations.map((station) => {
          const servedCount = state.servedByFriend[station.friend].length;
          const filled = servedCount > station.index;
          const nextPortion = getNextScenarioPortion(state, station.friend);
          const isActive = activeStationId === station.id && !filled;
          const stationState = filled ? "served" : isActive ? "active" : "queued";
          return <button key={station.id} type="button" data-drop-zone={station.friend} data-station-state={stationState} className={`creature-station ${station.friend} ${stationState} ${lastServedStationId === station.id ? "served-pulse" : ""} ${guided && isActive ? "guided" : ""}`} onClick={() => give(station.friend)} disabled={filled || state.complete} aria-current={isActive ? "step" : undefined} aria-label={filled ? `${station.label} đã nhận phần` : isActive ? `Đưa phần ăn cho ${station.label}, đang đến lượt` : `Đưa phần ăn cho ${station.label}`}>
            <span className="creature-icon" aria-hidden="true">{station.icon}</span><b>{station.label}</b><strong>{filled ? "Đủ phần" : isActive ? "Đến lượt" : "Sắp đến lượt"}</strong><small>{filled ? "Đã nhận quả sáng" : isActive ? "Chạm hoặc kéo vào đây" : "Bạn tiếp theo"}</small>{isActive ? <span className="creature-need-signal" aria-hidden="true">✦</span> : null}
          </button>;
        })}
      </div>
      <div className="portion-rack" aria-label="Khay năm phần quả sáng">
        <div className="portion-rack-label"><span aria-hidden="true">●</span><b>Phần quả sáng</b><small>{state.portionIds.length - totalServed} phần còn lại</small></div>
        <div className="portion-items">
          {state.portionIds.map((id) => {
            const used = servedPortionIds.has(id);
            return <DragToken key={id} payload={id} validDropZones={["miu", "ti"].filter((friend) => getNextScenarioPortion(state, friend) !== null)} selected={selected === id} disabled={used || state.complete} className={`portion-token ${selected === id ? "selected" : ""}`} onClick={() => { onAction(); setSelected(id); }} onDrop={(zone, portion) => give(zone, portion)} aria-label={used ? "Phần quả đã trao" : "Kéo một phần quả sáng đến bạn"}><span aria-hidden="true">●</span></DragToken>;
          })}
        </div>
      </div>
    </div>
  );
}

const multiStageMeta = Object.freeze({
  mixed: Object.freeze({
    kicker: "TRẠM GIAO CẢM",
    title: "Ba mạch cùng thở",
    copy: "Đếm → nối → ghép hình",
    symbol: "✧",
    ariaLabel: "Trạm Giao Cảm kết nối ba kỹ năng đã học",
  }),
  challenge: Object.freeze({
    kicker: "HANG TIA SÁNG",
    title: "Ba khóa giữ ánh sáng",
    copy: "Ghép → nối → so sánh",
    symbol: "✺",
    ariaLabel: "Hang Tia Sáng gồm ba khóa kỹ năng tổng hợp",
  }),
});

function MultiStageBoard({ mode, onAction, onFail, onFinish, guided, initialPhaseIndex = 0, onPhaseComplete }) {
  const config = getMultiStageConfig(mode);
  const safeInitialPhaseIndex = config
    ? Math.min(config.length - 1, Math.max(0, Number.isFinite(initialPhaseIndex) ? Math.trunc(initialPhaseIndex) : 0))
    : 0;
  const [phaseIndex, setPhaseIndex] = useState(safeInitialPhaseIndex);
  const [bossState, setBossState] = useState(() => {
    let state = createBossRestorationState();
    if (mode === "boss" && config) {
      for (let index = 0; index < safeInitialPhaseIndex; index += 1) {
        const transition = completeBossPhase(state, config[index].id);
        if (!transition.accepted) break;
        state = transition.state;
      }
    }
    return state;
  });
  const isBoss = mode === "boss";
  const stageMeta = multiStageMeta[mode];
  const activePhase = config?.[phaseIndex];
  const [bossHandoff, setBossHandoff] = useState(null);
  const bossHandoffTimerRef = useRef(null);

  useEffect(() => () => {
    if (bossHandoffTimerRef.current !== null) window.clearTimeout(bossHandoffTimerRef.current);
  }, []);

  function finishPhase() {
    if (!activePhase || !config) return;
    if (isBoss) {
      if (bossHandoff) return;
      const transition = completeBossPhase(bossState, activePhase.id);
      if (!transition.accepted) return;
      setBossState(transition.state);
      onPhaseComplete?.(activePhase, phaseIndex);
      setBossHandoff({ nextPhaseIndex: transition.state.phaseIndex, complete: transition.complete });
      if (bossHandoffTimerRef.current !== null) window.clearTimeout(bossHandoffTimerRef.current);
      bossHandoffTimerRef.current = window.setTimeout(() => {
        bossHandoffTimerRef.current = null;
        setBossHandoff(null);
        setPhaseIndex(transition.state.phaseIndex);
        if (transition.complete) onFinish();
      }, 640);
      return;
    }
    onPhaseComplete?.(activePhase, phaseIndex);
    if (phaseIndex === config.length - 1) onFinish();
    else setPhaseIndex((value) => value + 1);
  }

  if (!config || !activePhase) {
    return <div className="multi-board"><p className="boss-note">Chặng này chưa có cấu hình phase hợp lệ.</p></div>;
  }

  return (
    <div className={`multi-board ${mode}-mode`} data-phase-handoff={bossHandoff ? "true" : "false"}>
      {stageMeta && <div className={`multi-stage-identity ${mode}-identity`} aria-label={stageMeta.ariaLabel}><span className="multi-stage-symbol" aria-hidden="true">{stageMeta.symbol}</span><div><small>{stageMeta.kicker}</small><b>{stageMeta.title}</b><em>{stageMeta.copy}</em></div><div className="multi-stage-thread" aria-hidden="true">{config.map((phase, index) => <span key={phase.id} className={index < phaseIndex ? "done" : index === phaseIndex ? "active" : ""}><i>{index + 1}</i></span>)}</div></div>}
      {mode === "boss" && <div className={`boss-core-chamber ${bossHandoff ? "is-resonating" : ""}`} aria-label={`Lõi Tri Thức đang ở mạch ${phaseIndex + 1} trên ${config.length}`}><span className="boss-core-rune" aria-hidden="true">◆</span><div><small>LÕI TRI THỨC</small><b>{bossHandoff ? "Lõi đang nhận ánh sáng" : activePhase.label}</b><em>{bossHandoff ? "Mạch vừa hoàn tất đang truyền năng lượng." : phaseIndex === config.length - 1 ? "Mạch cuối đang chờ" : "Mạch đang chờ được chữa lành"}</em></div><span className="boss-core-wave" aria-hidden="true" /></div>}
      <div className={`phase-strip ${mode === "boss" ? "boss-phase-strip" : ""}`}>{config.map((phase, index) => <span key={phase.id} className={index < phaseIndex ? "done" : index === phaseIndex ? "active" : ""}><i>{index < phaseIndex ? "✓" : index + 1}</i><b>{phase.label}</b></span>)}</div>
      {mode === "boss" && <div className="boss-phase-callout"><span aria-hidden="true">✦</span><p><b>Chữa lành bằng điều con đã học</b><small>Mỗi mạch giữ lại ánh sáng của phase trước.</small></p><strong>{phaseIndex + 1}<i>/{config.length}</i></strong></div>}
      {mode === "boss" && bossHandoff && <div className="boss-phase-handoff" role="status" aria-live="polite"><span aria-hidden="true">✦</span><p><b>{activePhase.label} đã truyền ánh sáng vào lõi.</b><small>{config[bossHandoff.nextPhaseIndex]?.label ? `Mạch tiếp theo: ${config[bossHandoff.nextPhaseIndex].label}.` : "Lõi Tri Thức đã cộng hưởng đủ."}</small></p><strong>{bossHandoff.nextPhaseIndex + 1}<i>/{config.length}</i></strong></div>}
      <div className="phase-mechanic" key={`${mode}-${activePhase.id}`}>
        <PhaseMechanic phase={activePhase} onAction={onAction} onFail={onFail} onFinish={finishPhase} guided={guided} />
      </div>
      {mode === "boss" && <p className="boss-note">Con đang chữa lành Lõi Tri Thức, không có chiến đấu hay mất lượt.</p>}
    </div>
  );
}

function PhaseMechanic({ phase, ...props }) {
  if (phase.mechanic === "collect") return <CollectBoard {...props} />;
  if (phase.mechanic === "match") return <MatchBoard {...props} />;
  if (phase.mechanic === "add") return <BridgeBoard {...props} />;
  if (phase.mechanic === "path") return <PathBoard {...props} />;
  if (phase.mechanic === "subtract") return <SubtractBoard {...props} />;
  if (phase.mechanic === "compare") return <SortBoard {...props} />;
  if (phase.mechanic === "shape") return <ShapeBoard {...props} />;
  if (phase.mechanic === "pattern") return <RuneBoard {...props} />;
  return <p className="boss-note">Mechanic {phase.mechanic} chưa được hỗ trợ.</p>;
}

function PracticeIntroView({ stage, session, onStart, onExit }) {
  const queueNodes = session.queue.map((id) => nodes.find((node) => node.id === id)).filter(Boolean);
  const challengeCount = queueNodes.length;
  const practiceEnergyTypes = [...new Set(queueNodes.flatMap((node) => Array.isArray(node.energyTypes) ? node.energyTypes : []))];
  return (
    <section className="practice-view practice-intro page-enter" aria-labelledby="practice-title">
      <div className="practice-glow" aria-hidden="true" />
      <div className="practice-copy">
        <p className="scene-kicker">Daily Adventure · Không áp lực chuỗi ngày</p>
        <h1 id="practice-title">Nubi đã chọn {challengeCount} ký ức để mình luyện lại.</h1>
        <p>{challengeCount} thử thách sẽ khép lại bằng một mạch khám phá ngắn. Thử thách đầu tiên ưu tiên kỹ năng cần củng cố nhất; xin gợi ý không làm mất phần thưởng hay tạo phán xét.</p>
        <ol className="practice-route">
          {queueNodes.map((node, index) => (
            <li key={`${node.id}-${index}`} className={index === 0 ? "focus" : ""}>
              <span>{index + 1}</span><b>{node.title}</b><small>{index === 0 ? "Ưu tiên củng cố" : node.skillNameVi}</small>
            </li>
          ))}
        </ol>
        <div className="practice-actions">
          <button className="tactile-button primary-action" type="button" onClick={onStart}>Bắt đầu luyện tập <b aria-hidden="true">➜</b></button>
          <button className="quiet-action" type="button" onClick={onExit}>Để lúc khác</button>
        </div>
      </div>
      <div className="practice-nubi-wrap">
        <span className="practice-orbit" aria-hidden="true" />
        <NubiFigure stage={stage} mood={challengeCount > 0 ? "curious" : "idle"} energyTypes={practiceEnergyTypes} alt="Nubi đang chuẩn bị ba thử thách luyện tập" />
      </div>
    </section>
  );
}

function DailyWeaveView({ challenge, stage, learnerContext, onComplete, onExit }) {
  const [state, setState] = useState(() => createDailyWeaveState(challenge));
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState("Kéo mỗi ký ức vào đúng dòng năng lượng để dệt mạch Daily.");
  const [noticeTone, setNoticeTone] = useState("calm");
  const [hintLevel, setHintLevel] = useState(0);
  const [lastErrorCode, setLastErrorCode] = useState(null);
  const [oraclePresence, setOraclePresence] = useState(createOraclePresenceState);
  const [finishing, setFinishing] = useState(false);
  const completionTimerRef = useRef(null);
  const failureCountRef = useRef(0);
  const supportPlan = oracleProvider.getSupportPlan({
    ageBand: learnerContext?.ageBand,
    bestMastery: learnerContext?.skillMetric?.bestMastery,
    completions: learnerContext?.skillMetric?.completions,
  });

  useEffect(() => {
    setOraclePresence((current) => transitionOraclePresence(current, { type: "level-open" }));
  }, [challenge?.id]);

  useEffect(() => () => {
    if (completionTimerRef.current !== null) window.clearTimeout(completionTimerRef.current);
  }, []);

  if (!challenge || !state) {
    return <section className="practice-view practice-puzzle-view page-enter" aria-labelledby="daily-puzzle-title"><div className="daily-puzzle-copy"><p className="scene-kicker">Daily Adventure</p><h1 id="daily-puzzle-title">Mạch năng lượng chưa sẵn sàng.</h1><button className="quiet-action" type="button" onClick={onExit}>Về sân chính</button></div></section>;
  }

  const progress = getDailyWeaveProgress(state, challenge);
  const tokenCount = challenge.tokens.length;
  const dailyEnergyTypes = [...new Set(challenge.tokens.map((token) => token.energyType).filter(Boolean))];
  const oracleView = getOraclePresence(oraclePresence);
  const oracleMood = finishing
    ? "resonant"
    : noticeTone === "nudge" || oracleView.state === "materializing"
        ? "soft-fail"
      : noticeTone === "hint" || oracleView.teaching
        ? "hint"
        : "idle";
  function showFailure(errorCode, message, tokenId = null) {
    const nextFailureCount = failureCountRef.current + 1;
    failureCountRef.current = nextFailureCount;
    if (tokenId) setSelected(tokenId);
    setLastErrorCode(errorCode);
    setOraclePresence((current) => transitionOraclePresence(current, { type: "soft-fail" }));
    if (nextFailureCount >= supportPlan.autoHintAfter && hintLevel === 0) {
      const hint = oracleProvider.getHint({ type: "daily-weave", level: 1, errorCode });
      setHintLevel(1);
      setOraclePresence((current) => transitionOraclePresence(current, { type: "auto-hint", hintLevel: 1 }));
      setNotice(hint.text);
      setNoticeTone("hint");
      return;
    }
    setNotice(message);
    setNoticeTone("nudge");
  }

  function askSupport() {
    if (hintLevel >= 3) return;
    const next = hintLevel + 1;
    const hint = oracleProvider.getHint({ type: "daily-weave", level: next, errorCode: lastErrorCode });
    setHintLevel(next);
    setOraclePresence((current) => transitionOraclePresence(current, { type: "hint-requested", hintLevel: next }));
    setNotice(hint.text);
    setNoticeTone("hint");
  }

  function selectToken(token) {
    setSelected(token.id);
    setLastErrorCode(null);
    setNoticeTone("calm");
    setOraclePresence((current) => transitionOraclePresence(current, { type: "player-action" }));
    setNotice(`Đã chọn ${token.label}. Hãy đưa vào dòng ${challenge.lanes.find((lane) => lane.energyType === token.energyType)?.label ?? "phù hợp"}.`);
  }

  function place(laneId, tokenId = selected) {
    if (finishing) return;
    if (!tokenId) {
      showFailure("no-selection", "Chọn một ký ức trước, rồi đưa vào dòng năng lượng phù hợp.");
      return;
    }
    const result = placeDailyWeaveToken(state, challenge, tokenId, laneId);
    setState(result.state);
    if (!result.accepted) {
      const messages = {
        "wrong-lane": "Mạch này chưa cùng loại năng lượng. Hãy nhìn biểu tượng của ký ức.",
        full: "Dòng năng lượng này đã đủ chỗ. Hãy tìm dòng còn đang mở.",
        "already-placed": "Ký ức này đã được dệt vào mạch rồi.",
        "max-actions": "Mạch đã dùng hết lượt thử; hãy bắt đầu lại và nhìn biểu tượng trước khi kéo.",
      };
      showFailure(result.reason, messages[result.reason] ?? "Mạch chưa nhận ký ức này. Con thử lại nhé.", tokenId);
      return;
    }
    setSelected(null);
    setLastErrorCode(null);
    setNoticeTone("calm");
    setOraclePresence((current) => transitionOraclePresence(current, { type: "player-action" }));
    setNotice(result.complete ? "Mạch năng lượng đã khép đủ ba nhịp." : "Một ký ức đã vào đúng dòng. Nhìn dấu sáng tiếp theo.");
    if (result.complete) {
      setFinishing(true);
      setOraclePresence((current) => transitionOraclePresence(current, { type: "level-success" }));
      completionTimerRef.current = window.setTimeout(() => {
        setOraclePresence((current) => transitionOraclePresence(current, { type: "dissolve" }));
        completionTimerRef.current = window.setTimeout(() => {
          completionTimerRef.current = null;
          onComplete({ actions: result.state.actions, mistakes: result.state.mistakes });
        }, 260);
      }, 620);
    }
  }

  return (
    <section className={`practice-view practice-puzzle-view page-enter ${finishing ? "is-finishing" : ""}`} aria-labelledby="daily-puzzle-title">
      <div className="daily-puzzle-copy">
        <p className="scene-kicker">Daily Adventure · Puzzle chuyển mạch</p>
        <h1 id="daily-puzzle-title">Dệt lại dòng năng lượng.</h1>
        <p>{tokenCount} ký ức vừa luyện mang những mạch khác nhau. Con hãy đưa từng ký ức vào đúng dòng để Nubi thấy cách các kỹ năng nối với nhau.</p>
        <div className="daily-weave-board">
          <div className="daily-weave-heading"><div><span>Mạch thử thách</span><b>{progress.placedCount}<i>/{progress.total} ký ức</i></b></div><strong>{state.actions}<i>/{challenge.maxActions}</i></strong></div>
          <div className="daily-weave-lanes" aria-label="Các dòng năng lượng nhận ký ức">
            {challenge.lanes.map((lane) => {
              const laneProgress = progress.lanes.find((candidate) => candidate.id === lane.id) ?? { count: 0, capacity: lane.capacity };
              const ready = Boolean(selected && getDailyWeaveTargetIds(challenge, selected, state).includes(lane.id));
              const placedTokens = challenge.tokens.filter((token) => state.placedTokens[token.id] === lane.id);
              return (
                <button key={lane.id} type="button" data-drop-zone={lane.id} className={`daily-weave-lane ${ready ? "ready" : ""} ${placedTokens.length > 0 ? "active" : ""}`} onClick={() => place(lane.id)} aria-label={`${lane.label}: ${laneProgress.count} trên ${lane.capacity} ký ức. ${ready ? "Có thể thả ký ức đang chọn" : "Dòng năng lượng"}`}>
                  <span className="daily-weave-lane-icon" aria-hidden="true">{lane.icon}</span>
                  <span><b>{lane.label}</b><small>{laneProgress.count}/{laneProgress.capacity} nhịp đã dệt</small></span>
                  <span className="daily-weave-lane-tokens" aria-hidden="true">{placedTokens.map((token) => <i key={token.id}>{token.icon}</i>)}</span>
                </button>
              );
            })}
          </div>
          <div className="daily-weave-token-bank" aria-label="Các ký ức đang chờ dệt">
            {challenge.tokens.map((token) => {
              const placed = Object.prototype.hasOwnProperty.call(state.placedTokens, token.id);
              const validTargets = getDailyWeaveTargetIds(challenge, token.id, state);
              return <DragToken key={token.id} payload={token.id} validDropZones={validTargets} disabled={placed || state.phase === "complete"} selected={selected === token.id} className={`daily-weave-token ${token.energyType} ${selected === token.id ? "selected" : ""}`} onClick={() => selectToken(token)} onDrop={(zone, draggedTokenId) => place(zone, draggedTokenId)} aria-label={placed ? `${token.label} đã dệt` : `Kéo ${token.label} vào dòng năng lượng phù hợp`}><span aria-hidden="true">{token.icon}</span><small>{token.label}</small></DragToken>;
            })}
          </div>
          <p className="daily-weave-notice" role="status" aria-live="polite">{notice}</p>
        </div>
        <div className="practice-actions"><button className="quiet-action" type="button" onClick={onExit}>Dừng phiên tại đây</button></div>
      </div>
      <div className="daily-puzzle-nubi"><span className="daily-puzzle-orbit" aria-hidden="true" /><span className="practice-nubi-tether" aria-hidden="true" /><NubiFigure stage={stage} mood={oracleMood} energyTypes={dailyEnergyTypes} alt="Nubi quan sát mạch năng lượng Daily Adventure" /></div>
      <OracleSupportDock oracleView={oracleView} hintLevel={hintLevel} notice={notice} noticeTone={noticeTone} onAskSupport={askSupport} allowGuided={false} />
      {finishing && <div className="daily-puzzle-complete" role="status" aria-live="polite"><span aria-hidden="true">✦</span><strong>Mạch đã khép.</strong><small>Con vừa nối {tokenCount} ký ức thành một dòng năng lượng.</small></div>}
    </section>
  );
}

function PracticeDiscoveryView({ challenge, stage, learnerContext, onComplete, onExit }) {
  const [placed, setPlaced] = useState([]);
  const [selected, setSelected] = useState(null);
  const fragmentCount = challenge?.fragments?.length ?? 0;
  const [notice, setNotice] = useState(() => `Kéo ${fragmentCount} dấu sáng vào đúng mạch để mở ký ức cuối phiên.`);
  const [noticeTone, setNoticeTone] = useState("calm");
  const [hintLevel, setHintLevel] = useState(0);
  const [lastErrorCode, setLastErrorCode] = useState(null);
  const [oraclePresence, setOraclePresence] = useState(createOraclePresenceState);
  const [finishing, setFinishing] = useState(false);
  const completionTimerRef = useRef(null);
  const failureCountRef = useRef(0);
  const supportPlan = oracleProvider.getSupportPlan({
    ageBand: learnerContext?.ageBand,
    bestMastery: learnerContext?.skillMetric?.bestMastery,
    completions: learnerContext?.skillMetric?.completions,
  });

  useEffect(() => {
    setOraclePresence((current) => transitionOraclePresence(current, { type: "level-open" }));
  }, [challenge?.id]);

  useEffect(() => () => {
    if (completionTimerRef.current !== null) window.clearTimeout(completionTimerRef.current);
  }, []);

  const oracleView = getOraclePresence(oraclePresence);
  const oracleMood = finishing
    ? "resonant"
    : noticeTone === "nudge" || oracleView.state === "materializing"
        ? "soft-fail"
      : noticeTone === "hint" || oracleView.teaching
        ? "hint"
        : "idle";
  const discoveryEnergyTypes = [...new Set((challenge?.fragments ?? []).flatMap((fragment) => {
    const sourceNode = nodes.find((node) => node.id === fragment.sourceNodeId);
    return Array.isArray(sourceNode?.energyTypes) ? sourceNode.energyTypes : [];
  }))];

  function showFailure(errorCode, message, fragmentId = null) {
    const nextFailureCount = failureCountRef.current + 1;
    failureCountRef.current = nextFailureCount;
    if (fragmentId) setSelected(fragmentId);
    setLastErrorCode(errorCode);
    setOraclePresence((current) => transitionOraclePresence(current, { type: "soft-fail" }));
    if (nextFailureCount >= supportPlan.autoHintAfter && hintLevel === 0) {
      const hint = oracleProvider.getHint({ type: "discovery", level: 1, errorCode });
      setHintLevel(1);
      setOraclePresence((current) => transitionOraclePresence(current, { type: "auto-hint", hintLevel: 1 }));
      setNotice(hint.text);
      setNoticeTone("hint");
      return;
    }
    setNotice(message);
    setNoticeTone("nudge");
  }

  function askSupport() {
    if (hintLevel >= 3) return;
    const next = hintLevel + 1;
    const hint = oracleProvider.getHint({ type: "discovery", level: next, errorCode: lastErrorCode });
    setHintLevel(next);
    setOraclePresence((current) => transitionOraclePresence(current, { type: "hint-requested", hintLevel: next }));
    setNotice(hint.text);
    setNoticeTone("hint");
  }

  function place(slotId, draggedFragmentId = selected) {
    if (finishing) return;
    if (!draggedFragmentId) {
      showFailure("no-selection", "Hãy chọn một dấu sáng trước khi đặt vào mạch.");
      return;
    }
    const result = placeDiscoveryFragment(placed, challenge, slotId, draggedFragmentId);
    if (!result.accepted) {
      showFailure(result.reason, result.reason === "wrong-slot" ? "Dấu sáng này thuộc mạch khác. Con thử bệ kế bên nhé." : "Mạch này đã có dấu sáng rồi.", draggedFragmentId);
      return;
    }
    setPlaced(result.placed);
    setSelected(null);
    setLastErrorCode(null);
    setNoticeTone("calm");
    setOraclePresence((current) => transitionOraclePresence(current, { type: "player-action" }));
    if (!result.complete) {
      setNotice("Đúng rồi. Mạch đang nhớ lại hành trình của con.");
      return;
    }
    if (finishing) return;
    setFinishing(true);
    setNotice("Mạch Ký Ức đã khép lại.");
    setOraclePresence((current) => transitionOraclePresence(current, { type: "level-success" }));
    completionTimerRef.current = window.setTimeout(() => {
      setOraclePresence((current) => transitionOraclePresence(current, { type: "dissolve" }));
      completionTimerRef.current = window.setTimeout(() => {
        completionTimerRef.current = null;
        onComplete();
      }, 260);
    }, 620);
  }

  if (!challenge) {
    return <section className="practice-view practice-discovery-view page-enter" aria-labelledby="discovery-title"><div className="discovery-copy"><p className="scene-kicker">Daily Adventure</p><h1 id="discovery-title">Mạch khám phá chưa sẵn sàng.</h1><button className="quiet-action" type="button" onClick={onExit}>Về sân chính</button></div></section>;
  }

  return (
    <section className={`practice-view practice-discovery-view page-enter ${finishing ? "is-finishing" : ""}`} aria-labelledby="discovery-title">
      <div className="discovery-constellation" aria-hidden="true"><i /><i /><i /><i /><i /></div>
      <div className="discovery-copy">
        <p className="scene-kicker">Daily Adventure · Khoảnh khắc khám phá</p>
        <h1 id="discovery-title">Khép lại mạch sáng con vừa luyện.</h1>
        <p>{fragmentCount} dấu sáng đại diện cho {fragmentCount} ký ức vừa đi qua. Con hãy đặt chúng theo đúng thứ tự hành trình; đây là một khoảnh khắc khám phá, không phải bài kiểm tra mới.</p>
        <div className="discovery-board">
          <div className="discovery-fragment-bank" aria-label="Các dấu sáng cần đặt">
            {challenge.fragments.map((fragment) => {
              const used = placed.some((entry) => entry.fragmentId === fragment.id);
              return (
                <DragToken
                  key={fragment.id}
                  payload={fragment.id}
                  validDropZones={challenge.slots.filter((slot) => !placed.some((entry) => entry.slotId === slot.id) && slot.expectedFragmentId === fragment.id).map((slot) => slot.id)}
                  selected={selected === fragment.id}
                  disabled={used || finishing}
                  className={`discovery-fragment accent-${fragment.accent} ${selected === fragment.id ? "selected" : ""}`}
                  onClick={() => { setSelected(fragment.id); setLastErrorCode(null); setNoticeTone("calm"); setOraclePresence((current) => transitionOraclePresence(current, { type: "player-action" })); setNotice("Giờ con chọn mạch muốn đặt dấu sáng này vào nhé."); }}
                  onDrop={(zone, dragged) => place(zone, dragged)}
                  aria-label={`Kéo dấu sáng ${fragment.label} vào đúng mạch`}
                >
                  <span aria-hidden="true">{fragment.icon}</span>
                  <small>{fragment.label}</small>
                </DragToken>
              );
            })}
          </div>
          <div className="discovery-route" aria-label="Ba mạch ký ức">
            {challenge.slots.map((slot) => {
              const entry = placed.find((item) => item.slotId === slot.id);
              const fragment = entry ? challenge.fragments.find((item) => item.id === entry.fragmentId) : null;
              return (
                <button
                  key={slot.id}
                  type="button"
                  data-drop-zone={slot.id}
                  disabled={Boolean(entry) || finishing}
                   className={`discovery-slot accent-${slot.accent} ${entry ? "filled" : ""} ${!entry && selected && slot.expectedFragmentId === selected ? "ready" : ""}`}
                  onClick={() => place(slot.id)}
                  aria-label={entry ? `${slot.label}: ${fragment?.label ?? "đã đặt"}` : `Mạch trống ${slot.label}`}
                >
                  <small>{slot.label}</small>
                  <span aria-hidden="true">{fragment?.icon ?? "?"}</span>
                  <b>{fragment?.label ?? "Thả dấu sáng"}</b>
                </button>
              );
            })}
          </div>
          <p className="discovery-notice" role="status" aria-live="polite">{notice}</p>
        </div>
        <div className="practice-actions"><button className="quiet-action" type="button" onClick={onExit}>Dừng phiên tại đây</button></div>
      </div>
      <div className="discovery-nubi"><span className="discovery-nubi-orbit" aria-hidden="true" /><span className="practice-nubi-tether" aria-hidden="true" /><NubiFigure stage={stage} mood={oracleMood} energyTypes={discoveryEnergyTypes} alt="Nubi giữ mạch ký ức sau phiên luyện tập" /></div>
      <OracleSupportDock oracleView={oracleView} hintLevel={hintLevel} notice={notice} noticeTone={noticeTone} onAskSupport={askSupport} allowGuided={false} />
      {finishing && <div className="discovery-complete" role="status" aria-live="polite"><span aria-hidden="true">✦</span><strong>Mạch Ký Ức đã sáng.</strong><small>Con đã khép lại Daily Adventure.</small></div>}
    </section>
  );
}

function PracticeCheckpointView({ stage, checkpoint, session, onContinue, onExit }) {
  return (
    <section className="practice-view practice-checkpoint page-enter" aria-labelledby="checkpoint-title">
      <div className="checkpoint-card">
        <span className="checkpoint-rune" aria-hidden="true">✦</span>
        <p>Đã hoàn thành {session.currentIndex}/{session.queue.length}</p>
        <h1 id="checkpoint-title">Ký ức {checkpoint.node.title} đã sáng rõ hơn.</h1>
        <div className="checkpoint-mastery"><span>Mức làm chủ lượt này</span><strong>{getMasteryLabel(checkpoint.mastery)}</strong></div>
        <button className="tactile-button primary-action full" type="button" onClick={onContinue}>Thử thách tiếp theo <b aria-hidden="true">➜</b></button>
        <button className="quiet-action" type="button" onClick={onExit}>Dừng phiên tại đây</button>
      </div>
      <NubiFigure className="checkpoint-nubi" stage={stage} alt="Nubi tỏa sáng sau một thử thách luyện tập" />
    </section>
  );
}

function PracticeSummaryView({ stage, summary, onHome, onParent }) {
  const minutes = Math.max(1, Math.round(summary.totalSeconds / 60));
  return (
    <section className="practice-view practice-summary page-enter" aria-labelledby="practice-summary-title">
      <div className="summary-burst" aria-hidden="true"><i /><i /><i /><i /></div>
      <NubiFigure stage={stage} alt="Nubi vui mừng khi hoàn thành Daily Adventure" />
      <div className="practice-summary-card">
        <p className="scene-kicker">Daily Adventure hoàn tất</p>
        <h1 id="practice-summary-title">Ba ký ức đã được củng cố.</h1>
        <p>Phiên luyện tập không tạo shard để tránh farm phần thưởng; tiến bộ được ghi vào hồ sơ mastery. <b className="practice-discovery-result">{summary.discoveryCompleted ? "Mạch khám phá cũng đã được khép lại." : "Mạch khám phá chưa hoàn tất."}</b></p>
        <div className="practice-summary-stats">
          <article><strong>{summary.challengesCompleted}</strong><span>Thử thách</span></article>
          <article><strong>{minutes}</strong><span>Phút tập trung</span></article>
          <article><strong>{summary.independentChallenges}</strong><span>Tự hoàn thành</span></article>
          <article><strong>{summary.averageMastery.toFixed(1)}</strong><span>Mastery trung bình</span></article>
        </div>
        <div className="practice-actions">
          <button className="tactile-button primary-action" type="button" onClick={onHome}>Về sân chính <b aria-hidden="true">➜</b></button>
          <button className="quiet-action" type="button" onClick={onParent}>Xem báo cáo phụ huynh</button>
        </div>
      </div>
    </section>
  );
}

function RestorationView({ result, stage, onContinue, onReplay }) {
  const assisted = result.guided ? "Mạch đã dẫn bước cuối" : result.supportsUsed > 0 ? "Con hoàn thành với gợi ý" : "Con tự tìm ra cách";
  const cosmetic = result.rewardCosmeticId ? cityCosmetics.find((item) => item.id === result.rewardCosmeticId) : null;
  const restorationFeature = result.optionalQuest
    ? cityRestorationFeatures.find((feature) => feature.questId === result.node?.id) ?? null
    : null;
  const restorationEnergyTypes = [...new Set([
    ...(Array.isArray(result.node?.energyTypes) ? result.node.energyTypes : []),
    ...(Array.isArray(restorationFeature?.projection?.energyTypes) ? restorationFeature.projection.energyTypes : []),
  ])];
  const energyReward = result.earnedEnergy ?? {};
  const earnedEnergy = ENERGY_TYPE_IDS
    .filter((id) => Number.isFinite(energyReward[id]) && energyReward[id] > 0)
    .map((id) => `${ENERGY_TYPES[id].labelVi} +${energyReward[id]}`)
    .join(" · ");
  const resonance = getNubiResonance({ energyTypes: result.node.energyTypes, earnedEnergy: energyReward, reward: result.firstClear, mode: result.firstClear ? "reward" : "ambient" });
  return (
    <section className="restoration-view page-enter" aria-labelledby="restore-title">
      <img className="scene-backdrop" src={result.node.scene} alt={`Ánh sáng trở lại ${result.node.title}`} />
      <div className="restoration-bloom" aria-hidden="true" />
      <div className="restore-card">
        <span className="restore-rune" aria-hidden="true">✦</span>
        <p>{result.node.chapter}</p>
        <h1 id="restore-title">{result.optionalQuest ? <>{result.node.kind === "secret" ? "Một lối rẽ bí mật" : "Một lối rẽ mới"}<br />đã bừng sáng.</> : <>Một vùng ký ức<br />đã sáng trở lại.</>}</h1>
        <div className="restore-result">
           {result.optionalQuest
             ? <span><b>{cosmetic?.icon ?? "✦"}</b><small>{cosmetic ? cosmetic.name : "Mastery được củng cố"}</small></span>
             : <span><b>+{result.earnedShards}</b><small>Mảnh Tri Thức · +{result.earnedXp ?? 0} XP</small></span>}
          {earnedEnergy && <span className="restore-energy-reward"><b>✦</b><small>{earnedEnergy}</small></span>}
           <span><b>✓</b><small>{assisted}</small></span>
         </div>
        {restorationFeature && <div className="restore-world-state" data-restoration-feature={restorationFeature.id}>
          <span aria-hidden="true">{restorationFeature.icon}</span>
          <div><small>Vùng sống hồi sinh</small><strong>{restorationFeature.title}</strong><p>{restorationFeature.description}</p></div>
        </div>}
        {result.firstClear && resonance.primaryType && <div className="restore-resonance" data-energy-type={resonance.primaryType} data-energy-intensity={resonance.intensity}>
          <b aria-hidden="true">{ENERGY_TYPES[resonance.primaryType]?.icon ?? "✦"}</b>
          <span><small>Cộng hưởng Nubi · {resonance.activeTypes.length} mạch</small><strong>{resonance.shortLabel ?? resonance.labelVi ?? "Mạch năng lượng"}</strong></span>
        </div>}
        <button className="tactile-button primary-action full" type="button" onClick={onContinue}>{result.node.id === "boss" ? "Đánh thức Nubi" : result.optionalQuest ? "Trở lại bản đồ" : "Tiếp tục phiêu lưu"} <b aria-hidden="true">➜</b></button>
        <button className="quiet-action" type="button" onClick={onReplay}>Chơi lại chặng này</button>
        {!result.firstClear && <small className="replay-note">Lần chơi lại giúp luyện kỹ năng; phần thưởng thành tựu chỉ mở một lần.</small>}
      </div>
      <NubiFigure className="restore-nubi" stage={stage} mood="resonant" energyTypes={restorationEnergyTypes} earnedEnergy={energyReward} reward={result.firstClear} alt="Nubi vui mừng khi khu rừng hồi sinh" />
    </section>
  );
}

function EvolutionView({ progress, transition, onCity, onMap }) {
  const currentStage = getNubiEvolutionStage(progress, nubiEvolutionStages) ?? nubiEvolutionStages[0];
  const fromStage = transition?.from ?? nubiEvolutionStages[0];
  const toStage = transition?.to ?? currentStage;
  return (
    <section className="evolution-view page-enter" aria-labelledby="evolution-title">
      <img className="scene-backdrop evolution-backdrop" src="/assets/awakened-forest-clean.png" alt="Rừng Thức Tỉnh tỏa sáng khi Nubi tiến hóa" />
      <div className="scene-vignette" aria-hidden="true" />
      <div className="evolution-visual" aria-label={`Nubi chuyển từ hình thái ${fromStage.name} sang ${toStage.name}`}>
        <span className="evolution-ring ring-one" aria-hidden="true" />
        <span className="evolution-ring ring-two" aria-hidden="true" />
        <span className="evolution-particles" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>
        <img className="evolution-before" src={fromStage.sprite} alt="" aria-hidden="true" />
        <NubiFigure className="evolution-nubi" stage={toStage.stage} mood="resonant" energyTypes={["mastery", "discovery"]} alt={`Nubi hình thái ${toStage.name} với ${toStage.traits.join(", ")}`} />
        <span className="evolution-stage-badge"><small>Hình thái {toStage.stage}</small><strong>{toStage.name}</strong></span>
      </div>
      <div className="evolution-copy"><p className="scene-kicker">Dấu mốc làm chủ</p><h1 id="evolution-title">Nubi đã lớn lên<br />cùng điều con học.</h1><p>{toStage.description}</p><ul>{toStage.traits.map((trait) => <li key={trait}>✦ {trait}</li>)}</ul><div><button className="tactile-button primary-action" type="button" onClick={onCity}>Mở Thành phố <b>➜</b></button><button className="quiet-action" type="button" onClick={onMap}>Về bản đồ</button></div></div>
    </section>
  );
}

function NubiFigure({ stage = 1, cosmeticId, mood = "idle", signalState, className = "", alt, energyTypes = [], earnedEnergy, reward = false }) {
  const cosmetic = cityCosmetics.find((item) => item.id === cosmeticId);
  const evolutionStage = getNubiEvolutionStage({ nubiStage: stage }, nubiEvolutionStages) ?? nubiEvolutionStages[0];
  const resonance = getNubiResonance({ energyTypes, earnedEnergy, reward, mode: reward ? "reward" : "ambient", mood });
  const fallbackSignalState = reward || mood === "resonant"
    ? { state: "resonant" }
    : mood === "soft-fail"
      ? { state: "attention" }
      : mood === "hint" || mood === "curious"
        ? { state: "responding" }
        : undefined;
  const signal = getNubiSignal(signalState ?? fallbackSignalState);
  return (
    <span className={`nubi-figure nubi-stage-${evolutionStage.stage} nubi-mood-${mood} ${className} ${cosmetic ? `wearing-${cosmetic.id}` : "wearing-none"}`} data-evolution-stage={evolutionStage.stage} data-nubi-cutout="true" data-nubi-asset={evolutionStage.sprite.split("/").pop()} data-nubi-mood={mood} data-nubi-signal={signal.dataState} data-nubi-signal-intensity={signal.intensity} data-nubi-core={signal.visibleCore ? "visible" : "ambient"} data-nubi-beam={signal.visibleBeam ? "visible" : "hidden"} data-energy-type={resonance.primaryType ?? "none"} data-energy-intensity={resonance.intensity} data-energy-resonance={resonance.key} style={{ "--nubi-sprite": `url(${evolutionStage.sprite})` }}>
      <span className="nubi-signal-beam" aria-hidden="true" />
      <span className="nubi-signal-burst" aria-hidden="true" />
      <span className="nubi-signal-corona" aria-hidden="true"><i /><i /><i /></span>
      <span className="nubi-energy-field" aria-hidden="true">
        <span className="nubi-orbit nubi-orbit-one" />
        <span className="nubi-orbit nubi-orbit-two" />
        <span className="nubi-particle-field"><i /><i /><i /><i /><i /><i /></span>
      </span>
      <span className="nubi-resonance-ribbons" aria-hidden="true"><i /><i /><i /></span>
      <span className="nubi-cosmetic nubi-cosmetic-back" aria-hidden="true" />
      <span className="nubi-stage-glow" aria-hidden="true" />
      <span className="nubi-contact-shadow" aria-hidden="true" />
      <span className="nubi-silhouette" aria-hidden="true" />
      <span className="nubi-cutout-edge" aria-hidden="true" />
      <span className="nubi-character" aria-hidden={alt ? undefined : "true"}>
        <img src={evolutionStage.sprite} alt={alt} />
      </span>
      <span className="nubi-foreground-sparks" aria-hidden="true"><i /><i /><i /><i /></span>
      <span className="nubi-core-flare" aria-hidden="true" />
      <span className="nubi-resonance-wave" aria-hidden="true" />
      <span className="nubi-cosmetic nubi-cosmetic-front" aria-hidden="true">{cosmetic?.icon ?? ""}</span>
    </span>
  );
}

function cosmeticUnlockLabel(cosmetic) {
  if (cosmetic.unlock.type === "building") {
    return `Mở cùng ${cityBuildings.find((building) => building.id === cosmetic.unlock.buildingId)?.name ?? "công trình"}`;
  }
  if (cosmetic.unlock.type === "practice-sessions") return `Hoàn tất ${cosmetic.unlock.count} Daily Adventure`;
  if (cosmetic.unlock.type === "quest") return `Hoàn tất ${optionalQuests.find((quest) => quest.id === cosmetic.unlock.questId)?.title ?? "nhiệm vụ tùy chọn"}`;
  return `Đưa Nubi đến hình thái ${cosmetic.unlock.stage}`;
}

function CityView({ progress, onMap, onLeague, onSelectBuilding, onEquipCosmetic }) {
  const unlockedBuildingIds = new Set(getUnlockedBuildingIds(progress, cityBuildings));
  const unlockedCosmeticIds = new Set(getUnlockedCosmeticIds(progress, cityBuildings, cityCosmetics));
  const cityState = normalizeCityState(progress.cityState, progress, cityBuildings, cityCosmetics);
  const fallbackBuilding = [...cityBuildings].reverse().find((building) => unlockedBuildingIds.has(building.id));
  const selectedBuilding = cityBuildings.find((building) => building.id === cityState.selectedBuildingId) ?? fallbackBuilding ?? cityBuildings[0];
  const selectedReward = cityCosmetics.find((cosmetic) => cosmetic.id === selectedBuilding.rewardCosmeticId);
  const equippedCosmetic = cityCosmetics.find((cosmetic) => cosmetic.id === cityState.equippedCosmeticId);
  const restorationProjection = buildRestorationProjection({ questState: progress.questState, features: cityRestorationFeatures });
  const restoredFeatureIds = new Set(restorationProjection.restoredFeatureIds);
  const projectedFeatures = restorationProjection.features;
  const restoredFeatures = projectedFeatures.filter((feature) => restoredFeatureIds.has(feature.id));
  const nubiCityMood = restorationProjection.restoredCount > 0 ? "curious" : "idle";
  return (
    <section className="city-view page-enter" aria-labelledby="city-title" data-restoration-count={restorationProjection.restoredCount}>
      <img className="scene-backdrop" src="/assets/knowledge-city-wide.jpg" alt="Thành phố Tri Thức nổi trên dòng năng lượng phát sáng" />
      <div className="scene-vignette" aria-hidden="true" />
      <header className="city-heading">
        <div><p className="scene-kicker">Dấu ấn hành trình</p><h1 id="city-title">Thành phố Tri Thức</h1><p>Công trình tự hồi sinh bằng mastery. Cosmetic chỉ kể lại thành tựu, không tăng khả năng trả lời đúng.</p></div>
        <div className="city-heading-actions">
          <button className="league-entry-action" type="button" onClick={onLeague}><span aria-hidden="true">✺</span> Cổng Liên Minh</button>
          <button className="quiet-action" type="button" onClick={onMap}>← Trở lại bản đồ</button>
        </div>
      </header>
      <div className="city-experience">
        <section className="city-districts" aria-labelledby="district-title">
          <div className="city-panel-heading"><div><span>Tiến độ thành phố</span><h2 id="district-title">{unlockedBuildingIds.size}/{cityBuildings.length} công trình tỏa sáng</h2></div><b>{progress.completed.length}/{nodes.length}</b></div>
          <div className="city-building-grid">
            {cityBuildings.map((building) => {
              const unlocked = unlockedBuildingIds.has(building.id);
              const selected = unlocked && selectedBuilding.id === building.id;
              return (
                <button key={building.id} type="button" className={`${unlocked ? "unlocked" : "locked"} ${selected ? "selected" : ""}`} onClick={() => onSelectBuilding(building.id)} disabled={!unlocked} aria-pressed={selected}>
                  <span aria-hidden="true">{unlocked ? building.icon : "◇"}</span>
                  <span><small>{building.district}</small><strong>{building.name}</strong><em>{unlocked ? "Đã tự xây" : building.masteryRequirement ? `Mở sau ${building.unlockAt} chặng · mastery ≥ ${building.masteryRequirement.minimum}` : `Mở sau ${building.unlockAt} chặng`}</em></span>
                </button>
              );
            })}
          </div>
          <article className="city-building-detail">
            <span className="detail-icon" aria-hidden="true">{selectedBuilding.icon}</span>
            <div><small>{selectedBuilding.district}</small><h3>{selectedBuilding.name}</h3><p>{selectedBuilding.description}</p></div>
            {selectedReward && <div className="building-reward"><span>Cosmetic mở khóa</span><b>{selectedReward.icon} {selectedReward.name}</b></div>}
          </article>
          <section className="city-restoration-landscape" aria-labelledby="restoration-landscape-title">
            <div className="city-panel-heading"><div><span>Thay đổi nhìn thấy được</span><h2 id="restoration-landscape-title">Bản đồ sống quanh thành phố</h2></div><small>{restorationProjection.restoredCount > 0 ? `${restorationProjection.restoredCount} vùng đang tỏa sáng` : "Chưa có vùng tỏa sáng"}</small></div>
            <div className="city-restoration-zones">
              {projectedFeatures.map((feature) => {
                const restored = restoredFeatureIds.has(feature.id);
                const visualCue = feature.visualCue ?? feature.projection?.visualCue ?? "quiet-grove";
                return (
                  <article key={feature.id} className={`city-restoration-zone ${restored ? "restored" : "dormant"}`} data-restoration-feature={feature.id} data-restoration-state={restored ? "restored" : "dormant"}>
                    <div className={`city-zone-art city-zone-${visualCue}`} aria-hidden="true"><span className="city-zone-glow" /><span className="city-zone-particles"><i /><i /><i /><i /></span><span className="city-zone-river" /><span className="city-zone-reeds" /></div>
                    <div className="city-zone-copy"><small>{restored ? "Đã hồi sinh" : "Đang chờ nhiệm vụ"}</small><strong>{feature.title}</strong><p>{restored ? (feature.restoredDescription ?? feature.description) : (feature.dormantDescription ?? "Hoàn thành nhiệm vụ phụ để vùng này thức dậy.")}</p></div>
                  </article>
                );
              })}
            </div>
          </section>
          <section className="city-restoration-log" aria-labelledby="restoration-log-title">
            <div className="city-panel-heading"><div><span>Nhật ký hồi sinh</span><h2 id="restoration-log-title">Những vùng sống trở lại</h2></div><small>{restoredFeatures.length}/{projectedFeatures.length} dấu ấn</small></div>
            {restoredFeatures.length > 0 ? <div className="city-restoration-grid">{restoredFeatures.map((feature) => <article key={feature.id} className="city-restoration-card"><span aria-hidden="true">{feature.icon}</span><div><strong>{feature.title}</strong><p>{feature.description}</p></div></article>)}</div> : <p className="city-restoration-empty">Hoàn thành nhiệm vụ phụ để những vùng sống đầu tiên xuất hiện quanh thành phố.</p>}
          </section>
        </section>

        <section className="city-workshop" aria-labelledby="workshop-title">
          <div className="city-nubi-stage">
            <span className="city-stage-orbit" aria-hidden="true" />
            <NubiFigure stage={progress.nubiStage} mood={nubiCityMood} energyTypes={restorationProjection.nubiEnergyTypes} cosmeticId={cityState.equippedCosmeticId} alt={`Nubi đang thử ${equippedCosmetic?.name ?? "hình thái nguyên bản"}`} />
            <div><small>Đang trang bị</small><strong>{equippedCosmetic?.name ?? "Nubi nguyên bản"}</strong></div>
          </div>
          <div className="cosmetic-cabinet">
            <div className="city-panel-heading"><div><span>Nhật ký thành tựu</span><h2 id="workshop-title">Tủ Dấu Ấn</h2></div><small>{unlockedCosmeticIds.size}/{cityCosmetics.length} đã mở</small></div>
            <div className="cosmetic-grid">
              {cityCosmetics.map((cosmetic) => {
                const unlocked = unlockedCosmeticIds.has(cosmetic.id);
                const equipped = cityState.equippedCosmeticId === cosmetic.id;
                return (
                  <button key={cosmetic.id} type="button" className={`${unlocked ? "unlocked" : "locked"} ${equipped ? "equipped" : ""}`} onClick={() => onEquipCosmetic(cosmetic.id)} disabled={!unlocked} aria-pressed={equipped} title={cosmetic.description}>
                    <span aria-hidden="true">{unlocked ? cosmetic.icon : "◇"}</span><b>{cosmetic.name}</b><small>{equipped ? "Đang dùng" : unlocked ? "Chạm để thử" : cosmeticUnlockLabel(cosmetic)}</small>
                  </button>
                );
              })}
            </div>
            <button className="unequip-action" type="button" onClick={() => onEquipCosmetic(null)} disabled={!cityState.equippedCosmeticId}>Gỡ trang bị · giữ Nubi nguyên bản</button>
          </div>
        </section>
      </div>
    </section>
  );
}

function LeagueView({ progress, profile, onCity }) {
  const league = buildLeagueSnapshot(progress, { alias: profile?.alias, validNodes: nodes });
  return (
    <section className="league-view page-enter" aria-labelledby="league-title">
      <img className="scene-backdrop" src="/assets/knowledge-city-wide.jpg" alt="Cổng Liên Minh phát sáng giữa Thành phố Tri Thức" />
      <div className="scene-vignette" aria-hidden="true" />
      <header className="league-heading">
        <div>
          <p className="scene-kicker">Bản demo local · đồng đội hư cấu</p>
          <h1 id="league-title">Liên Minh Mầm Sáng</h1>
          <p>Vị trí chỉ phản ánh các chặng duy nhất và mastery tốt nhất. Chơi lâu, chơi lại hoặc tích shard không làm tăng hạng.</p>
        </div>
        <button className="quiet-action" type="button" onClick={onCity}>← Về Thành phố</button>
      </header>

      <div className="league-layout">
        <section className="league-status" aria-labelledby="league-tier-title">
          <div className="league-tier-orb" aria-hidden="true">{league.tier.icon}</div>
          <div>
            <span>Hạng hiện tại</span>
            <h2 id="league-tier-title">{league.tier.name}</h2>
            <p><b>{league.score}</b> năng lượng mastery · hạng <b>#{league.userRank}</b> trong bảng minh họa</p>
          </div>
          <div className="league-progress" role="progressbar" aria-label="Tiến độ hạng Liên Minh" aria-valuemin="0" aria-valuemax="100" aria-valuenow={league.tierProgress}>
            <span style={{ width: `${league.tierProgress}%` }} />
          </div>
          <small>{league.nextTier ? `${league.nextTier.minScore - league.score} năng lượng nữa để đến ${league.nextTier.name}` : "Đã chạm mốc cao nhất của bản demo"}</small>
          <div className="league-rules">
            <article><b>+1</b><span>Mỗi chặng duy nhất</span></article>
            <article><b>+10</b><span>Mỗi bậc mastery tốt nhất</span></article>
            <article><b>+0</b><span>Replay · shard · thời gian online</span></article>
          </div>
        </section>

        <section className="league-board" aria-labelledby="league-board-title">
          <div className="league-board-heading">
            <div><span>Cổng giao lưu</span><h2 id="league-board-title">Đội thám hiểm minh họa</h2></div>
            <small>Không có người chơi thật</small>
          </div>
          <ol>
            {league.standings.map((row) => (
              <li key={row.id} className={row.isUser ? "is-user" : ""}>
                <b className="league-rank">#{row.rank}</b>
                <span className="league-avatar" aria-hidden="true">{row.icon}</span>
                <span className="league-name"><strong>{row.alias}</strong><small>{row.isUser ? "Hồ sơ trên thiết bị này" : "Nhân vật minh họa"}</small></span>
                <b className="league-score">{row.score}</b>
              </li>
            ))}
          </ol>
          <p className="league-safety-note"><span aria-hidden="true">◇</span><span><b>Không gửi dữ liệu trẻ em ra ngoài.</b> Bảng này chạy hoàn toàn trong trình duyệt và không giả lập Firebase. Hạng chỉ là huy hiệu trực quan, không trao sức mạnh hay shard.</span></p>
        </section>
      </div>
    </section>
  );
}

function CreatureView({ progress, onMap, onEvolution }) {
  return (
    <section className="creature-view page-enter" aria-labelledby="creature-title">
      <div className="creature-heading"><p className="scene-kicker">Bạn đồng hành</p><h1 id="creature-title">Hai dạng sống của tri thức.</h1><p>Nubi là người bạn hữu hình. Mạch chỉ xuất hiện khi cần giúp con nhìn ra cách làm.</p></div>
      <div className="character-showcase">
        <article className="character-panel nubi-panel"><NubiFigure className="creature-nubi-figure" stage={progress.nubiStage} cosmeticId={progress.cityState.equippedCosmeticId} alt="Nubi, sinh vật tròn mềm với ba dải cảm giác và lõi kim cương" /><div><span>LINH THÚ · HỮU HÌNH</span><h2>Nubi · {getNubiEvolutionStage(progress, nubiEvolutionStages)?.name}</h2><p>{getNubiEvolutionStage(progress, nubiEvolutionStages)?.description}</p><dl><div><dt>Hình thái</dt><dd>{progress.nubiStage}/{nubiEvolutionStages.length}</dd></div><div><dt>Vùng nhớ</dt><dd>{progress.completed.length}</dd></div><div><dt>Mảnh sáng</dt><dd>{progress.shards}</dd></div></dl></div></article>
        <article className="character-panel oracle-panel"><img src="/assets/mach-oracle-v2.png" alt="Mạch, lõi tinh thể và sáu mảnh rune lơ lửng" /><div><span>ORACLE · PHI VẬT CHẤT</span><h2>Mạch</h2><p>Một biểu hiện của tri thức. Mạch biến năng lượng của mình thành gợi ý trực quan.</p><ol><li>Gọi chú ý</li><li>Minh họa</li><li>Dẫn từng bước</li></ol></div></article>
      </div>
      <div className="creature-actions">
        {progress.nubiStage > 1 && <button className="tactile-button" type="button" onClick={onEvolution}>Xem lại khoảnh khắc tiến hóa</button>}
        <button className="quiet-action creature-back" type="button" onClick={onMap}>← Trở lại bản đồ</button>
      </div>
    </section>
  );
}

function ParentGate({ onClose, onPass, returnFocusRef }) {
  const [error, setError] = useState("");
  const dialogRef = useRef(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const dialog = dialogRef.current;
    const focusableSelector = "button:not(:disabled), [href], input:not(:disabled), [tabindex]:not([tabindex='-1'])";
    dialog?.querySelector(focusableSelector)?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = [...dialog.querySelectorAll(focusableSelector)];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      (returnFocusRef?.current ?? previousFocus)?.focus?.();
    };
  }, [onClose, returnFocusRef]);

  return (
    <div className="modal-backdrop" role="presentation">
      <section ref={dialogRef} className="parent-gate" role="dialog" aria-modal="true" aria-labelledby="gate-title">
        <button className="modal-close" type="button" onClick={onClose} aria-label="Đóng">×</button>
        <span className="adult-mark" aria-hidden="true">⌁</span>
        <p>Khu vực người lớn</p>
        <h2 id="gate-title">Vui lòng trả lời để tiếp tục</h2>
        <strong>12 × 8 = ?</strong>
        <div>{[86, 96, 108].map((value) => <button key={value} type="button" onClick={() => value === 96 ? onPass() : setError("Chưa đúng. Hãy thử lại.")}>{value}</button>)}</div>
        <small aria-live="polite">{error}</small>
      </section>
    </div>
  );
}

function formatLearningDuration(seconds) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.trunc(seconds)) : 0;
  if (safeSeconds < 60) return `${safeSeconds} giây`;
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return remainder ? `${minutes} phút ${remainder} giây` : `${minutes} phút`;
}

function ParentView({ progress, masteryReport, sessionPreferences, sessionCompass, onSessionPreferences, onPreviewSessionBreak, onPreviewNode, onPreviewPrototype, onReset, onExit }) {
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const resetButtonRef = useRef(null);
  const supports = Object.values(progress.learningMetrics).reduce((sum, item) => sum + item.supportsUsed, 0);
  const weekly = summarizeLearningActivity(progress);
  const skillInsights = rankSkillInsights(progress, nodes);
  const practiceTrend = skillInsights.practice ? getMasteryTrend(progress, skillInsights.practice.skillId) : null;
  const learningProof = getLatestLearningProof(progress, nodes);
  const practiceTrendLabel = practiceTrend?.direction === "up"
    ? `Tăng ${practiceTrend.delta} bậc mastery`
    : practiceTrend?.direction === "down"
      ? `Giảm ${Math.abs(practiceTrend.delta)} bậc; nên quan sát thêm`
    : practiceTrend?.direction === "steady"
      ? "Mastery đang ổn định"
      : practiceTrend?.direction === "new"
        ? "Vừa có mốc mastery đầu tiên"
        : "Cần thêm lượt chơi để thấy xu hướng";
  const insightTitle = skillInsights.practice
    ? `${skillInsights.strongest.skillNameVi} đang vững; ${skillInsights.practice.skillNameVi} là ưu tiên tiếp theo.`
    : "Chưa có lượt chơi để phân tích.";
  const insightCopy = skillInsights.practice
    ? `Daily Adventure sẽ ưu tiên ${skillInsights.practice.skillNameVi.toLowerCase()}. Hãy để con tự thử trước; chỉ gợi mở bằng đồ vật thật khi con cần.`
    : "Bắt đầu Bãi Hạt Sáng để hệ thống ghi nhận learning outcome đầu tiên.";
  return (
    <section className="parent-view page-enter" aria-labelledby="parent-title">
      <header className="parent-header"><div><p>Báo cáo phụ huynh · dữ liệu demo local</p><h1 id="parent-title">Hành trình học của Nubi</h1><span>Không so sánh trẻ với người khác. Không thưởng cho thời gian online.</span></div><button type="button" onClick={onExit}>Thoát khu vực phụ huynh</button></header>
      <div className="parent-overview">
        <article><span>Vùng đã hồi sinh</span><strong>{progress.completed.length}<i>/{nodes.length}</i></strong><small>Tiến độ thế giới · {progress.questState.completedIds.length}/{optionalQuests.length} lối rẽ</small></article>
        <article><span>Daily Adventure</span><strong>{progress.practiceMetrics.sessionsCompleted}</strong><small>{progress.practiceMetrics.challengesCompleted} thử thách · {progress.practiceMetrics.discoveryActivitiesCompleted} mạch khám phá</small></article>
         <article><span>Kinh nghiệm học tập</span><strong>{progress.xp}<i> XP</i></strong><small>First-clear có mastery, replay không farm</small></article>
         <article><span>Học trong 7 ngày</span><strong>{weekly.totalMinutesRounded}<i> phút</i></strong><small>{weekly.sessions} lượt · {weekly.uniqueSkills} kỹ năng</small></article>
        <article><span>Hỗ trợ đã dùng</span><strong>{supports}</strong><small>Không làm giảm phần thưởng</small></article>
      </div>
      <section className="learning-proof" aria-labelledby="learning-proof-title">
        <div className="learning-proof-heading">
          <div><span>Bằng chứng học tập · chỉ lưu local</span><h2 id="learning-proof-title">Một lượt chơi có ý nghĩa</h2></div>
          <small>Objective lấy từ registry chặng; số liệu lấy từ lượt hoàn tất gần nhất.</small>
        </div>
        {learningProof ? (
          <div className="learning-proof-grid">
            <article className="learning-proof-objective">
              <span className="learning-proof-rune" aria-hidden="true">{learningProof.icon}</span>
              <div><span>{learningProof.firstClear ? "Mốc đầu tiên" : "Lượt luyện gần nhất"} · {learningProof.skillNameVi}</span><h3>{learningProof.title}</h3><p>{learningProof.objectiveVi}</p></div>
            </article>
            <dl className="learning-proof-stats">
              <div><dt>Mastery</dt><dd>{getMasteryLabel(learningProof.mastery)}</dd></div>
              <div><dt>Lượt thử</dt><dd>{learningProof.attempts}</dd></div>
              <div><dt>Hỗ trợ</dt><dd>{learningProof.supportsUsed}</dd></div>
              <div><dt>Thời lượng</dt><dd>{formatLearningDuration(learningProof.durationSeconds)}</dd></div>
            </dl>
          </div>
        ) : <p className="learning-proof-empty">Chưa có lượt hoàn tất để tạo bằng chứng. Khi con hoàn thành một chặng, mục tiêu và cách con tự làm sẽ xuất hiện ở đây.</p>}
        {learningProof && <small className="learning-proof-boundary">Không phải chẩn đoán hay đánh giá ngoài curriculum; đây là bản ghi local để phụ huynh cùng con xem lại.</small>}
      </section>
      <section className="mastery-arc-panel" aria-labelledby="mastery-arc-title">
        <div className="mastery-arc-heading">
          <div><span>Mạch mastery · nhiều ngữ cảnh</span><h2 id="mastery-arc-title">Một kỹ năng, nhiều cách nhớ</h2></div>
          <small>Chỉ là bằng chứng thao tác local; không phải chẩn đoán.</small>
        </div>
        <p className="mastery-arc-copy">Khi cùng một kỹ năng xuất hiện ở chặng chính, Daily Adventure hoặc nhiệm vụ phụ, hệ thống ghi nhận ngữ cảnh đã gặp. Phần thưởng vẫn tách khỏi bằng chứng học tập.</p>
        <div className="mastery-arc-grid">
          {(masteryReport?.arcs ?? []).slice(0, 6).map((arc) => (
            <article key={arc.skillId} className={arc.transferReady ? "transfer-ready" : ""}>
              <div><span>{arc.skillNameVi}</span><strong>{arc.bestMastery ? getMasteryLabel(arc.bestMastery) : "Chưa có lượt"}</strong></div>
              <small>{arc.observedContexts.length ? `Đã gặp: ${arc.observedContexts.join(" · ")}` : "Chưa có bằng chứng qua nhiều ngữ cảnh"}</small>
              <b>{arc.transferReady ? "Đã gặp từ 2 ngữ cảnh" : `${arc.contextCount}/${arc.availableContexts.length} ngữ cảnh`}</b>
            </article>
          ))}
        </div>
      </section>
      <section className="energy-profile" aria-labelledby="energy-profile-title">
        <div className="energy-profile-heading">
          <div><span>Hệ năng lượng · first-clear</span><h2 id="energy-profile-title">Bốn dòng sáng của hành trình</h2></div>
          <small>Replay không farm · Nature Energy chỉ mở khi có curriculum được duyệt.</small>
        </div>
        <div className="energy-grid">
          {ENERGY_TYPE_IDS.map((id) => {
            const type = ENERGY_TYPES[id];
            const amount = progress.energies?.[id] ?? 0;
            const note = id === "nature" ? "Đang chờ nội dung Khoa học/Tự nhiên" : id === "mastery" ? "Thử thách tổng hợp và boss" : id === "discovery" ? "Khám phá hình dạng và rune" : "Toán, suy luận và thao tác";
            return <article key={id} className={`energy-card energy-${id}`}><div><b aria-hidden="true">{type.icon}</b><span>{type.labelVi.replace("Năng lượng ", "")}</span></div><strong>{amount}</strong><small>{note}</small></article>;
          })}
        </div>
      </section>
      <section className="session-parent-panel" aria-labelledby="session-compass-title">
        <div className="session-parent-copy">
          <span>Sức khỏe số · chỉ lưu local</span>
          <h2 id="session-compass-title">Session Compass</h2>
          <p>Chỉ đếm thời gian khi tab đang hiển thị và được chọn. Lời nhắc chờ đến khi con hoàn thành chặng; không khóa trò chơi, không phạt streak và không ảnh hưởng mastery.</p>
          <small>Phiên tab hiện tại: {Math.floor(sessionCompass.activeSeconds / 60)} phút hoạt động · {sessionCompass.reminderCount} lần đã nhắc nghỉ</small>
        </div>
        <div className="session-parent-controls">
          <button className="session-toggle" type="button" aria-pressed={sessionPreferences.enabled} onClick={() => onSessionPreferences({ enabled: !sessionPreferences.enabled })}>
            Nhắc nghỉ: <b>{sessionPreferences.enabled ? "Bật" : "Tắt"}</b>
          </button>
          <div className="session-limit-options" aria-label="Khoảng thời gian trước khi nhắc nghỉ">
            {SESSION_LIMIT_OPTIONS.map((minutes) => <button key={minutes} type="button" disabled={!sessionPreferences.enabled} aria-pressed={sessionPreferences.limitMinutes === minutes} onClick={() => onSessionPreferences({ limitMinutes: minutes })}>{minutes} phút</button>)}
          </div>
          <button className="session-preview-button" type="button" onClick={onPreviewSessionBreak}>Xem trước màn hình nghỉ</button>
        </div>
      </section>
      <div className="parent-insight"><div><span>Nhận định tuần này</span><h2>{insightTitle}</h2><p>{insightCopy}</p></div><div className="insight-orb" aria-hidden="true">✦</div></div>
      <section className="review-lab-panel" aria-labelledby="review-lab-title">
        <div>
          <span>Review local · không ghi tiến trình</span>
          <h2 id="review-lab-title">Playtest Lab</h2>
          <p>Mở nhanh toàn bộ 12 trạm để duyệt cảm giác kéo, chọn, ghép và chuỗi nhiều pha ngay trên thiết bị này.</p>
        </div>
        <div className="review-level-grid">
          {nodes.map((node) => (
            <button key={node.id} type="button" onClick={() => onPreviewNode(node)}>
              <span aria-hidden="true">{node.icon}</span>
              <span><small>{node.type}</small><strong>{node.title}</strong><em>{node.skillNameVi}</em></span>
              <b aria-hidden="true">→</b>
            </button>
          ))}
        </div>
        {prototypeNodes.map((node) => (
          <button key={node.id} className="review-prototype-card" type="button" onClick={() => onPreviewPrototype(node.id)}>
            <span aria-hidden="true">{node.icon}</span>
            <span><small>prototype · chưa ghi tiến trình</small><strong>{node.title}</strong><em>{node.skillNameVi}</em></span>
            <b aria-hidden="true">→</b>
          </button>
        ))}
        <small className="review-lab-note">Preview chỉ để duyệt interaction và hình ảnh; thoát ra sẽ không thay đổi báo cáo phụ huynh.</small>
      </section>
      <section className="integration-status" aria-labelledby="integration-status-title">
        <div>
          <span>Tích hợp & quyền riêng tư</span>
          <h2 id="integration-status-title">Đang chạy hoàn toàn trên thiết bị này</h2>
          <p>Tiến trình chưa đồng bộ Firebase và gợi ý chưa gửi tới Gemini. Chỉ bật cloud sau khi có tài khoản phụ huynh, Security Rules và endpoint server an toàn.</p>
        </div>
        <ul aria-label="Trạng thái nhà cung cấp">
          <li><i className={LOCAL_PROGRESS_PROVIDER.remote ? "ready" : "local"} aria-hidden="true" /><div><strong>Tiến trình</strong><small>{LOCAL_PROGRESS_PROVIDER.provider} · {LOCAL_PROGRESS_PROVIDER.syncsToFirebase ? "Firebase đã bật" : "Firebase chưa cấu hình"}</small></div></li>
          <li><i className={LOCAL_ORACLE_PROVIDER.remote ? "ready" : "local"} aria-hidden="true" /><div><strong>Gợi ý thích ứng</strong><small>{LOCAL_ORACLE_PROVIDER.provider} local · {LOCAL_ORACLE_PROVIDER.usesGemini ? "Gemini đã bật" : "Gemini chưa cấu hình"}</small></div></li>
        </ul>
      </section>
      {skillInsights.strongest && skillInsights.practice && (
        <div className="parent-skill-highlights">
          <article><span>Điểm mạnh hiện tại</span><strong>{skillInsights.strongest.skillNameVi}</strong><small>{getMasteryLabel(skillInsights.strongest.mastery)} · {skillInsights.strongest.attempts} lượt thử</small></article>
          <article><span>Nên luyện tiếp</span><strong>{skillInsights.practice.skillNameVi}</strong><small>{getMasteryLabel(skillInsights.practice.mastery)} · {Math.round(skillInsights.practice.supportRate * 100)}% lượt cần hỗ trợ</small></article>
          <article className={`trend-${practiceTrend?.direction ?? "none"}`}><span>Xu hướng 30 ngày</span><strong>{practiceTrend?.direction === "up" ? "↗ Đang tiến bộ" : practiceTrend?.direction === "down" ? "↘ Cần quan sát" : practiceTrend?.direction === "steady" ? "→ Đang củng cố" : practiceTrend?.direction === "new" ? "✦ Mốc đầu tiên" : "◇ Chưa đủ dữ liệu"}</strong><small>{practiceTrendLabel} · {practiceTrend?.samples ?? 0} lượt ghi nhận</small></article>
        </div>
      )}
      <section className="skill-report" aria-labelledby="skill-report-title">
        <div className="report-heading"><h2 id="skill-report-title">Mastery theo kỹ năng</h2><span>Prototype — chưa phải curriculum đã duyệt</span></div>
        <div className="skill-table">
          {nodes.map((node) => {
            const metric = progress.learningMetrics[node.skillId] ?? progress.learningMetrics[node.id];
            return <article key={node.id}><span className="skill-symbol">{node.icon}</span><div><h3>{node.skillNameVi}</h3><p>{node.objectiveVi}</p></div><div className="mastery-cell"><b>{getMasteryLabel(metric?.bestMastery ?? 0)}</b><small>{metric ? `${metric.totalAttempts} lượt thử · ${metric.supportsUsed} hỗ trợ` : "Chưa chơi"}</small></div></article>;
          })}
        </div>
      </section>
      <footer className="parent-footer"><p>Dữ liệu chỉ lưu trên trình duyệt này. Không gửi thông tin trẻ em ra ngoài.</p><button ref={resetButtonRef} type="button" onClick={() => setResetConfirmOpen(true)}>Xóa tiến trình demo</button></footer>
      {resetConfirmOpen && <ResetProgressConfirm returnFocusRef={resetButtonRef} onClose={() => setResetConfirmOpen(false)} onConfirm={onReset} />}
    </section>
  );
}

function SessionBreakView({ preview, progress, onBack, onContinue, onStartFresh }) {
  const [resting, setResting] = useState(false);
  return (
    <main className="session-break-view" aria-labelledby="session-break-title">
      <img className="session-break-backdrop" src="/assets/awakened-forest-clean.png" alt="" />
      <div className="session-break-vignette" aria-hidden="true" />
      {preview && <span className="session-preview-label">Bản xem trước cho phụ huynh</span>}
      <div className="session-break-nubi" aria-hidden="true">
        <span className="nubi-aura"><i /><i /><i /><i /></span>
        <NubiFigure stage={progress.nubiStage} cosmeticId={progress.cityState.equippedCosmeticId} alt="" />
      </div>
      <section className="session-break-card">
        <span className="session-break-rune" aria-hidden="true">◔</span>
        <p>SESSION COMPASS</p>
        <h1 id="session-break-title">{resting ? "Nubi cũng đang nghỉ cùng con." : "Lõi Tri Thức đã sáng đủ cho một phiên."}</h1>
        <div aria-live="polite">
          <p>{resting ? "Khi mắt và người đã dễ chịu, con có thể bắt đầu một phiên mới. Không có đồng hồ đếm ngược." : "Mình dừng lại, nhìn ra xa và vận động một chút nhé. Mọi tiến trình đã được giữ nguyên."}</p>
        </div>
        {resting ? (
          <button className="tactile-button primary-action" type="button" onClick={preview ? onBack : onStartFresh}>{preview ? "Quay lại báo cáo" : "Bắt đầu phiên mới"}<b aria-hidden="true">➜</b></button>
        ) : (
          <div className="session-break-actions">
            <button className="tactile-button primary-action" type="button" onClick={() => setResting(true)}>Nghỉ một chút</button>
            {preview ? <button className="quiet-action" type="button" onClick={onBack}>Quay lại báo cáo</button> : <button className="quiet-action" type="button" onClick={onContinue}>Chơi nốt một chặng</button>}
          </div>
        )}
        <small>Nhịp nghỉ không thay đổi phần thưởng, mastery hay thành tích League.</small>
      </section>
    </main>
  );
}

function ResetProgressConfirm({ onClose, onConfirm, returnFocusRef }) {
  const cancelRef = useRef(null);
  const dialogRef = useRef(null);
  useEffect(() => {
    const previousFocus = document.activeElement;
    const dialog = dialogRef.current;
    const focusableSelector = "button:not(:disabled), [href], input:not(:disabled), [tabindex]:not([tabindex='-1'])";
    cancelRef.current?.focus();
    function onKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = [...dialog.querySelectorAll(focusableSelector)];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      (returnFocusRef?.current ?? previousFocus)?.focus?.();
    };
  }, [onClose, returnFocusRef]);
  return (
    <div className="modal-backdrop" role="presentation">
      <section ref={dialogRef} className="reset-confirm" role="alertdialog" aria-modal="true" aria-labelledby="reset-confirm-title" aria-describedby="reset-confirm-copy">
        <span className="adult-mark" aria-hidden="true">!</span>
        <h2 id="reset-confirm-title">Xóa toàn bộ tiến trình local?</h2>
        <p id="reset-confirm-copy">Hành động này xóa chặng, nhiệm vụ tùy chọn, mastery, Daily Adventure và trang bị trên trình duyệt này. Hồ sơ tên gọi vẫn được giữ.</p>
        <div><button ref={cancelRef} type="button" onClick={onClose}>Giữ lại dữ liệu</button><button className="danger-action" type="button" onClick={onConfirm}>Xóa tiến trình</button></div>
      </section>
    </div>
  );
}

function ShapeGlyph({ shape }) {
  return <span className={`shape-glyph glyph-${shape}`} aria-hidden="true" />;
}

function RuneGlyph({ rune }) {
  const glyphs = { sun: "☼", leaf: "❧", crystal: "◆" };
  return <span className={`rune-glyph rune-${rune}`} aria-hidden="true">{glyphs[rune]}</span>;
}
