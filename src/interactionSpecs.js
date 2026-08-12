// Canonical interaction contracts for the playable vertical slice.
// These specs describe the learning-facing interaction; they do not execute game rules.

const REQUIRED_TEXT_FIELDS = [
  "id", "mechanic", "title", "learningObjective", "entryState", "gestureLabel",
  "primaryGesture", "success", "softFail", "animationCue", "exitState",
];
const ALLOWED_GESTURES = new Set(["tap", "drag", "keyboard", "sequence"]);

const freezeSpec = (value) => Object.freeze({
  ...value,
  gestures: Object.freeze([...value.gestures]),
  objects: Object.freeze([...value.objects]),
  rules: Object.freeze([...value.rules]),
  hintLadder: Object.freeze([...value.hintLadder]),
  masteryEvents: Object.freeze([...value.masteryEvents]),
  audioCues: Object.freeze([...value.audioCues]),
  dropZoneIds: Object.freeze([...(value.dropZoneIds ?? [])]),
  phaseMechanics: Object.freeze([...(value.phaseMechanics ?? [])]),
});

const commonMasteryEvents = ["attempt", "hint-requested", "support-used", "level-solved"];

export const INTERACTION_SPECS = Object.freeze({
  collect: freezeSpec({
    id: "collect", mechanic: "collect", title: "Gọi hạt sáng", learningObjective: "Đếm và chọn đúng 5 vật thể đang sáng.",
    entryState: "Bảy hạt nằm trong khu rừng; năm hạt đang phát sáng.", gestureLabel: "Kéo hạt sáng vào lõi", primaryGesture: "drag", gestures: ["drag", "tap", "keyboard"],
    objects: ["light-seed", "collect-core"], dropZoneIds: ["core"], rules: ["Chỉ hạt lit là đáp án đúng.", "Mỗi hạt chỉ được gọi sáng một lần."],
    success: "Đủ 5 hạt sáng và vùng ký ức được khôi phục.", softFail: "Hạt ngủ không làm mất lượt; trẻ thử lại với hạt đang sáng.",
    hintLadder: ["Nhìn ánh sáng bên trong từng hạt.", "Hãy tìm các hạt có lõi vàng-xanh.", "Mạch làm nổi bật hạt sáng tiếp theo."],
    masteryEvents: commonMasteryEvents, animationCue: "seed-to-core", audioCues: ["tap", "soft-fail", "hint", "success"], exitState: "restoration",
  }),
  match: freezeSpec({
    id: "match", mechanic: "match", title: "Ghép số với lượng", learningObjective: "Ghép mỗi chữ số với nhóm đom đóm có cùng số lượng.",
    entryState: "Ba phiến số và ba nhóm đom đóm đang tách rời.", gestureLabel: "Kéo số đến nhóm tương ứng", primaryGesture: "drag", gestures: ["drag", "tap", "keyboard"],
    objects: ["number-token", "quantity-group"], dropZoneIds: ["2", "4", "6"], rules: ["Mỗi số chỉ ghép một lần.", "Sai cặp chỉ tạo soft-fail và giữ các cặp đúng."],
    success: "Ba cặp đúng nối thành một mạch sáng.", softFail: "Đếm lại nhóm đom đóm rồi thử số khác.",
    hintLadder: ["Đếm từng đom đóm trong nhóm.", "Tìm nhóm có cùng số với phiến đang chọn.", "Mạch chỉ viền nhóm đúng tiếp theo."],
    masteryEvents: commonMasteryEvents, animationCue: "number-tether", audioCues: ["tap", "soft-fail", "hint", "success"], exitState: "restoration",
  }),
  bridge: freezeSpec({
    id: "bridge", mechanic: "bridge", title: "Dựng cầu bằng phép cộng", learningObjective: "Hiểu phép cộng là thêm vật thể vào một nhóm.",
    entryState: "Cầu có 4 nhịp sáng; dòng năng lượng đang đợi 3 tinh thể để chạm cổng bên kia.", gestureLabel: "Kéo tinh thể vào nhịp cầu", primaryGesture: "drag", gestures: ["drag", "tap", "keyboard"],
    objects: ["crystal-token", "crystal-pedestal", "bridge-track", "energy-river"], dropZoneIds: ["bridge"], rules: ["Mỗi tinh thể nối thêm một nhịp.", "Đủ 3 tinh thể thì cầu chạm tới cổng."],
    success: "Bảy nhịp cầu sáng liền nhau và dòng năng lượng đi qua.", softFail: "Không có sai đáp án; trẻ thêm từng tinh thể và quan sát cầu dài ra.",
    hintLadder: ["Cầu đang có 4 nhịp.", "Mỗi tinh thể nối thêm một nhịp.", "Mạch làm nổi tinh thể gần nhất và bệ cầu."],
    masteryEvents: commonMasteryEvents, animationCue: "crystal-builds-bridge", audioCues: ["tap", "hint", "success"], exitState: "restoration",
  }),
  path: freezeSpec({
    id: "path", mechanic: "path", title: "Nối đường sáng", learningObjective: "Hiểu phép cộng bằng cách thêm bước vào đường đi.",
    entryState: "Bốn bước đầu đã sáng; hai ô cuối đang trống.", gestureLabel: "Kéo quầng sáng vào bước trống", primaryGesture: "drag", gestures: ["drag", "tap", "keyboard"],
    objects: ["light-wisp", "missing-path-step"], dropZoneIds: ["4", "5"], rules: ["Mỗi quầng sáng lấp một ô trống.", "Không dùng lại một quầng sáng hoặc ô đã đặt."],
    success: "Đường có đủ 6 bước và mở cổng.", softFail: "Nếu chưa chọn quầng sáng, nhắc trẻ chọn rồi đặt vào ô trống.",
    hintLadder: ["Đếm số bước đã sáng.", "Hai ô cuối đang cần hai quầng sáng.", "Mạch làm sáng thao tác cuối còn thiếu."],
    masteryEvents: commonMasteryEvents, animationCue: "wisp-path-connect", audioCues: ["tap", "soft-fail", "hint", "success"], exitState: "restoration",
  }),
  subtract: freezeSpec({
    id: "subtract", mechanic: "subtract", title: "Đưa đom đóm về tổ", learningObjective: "Hiểu phép trừ là lấy bớt vật thể khỏi một nhóm.",
    entryState: "Sáu đom đóm ở ngoài vườn; tổ cần nhận hai con.", gestureLabel: "Kéo đom đóm về tổ", primaryGesture: "drag", gestures: ["drag", "tap", "keyboard"],
    objects: ["firefly", "firefly-nest", "subtraction-equation"], dropZoneIds: ["nest"], rules: ["Chọn đúng hai đom đóm.", "Mỗi lần đưa về tổ giảm số ngoài vườn một đơn vị."],
    success: "Hai đom đóm về tổ và 6 − 2 = 4 được nhìn thấy.", softFail: "Không có đom đóm bị mất; trẻ có thể chọn lại con khác trước khi đủ hai.",
    hintLadder: ["Mục tiêu là đưa bớt hai con.", "Chọn một đom đóm rồi kéo vào tổ.", "Mạch viền đom đóm tiếp theo có thể đưa về."],
    masteryEvents: commonMasteryEvents, animationCue: "firefly-return", audioCues: ["tap", "hint", "success"], exitState: "restoration",
  }),
  sort: freezeSpec({
    id: "sort", mechanic: "sort", title: "Phân loại hạt", learningObjective: "So sánh và phân loại vật theo kích thước.",
    entryState: "Sáu hạt nhỏ/lớn nằm trên giá; hai bờ có nhãn kích thước.", gestureLabel: "Kéo hạt về đúng bờ", primaryGesture: "drag", gestures: ["drag", "tap", "keyboard"],
    objects: ["pebble-small", "pebble-large", "shallow-bank", "deep-bank"], dropZoneIds: ["small", "large"], rules: ["Hạt nhỏ về bờ nông.", "Hạt lớn về bờ sâu."],
    success: "Sáu hạt được phân loại đúng.", softFail: "Hạt quay lại vị trí để trẻ quan sát kích thước và thử lại.",
    hintLadder: ["So sánh hạt với hai nhãn bờ.", "Hạt nhỏ đi với bờ nông; hạt lớn đi với bờ sâu.", "Mạch làm nổi hạt chưa phân loại tiếp theo."],
    masteryEvents: commonMasteryEvents, animationCue: "pebble-to-bank", audioCues: ["tap", "soft-fail", "hint", "success"], exitState: "restoration",
  }),
  numeral: freezeSpec({
    id: "numeral", mechanic: "numeral", title: "Gọi tên số", learningObjective: "Nhận ra chữ số tương ứng với một nhóm hạt sáng.",
    entryState: "Một nhóm hạt sáng đang chờ được đếm; ba chữ số đang nằm trong khay.", gestureLabel: "Kéo chữ số vào Lõi gọi số", primaryGesture: "drag", gestures: ["drag", "tap", "keyboard"],
    objects: ["quantity-group", "numeral-token", "numeral-core"], dropZoneIds: ["core"], rules: ["Mỗi lượt chỉ có một chữ số đúng với số lượng.", "Sai chỉ tạo soft-fail và giữ nhóm hạt hiện tại để thử lại."],
    success: "Ba chữ số đã được gọi đúng từ các nhóm hạt.", softFail: "Chữ số quay lại khay để trẻ đếm lại nhóm hạt rồi thử tiếp.",
    hintLadder: ["Đếm từng hạt trong Lõi.", "Tìm chữ số có cùng số lượng với nhóm hạt.", "Mạch viền làm nổi chữ số đúng đang được gọi."],
    masteryEvents: commonMasteryEvents, animationCue: "numeral-to-core", audioCues: ["tap", "soft-fail", "hint", "success"], exitState: "review-only",
  }),
  "compare-pair": freezeSpec({
    id: "compare-pair", mechanic: "compare-pair", title: "So sánh từng cặp", learningObjective: "Nhận biết quan hệ lớn hơn hoặc nhỏ hơn qua từng cặp vật thể.",
    entryState: "Hai hạt có kích thước khác nhau đang chờ được soi; một quan hệ đang được gọi.", gestureLabel: "Kéo hạt vào ô cùng quan hệ", primaryGesture: "drag", gestures: ["drag", "tap", "keyboard"],
    objects: ["comparison-pair", "larger-zone", "smaller-zone"], dropZoneIds: ["larger", "smaller"], rules: ["Mỗi lượt chỉ có một cặp.", "Sai chỉ tạo soft-fail và giữ lượt hiện tại để thử lại."],
    success: "Ba cặp được so sánh và dòng kích thước đã sáng.", softFail: "Hạt quay lại để trẻ quan sát kích thước rồi thử lại.",
    hintLadder: ["Nhìn hai hạt trong cùng một cặp.", "Hạt to hơn vào ô Lớn hơn; hạt nhỏ hơn vào ô Nhỏ hơn.", "Mạch viền làm nổi hạt đúng với quan hệ đang gọi."],
    masteryEvents: commonMasteryEvents, animationCue: "pairwise-compare", audioCues: ["tap", "soft-fail", "hint", "success"], exitState: "review-only",
  }),
  order: freezeSpec({
    id: "order", mechanic: "order", title: "Sắp xếp thứ tự", learningObjective: "Nhận biết quan hệ trước – sau qua chuỗi ba dấu sáng.",
    entryState: "Ba dấu sáng đang trộn trong khay; ba ô trống đang chờ theo thứ tự.", gestureLabel: "Kéo dấu sáng vào ô tiếp theo", primaryGesture: "drag", gestures: ["drag", "tap", "keyboard"],
    objects: ["sequence-token", "order-slot", "memory-stream"], dropZoneIds: ["0", "1", "2"], rules: ["Chỉ dấu đang đến lượt được nhận.", "Đặt sai không xóa placement đã đúng và chỉ tạo soft-fail."],
    success: "Ba dấu sáng khóa thành một dòng kỷ niệm.", softFail: "Dòng chưa nhận dấu này; hãy tìm dấu đang được gọi.",
    hintLadder: ["Nhìn ô sáng đang đến lượt.", "Đặt dấu được gọi vào ô trống đầu tiên.", "Mạch viền token đang đến lượt và ô kế tiếp."],
    masteryEvents: commonMasteryEvents, animationCue: "order-sequence-lock", audioCues: ["tap", "soft-fail", "hint", "success"], exitState: "review-only",
  }),
  route: freezeSpec({
    id: "route", mechanic: "route", title: "Dẫn hạt qua tuyến sáng", learningObjective: "So sánh kích thước và đưa từng hạt về đúng bờ.",
    entryState: "Bốn hạt đang ở bến nguồn; hai bờ có tuyến nối riêng và sức chứa hữu hạn.", gestureLabel: "Kéo hạt về bờ phù hợp", primaryGesture: "drag", gestures: ["drag", "tap", "keyboard"],
    objects: ["seed-source", "seed-resource", "shallow-bank", "deep-bank", "river-route"], dropZoneIds: ["shallow-bank", "deep-bank"], rules: ["Hạt nhỏ đi về bờ nông; hạt lớn đi về bờ sâu.", "Sai tuyến chỉ tạo soft-fail; hạt và tuyến đúng vẫn được giữ nguyên."],
    success: "Bốn hạt về đúng bờ và dòng suối sáng trở lại.", softFail: "Hạt quay về bến; hãy so sánh kích thước rồi thử tuyến khác.",
    hintLadder: ["Nhìn dấu hiệu nhỏ và lớn trên hạt.", "Bờ nông nhận hạt nhỏ; bờ sâu nhận hạt lớn.", "Mạch làm sáng tuyến phù hợp với hạt đang được chọn."],
    masteryEvents: commonMasteryEvents, animationCue: "resource-route", audioCues: ["tap", "soft-fail", "hint", "success"], exitState: "restoration",
  }),
  restore: freezeSpec({
    id: "restore", mechanic: "restore", title: "Cân bằng vạt cỏ", learningObjective: "Điều chỉnh nước và ánh sáng về vùng cân bằng để môi trường hồi sinh.",
    entryState: "Vạt cỏ đang thiếu nước và thừa ánh sáng; bốn dụng cụ môi trường đang chờ được dùng.", gestureLabel: "Kéo dụng cụ vào nguồn cần điều chỉnh", primaryGesture: "drag", gestures: ["drag", "tap", "keyboard"],
    objects: ["restoration-grove", "water-variable", "light-variable", "restoration-tool"], dropZoneIds: ["water", "light"], rules: ["Mỗi dụng cụ chỉ điều chỉnh đúng một nguồn.", "Thao tác lệch làm cảnh quan dao động nhưng không xóa tiến trình."],
    success: "Nước và ánh sáng về vùng cân bằng; vạt cỏ gọi đàn đom đóm trở lại.", softFail: "Nếu chỉ số lệch xa hơn, hãy thử dụng cụ đối nghịch để kéo môi trường về gần mục tiêu.",
    hintLadder: ["Nhìn thanh mục tiêu của nước và ánh sáng.", "Vạt cỏ đang cần thêm nước và bớt ánh sáng.", "Mạch làm sáng dụng cụ gần mục tiêu nhất."],
    masteryEvents: commonMasteryEvents, animationCue: "environment-restoration", audioCues: ["tap", "soft-fail", "hint", "success"], exitState: "restoration",
  }),
  shape: freezeSpec({
    id: "shape", mechanic: "shape", title: "Sửa cỗ máy hình khối", learningObjective: "Nhận biết và ghép hình phẳng cơ bản.",
    entryState: "Cỗ máy cổ đang tắt; ba khe hình học và ba mảnh sửa máy đang chờ được nối.", gestureLabel: "Kéo mảnh vào khe cùng hình", primaryGesture: "drag", gestures: ["drag", "tap", "keyboard"],
    objects: ["shape-machine", "shape-piece", "repair-slot", "machine-core"], dropZoneIds: ["circle", "triangle", "square"], rules: ["Mảnh chỉ khớp với khe cùng hình.", "Mỗi khe chỉ nhận một mảnh rồi làm sáng một mạch."],
    success: "Cỗ máy hoạt động sau khi đủ ba mạch hình.", softFail: "Mảnh không khớp quay lại khay; cỗ máy không mất năng lượng.",
    hintLadder: ["Nhìn đường viền của ổ khóa.", "Tìm mảnh có cùng hình với ổ.", "Mạch làm sáng ổ và mảnh tương ứng."],
    masteryEvents: commonMasteryEvents, animationCue: "shape-lock", audioCues: ["tap", "soft-fail", "hint", "success"], exitState: "restoration",
  }),
  rune: freezeSpec({
    id: "rune", mechanic: "rune", title: "Tìm quy luật rune", learningObjective: "Nhận ra và tiếp tục một chuỗi lặp đơn giản.",
    entryState: "Chuỗi mặt trời, lá, tinh thể lặp lại; ô cuối còn thiếu.", gestureLabel: "Kéo rune tiếp theo vào ô trống", primaryGesture: "drag", gestures: ["drag", "tap", "keyboard"],
    objects: ["rune-sequence", "rune-choice", "missing-rune"], dropZoneIds: ["missing"], rules: ["Chuỗi lặp theo nhịp mặt trời → lá → tinh thể.", "Chỉ tinh thể nối tiếp đúng chuỗi hiện tại."],
    success: "Rune cuối khớp nhịp và mở lối ẩn.", softFail: "Rune sai không khóa board; trẻ quan sát lại chuỗi từ đầu.",
    hintLadder: ["Đọc năm rune đã có từ trái sang phải.", "Sau mặt trời và lá, tinh thể sẽ đến.", "Mạch làm nổi tinh thể đúng."],
    masteryEvents: commonMasteryEvents, animationCue: "rune-sequence-complete", audioCues: ["tap", "soft-fail", "hint", "success"], exitState: "restoration",
  }),
  scenario: freezeSpec({
    id: "scenario", mechanic: "scenario", title: "Chia phần cho bạn", learningObjective: "Dùng số lượng trong một tình huống gần gũi.",
    entryState: "Năm phần quả sáng nằm trên giá; Míu cần 2 và Tí cần 3.", gestureLabel: "Kéo phần quả đến bạn", primaryGesture: "drag", gestures: ["drag", "tap", "keyboard"],
    objects: ["portion-rack", "creature-station-miu", "creature-station-ti", "campfire"], dropZoneIds: ["miu", "ti"], rules: ["Hai trạm Míu nhận đủ 2 phần.", "Ba trạm Tí nhận đủ 3 phần; không chia thêm khi đã đủ."],
    success: "Năm trạm sinh vật đủ phần và bữa ăn bên bếp hoàn tất.", softFail: "Trạm đã đủ phần sẽ nhắc trẻ chuyển phần còn lại cho bạn khác.",
    hintLadder: ["Đọc số phần cần trên mỗi đĩa.", "Đưa hai phần cho Míu trước rồi ba phần cho Tí.", "Mạch làm nổi người bạn đang cần phần."],
    masteryEvents: commonMasteryEvents, animationCue: "portion-share", audioCues: ["tap", "soft-fail", "hint", "success"], exitState: "restoration",
  }),
  mixed: freezeSpec({
    id: "mixed", mechanic: "mixed", title: "Kết nối ba mạch", learningObjective: "Kết hợp đếm, thêm và nhận biết hình trong chuỗi ngắn.",
    entryState: "Ba phase kế tiếp dùng mechanic đã học.", gestureLabel: "Hoàn thành từng mạch theo thứ tự", primaryGesture: "sequence", gestures: ["sequence", "drag", "tap", "keyboard"],
    objects: ["phase-strip", "collect-board", "bridge-board", "shape-board"], rules: ["Hoàn thành phase hiện tại mới mở phase sau.", "Mỗi phase ghi learning outcome riêng."],
    phaseMechanics: ["collect", "add", "shape"],
    success: "Ba phase liên kết và trạm giao cảm sáng.", softFail: "Mạch hỗ trợ trong từng phase mà không tự hoàn thành toàn bộ chặng.",
    hintLadder: ["Mỗi mạch chỉ cần một việc nhỏ.", "Theo thứ tự đếm, thêm, nhận hình.", "Mạch chỉ dẫn thao tác cuối của phase hiện tại."],
    masteryEvents: commonMasteryEvents, animationCue: "phase-chain", audioCues: ["tap", "soft-fail", "hint", "success"], exitState: "restoration",
  }),
  challenge: freezeSpec({
    id: "challenge", mechanic: "challenge", title: "Mở ba khóa ánh sáng", learningObjective: "Củng cố các kỹ năng chính trước thử thách cuối.",
    entryState: "Ba phase tái sử dụng ghép đôi, nối đường dẫn và so sánh kích thước.", gestureLabel: "Mở từng khóa bằng mechanic đã học", primaryGesture: "sequence", gestures: ["sequence", "drag", "tap", "keyboard"],
    objects: ["phase-strip", "match-lock", "path-lock", "compare-lock"], rules: ["Ba khóa mở theo thứ tự.", "Không có mất lượt hay trừ phần thưởng khi cần hint."],
    phaseMechanics: ["match", "path", "compare"],
    success: "Ba khóa mở và Hang Tia Sáng dẫn tới Boss.", softFail: "Sai trong một khóa chỉ tạo nudge cục bộ.",
    hintLadder: ["Ghép số trước, nối đường sau, so sánh hạt cuối.", "Mỗi khóa gọi lại một mechanic con đã học.", "Mạch giữ sáng thao tác cuối cần hoàn tất."],
    masteryEvents: commonMasteryEvents, animationCue: "challenge-unlock", audioCues: ["tap", "soft-fail", "hint", "success"], exitState: "restoration",
  }),
  boss: freezeSpec({
    id: "boss", mechanic: "boss", title: "Phục hồi Lõi Tri Thức", learningObjective: "Vận dụng các kỹ năng đã luyện để phục hồi Lõi Tri Thức.",
    entryState: "Ba phase boss tái sử dụng quantity, addition và pattern; không có chiến đấu.", gestureLabel: "Chữa lành Lõi qua ba phase", primaryGesture: "sequence", gestures: ["sequence", "drag", "tap", "keyboard"],
    objects: ["phase-strip", "boss-core", "restoration-light"], rules: ["Boss là chuỗi vận dụng, không phải combat.", "Mỗi phase hoàn tất giữ lại mastery event tương ứng."],
    phaseMechanics: ["collect", "add", "pattern"],
    success: "Lõi Tri Thức hồi phục, mở evolution của Nubi.", softFail: "Mạch dẫn bước cuối nếu trẻ cần; không mất máu hoặc lượt.",
    hintLadder: ["Con không cần đánh nhau; con đang trả lại ánh sáng.", "Ba phase lần lượt là đếm, cộng và quy luật.", "Mạch giữ sáng thao tác cuối của phase hiện tại."],
    masteryEvents: commonMasteryEvents, animationCue: "core-restoration", audioCues: ["tap", "soft-fail", "hint", "success", "evolution"], exitState: "evolution",
  }),
});

export const interactionSpecTypes = Object.freeze(Object.keys(INTERACTION_SPECS));

export function getInteractionSpec(mechanic) {
  return typeof mechanic === "string" ? INTERACTION_SPECS[mechanic] ?? null : null;
}

export function validateInteractionSpec(spec, { runtimeMechanics = interactionSpecTypes } = {}) {
  const errors = [];
  if (!spec || typeof spec !== "object" || Array.isArray(spec)) return { valid: false, errors: ["Spec must be an object."] };
  for (const field of REQUIRED_TEXT_FIELDS) if (typeof spec[field] !== "string" || spec[field].trim().length === 0) errors.push(`${field} must be a non-empty string.`);
  if (!runtimeMechanics.includes(spec.mechanic)) errors.push(`Unsupported mechanic: ${spec.mechanic}.`);
  for (const field of ["gestures", "objects", "rules", "hintLadder", "masteryEvents", "audioCues"]) {
    if (!Array.isArray(spec[field]) || spec[field].length === 0 || spec[field].some((value) => typeof value !== "string" || value.trim().length === 0)) errors.push(`${field} must be a non-empty string array.`);
  }
  if (!Array.isArray(spec.gestures) || spec.gestures.some((gesture) => !ALLOWED_GESTURES.has(gesture))) errors.push("gestures contains an unsupported gesture.");
  if (Array.isArray(spec.hintLadder) && spec.hintLadder.length !== 3) errors.push("hintLadder must contain exactly 3 levels.");
  if (Array.isArray(spec.gestures) && typeof spec.primaryGesture === "string" && !spec.gestures.includes(spec.primaryGesture)) errors.push("primaryGesture must be included in gestures.");
  if (spec.primaryGesture === "drag" && (!Array.isArray(spec.dropZoneIds) || spec.dropZoneIds.length === 0)) errors.push("drag specs must declare dropZoneIds.");
  return { valid: errors.length === 0, errors };
}

export function auditInteractionSpecs(nodes, registry = INTERACTION_SPECS) {
  const input = Array.isArray(nodes) ? nodes : [];
  const errors = [];
  const rows = input.map((node) => {
    const spec = registry?.[node?.type];
    if (!spec) {
      errors.push({ nodeId: node?.id ?? null, code: "SPEC_MISSING", message: `No interaction spec for mechanic ${node?.type ?? "unknown"}.` });
      return { nodeId: node?.id ?? null, mechanic: node?.type ?? null, valid: false, errors: ["SPEC_MISSING"] };
    }
    const audit = validateInteractionSpec(spec, { runtimeMechanics: Object.keys(registry) });
    for (const message of audit.errors) errors.push({ nodeId: node?.id ?? null, code: "SPEC_INVALID", message });
    return { nodeId: node?.id ?? null, mechanic: node?.type ?? null, valid: audit.valid, errors: [...audit.errors] };
  });
  return { valid: errors.length === 0, nodeCount: input.length, coveredCount: rows.filter((row) => row.valid).length, errors, nodes: rows };
}
