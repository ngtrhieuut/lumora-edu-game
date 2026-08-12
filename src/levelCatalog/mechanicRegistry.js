// Canonical mechanic families for the 500-level catalog.
// `prototypeRuntimeId` bridges to the current vertical-slice runtime when one exists.

export const MECHANIC_REGISTRY = Object.freeze({
  collect: { labelVi: "Thu thập tương tác", prototypeRuntimeId: "collect", status: "implemented" },
  "slot-fill": { labelVi: "Kéo-thả vào slot", prototypeRuntimeId: "bridge", status: "adapter-needed" },
  sort: { labelVi: "Phân loại dòng chảy", prototypeRuntimeId: "sort", status: "implemented" },
  path: { labelVi: "Đường đi lựa chọn", prototypeRuntimeId: "path", status: "implemented" },
  "build-repair": { labelVi: "Xây dựng / sửa chữa", prototypeRuntimeId: "shape", status: "adapter-needed" },
  simulation: { labelVi: "Mini simulation", prototypeRuntimeId: "scenario", status: "adapter-needed" },
  match: { labelVi: "Matching không lời", prototypeRuntimeId: "match", status: "implemented" },
  sequence: { labelVi: "Sequence puzzle", prototypeRuntimeId: "order", status: "adapter-needed" },
  observation: { labelVi: "Observation hunt", prototypeRuntimeId: null, status: "renderer-needed" },
  "resource-balance": { labelVi: "Resource balance", prototypeRuntimeId: "route", status: "adapter-needed" },
  lab: { labelVi: "Lab puzzle", prototypeRuntimeId: null, status: "renderer-needed" },
  data: { labelVi: "Data mission", prototypeRuntimeId: null, status: "renderer-needed" },
  boss: { labelVi: "Boss chữa lành đa pha", prototypeRuntimeId: "boss", status: "implemented" },
});

export function getMechanicDefinition(mechanicId) {
  return MECHANIC_REGISTRY[mechanicId] ?? null;
}
