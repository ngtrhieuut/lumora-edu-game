import { useCallback, useEffect, useRef, useState } from "react";

export const DEFAULT_POINTER_DRAG_THRESHOLD = 6;

const DROP_ZONE_SELECTOR = "[data-drop-zone]";

function isPoint(point) {
  return Boolean(
    point &&
      Number.isFinite(point.x) &&
      Number.isFinite(point.y),
  );
}

function normalizeThreshold(threshold) {
  return Number.isFinite(threshold) && threshold >= 0
    ? threshold
    : DEFAULT_POINTER_DRAG_THRESHOLD;
}

export function getPointerDelta(start, current) {
  if (!isPoint(start) || !isPoint(current)) return null;

  return {
    x: current.x - start.x,
    y: current.y - start.y,
  };
}

export function isBeyondPointerThreshold(
  start,
  current,
  threshold = DEFAULT_POINTER_DRAG_THRESHOLD,
) {
  const delta = getPointerDelta(start, current);
  if (!delta) return false;

  const safeThreshold = normalizeThreshold(threshold);
  return delta.x ** 2 + delta.y ** 2 > safeThreshold ** 2;
}

export function resolveDropZoneId(target) {
  if (!target || typeof target.closest !== "function") return null;

  let dropZone;
  try {
    dropZone = target.closest(DROP_ZONE_SELECTOR);
  } catch {
    return null;
  }

  const zoneId = dropZone?.dataset?.dropZone;
  return typeof zoneId === "string" && zoneId.trim().length > 0 ? zoneId : null;
}

function resolveDropZoneElement(target) {
  if (!target || typeof target.closest !== "function") return null;
  try {
    const zone = target.closest(DROP_ZONE_SELECTOR);
    if (!zone || zone.disabled || zone.getAttribute?.("aria-disabled") === "true") return null;
    return zone;
  } catch {
    return null;
  }
}

export function isDropZoneAllowed(zoneId, validDropZones = null) {
  if (!Array.isArray(validDropZones)) return true;
  return typeof zoneId === "string" && validDropZones.map(String).includes(zoneId);
}

export function getPointerDropStyle(offset = {}) {
  const x = Number.isFinite(offset?.x) ? offset.x : 0;
  const y = Number.isFinite(offset?.y) ? offset.y : 0;

  return {
    touchAction: "none",
    transform: `translate3d(${x}px, ${y}px, 0)`,
  };
}

function getEventPoint(event) {
  if (!event || !Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) {
    return null;
  }

  return { x: event.clientX, y: event.clientY };
}

function matchesPointer(event, interaction) {
  if (!interaction || !event) return false;
  return interaction.pointerId === null || event.pointerId === interaction.pointerId;
}

function releasePointerCapture(interaction) {
  const source = interaction?.source;
  if (!source || interaction.pointerId === null || typeof source.releasePointerCapture !== "function") {
    return;
  }

  try {
    if (typeof source.hasPointerCapture !== "function" || source.hasPointerCapture(interaction.pointerId)) {
      source.releasePointerCapture(interaction.pointerId);
    }
  } catch {
    // Pointer capture may already have been released by the browser.
  }
}

function removeWindowListeners(interaction) {
  const target = interaction?.eventTarget;
  if (!target) return;
  target.removeEventListener("pointermove", interaction.windowMove, true);
  target.removeEventListener("pointerup", interaction.windowUp, true);
  target.removeEventListener("pointercancel", interaction.windowCancel, true);
}

function dropZoneElementAtPoint(point, source) {
  if (!isPoint(point) || typeof document === "undefined" || typeof document.elementFromPoint !== "function") {
    return null;
  }

  const sourceStyle = source?.style;
  const previousPointerEvents = sourceStyle?.pointerEvents;
  try {
    if (sourceStyle) sourceStyle.pointerEvents = "none";
    return resolveDropZoneElement(document.elementFromPoint(point.x, point.y));
  } catch {
    return null;
  } finally {
    if (sourceStyle) sourceStyle.pointerEvents = previousPointerEvents;
  }
}

function isAllowedDropZone(zone, validDropZones) {
  return Boolean(zone) && isDropZoneAllowed(zone.dataset?.dropZone, validDropZones);
}

function clearDropHover(interaction) {
  interaction?.hoveredZone?.removeAttribute?.("data-drag-hover");
  if (interaction) interaction.hoveredZone = null;
}

function updateDropHover(interaction, point, validDropZones) {
  const candidate = dropZoneElementAtPoint(point, interaction?.source);
  const nextZone = isAllowedDropZone(candidate, validDropZones) ? candidate : null;
  if (interaction?.hoveredZone === nextZone) return;
  clearDropHover(interaction);
  if (nextZone) {
    nextZone.setAttribute("data-drag-hover", "true");
    interaction.hoveredZone = nextZone;
  }
}

function pulseDropLanding(zone) {
  if (!zone) return;
  zone.setAttribute("data-drop-landed", "true");
  globalThis.setTimeout?.(() => zone.removeAttribute("data-drop-landed"), 520);
}

/**
 * Pointer-based drag source behavior.
 *
 * `onPickUp` fires only after the pointer moves past the threshold, so a tap
 * remains available to the consumer's normal click or keyboard fallback.
 */
export function usePointerDrop(options = {}) {
  const {
    payload,
    disabled = false,
    validDropZones = null,
    onPickUp,
    onDrop,
    onCancel,
    threshold = DEFAULT_POINTER_DRAG_THRESHOLD,
  } = options ?? {};
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const interactionRef = useRef(null);
  const optionsRef = useRef({});
  const handlersRef = useRef({});

  optionsRef.current = {
    disabled,
    validDropZones,
    onPickUp,
    onDrop,
    onCancel,
  };

  const finishInteraction = useCallback((interaction) => {
    if (interactionRef.current !== interaction) return false;

    interactionRef.current = null;
    clearDropHover(interaction);
    removeWindowListeners(interaction);
    setDragging(false);
    setOffset({ x: 0, y: 0 });
    releasePointerCapture(interaction);
    return true;
  }, []);

  const handlePointerDown = useCallback((event) => {
    const options = optionsRef.current;
    if (
      options.disabled ||
      !event ||
      event.isPrimary === false ||
      (typeof event.button === "number" && event.button !== 0)
    ) {
      return;
    }

    if (interactionRef.current) return;

    const start = getEventPoint(event);
    const source = event.currentTarget;
    if (!start || !source) return;

    const pointerId = event.pointerId ?? null;
    const interaction = {
      pointerId,
      source,
      start,
      last: start,
      threshold: normalizeThreshold(threshold),
      payload,
      hoveredZone: null,
      dragging: false,
    };

    const eventTarget = source.ownerDocument?.defaultView ?? globalThis.window;
    if (eventTarget?.addEventListener) {
      interaction.eventTarget = eventTarget;
      interaction.windowMove = (nextEvent) => handlersRef.current.move?.(nextEvent);
      interaction.windowUp = (nextEvent) => handlersRef.current.up?.(nextEvent);
      interaction.windowCancel = (nextEvent) => handlersRef.current.cancel?.(nextEvent);
      eventTarget.addEventListener("pointermove", interaction.windowMove, true);
      eventTarget.addEventListener("pointerup", interaction.windowUp, true);
      eventTarget.addEventListener("pointercancel", interaction.windowCancel, true);
    }

    interactionRef.current = interaction;

    if (pointerId !== null && typeof source.setPointerCapture === "function") {
      try {
        source.setPointerCapture(pointerId);
      } catch {
        // Continue without capture if the platform rejects this pointer.
      }
    }
  }, [payload, threshold]);

  const handlePointerMove = useCallback((event) => {
    const interaction = interactionRef.current;
    if (!matchesPointer(event, interaction)) return;

    const current = getEventPoint(event);
    const delta = getPointerDelta(interaction?.start, current);
    if (!delta) return;

    interaction.last = current;

    if (!interaction.dragging) {
      if (!isBeyondPointerThreshold(interaction.start, current, interaction.threshold)) return;

      interaction.dragging = true;
      setDragging(true);
      optionsRef.current.onPickUp?.(interaction.payload);
    }

    setOffset(delta);
    updateDropHover(interaction, current, optionsRef.current.validDropZones);
    if (typeof event.preventDefault === "function") event.preventDefault();
  }, []);

  const handlePointerUp = useCallback((event) => {
    const interaction = interactionRef.current;
    if (!matchesPointer(event, interaction)) return;

    const point = getEventPoint(event) ?? interaction.last;
    const wasDragging = interaction.dragging;
    const payloadAtPickup = interaction.payload;
    const landedZone = dropZoneElementAtPoint(point, interaction.source);
    finishInteraction(interaction);

    if (!wasDragging) return;

    const zoneId = isAllowedDropZone(landedZone, optionsRef.current.validDropZones)
      ? landedZone?.dataset?.dropZone ?? null
      : null;
    if (zoneId !== null) {
      pulseDropLanding(landedZone);
      optionsRef.current.onDrop?.(zoneId, payloadAtPickup);
    } else {
      optionsRef.current.onCancel?.();
    }
  }, [finishInteraction]);

  const handlePointerCancel = useCallback((event) => {
    const interaction = interactionRef.current;
    if (!matchesPointer(event, interaction)) return;

    const wasDragging = interaction.dragging;
    if (!finishInteraction(interaction) || !wasDragging) return;
    optionsRef.current.onCancel?.();
  }, [finishInteraction]);

  handlersRef.current = {
    move: handlePointerMove,
    up: handlePointerUp,
    cancel: handlePointerCancel,
  };

  useEffect(() => {
    return () => {
      const interaction = interactionRef.current;
      if (!interaction) return;

      interactionRef.current = null;
      clearDropHover(interaction);
      removeWindowListeners(interaction);
      releasePointerCapture(interaction);
    };
  }, []);

  const style = getPointerDropStyle(offset);
  const bind = {
    onPointerDown: handlePointerDown,
    "aria-grabbed": dragging,
    style,
  };

  return { bind, dragging, style };
}

export default usePointerDrop;
