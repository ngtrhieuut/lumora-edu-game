import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const srcDir = path.dirname(fileURLToPath(import.meta.url));
const assetPath = (name) => path.resolve(srcDir, "..", "public", "assets", name);

function paethPredictor(left, above, upperLeft) {
  const estimate = left + above - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const aboveDistance = Math.abs(estimate - above);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) return left;
  if (aboveDistance <= upperLeftDistance) return above;
  return upperLeft;
}

function readPng(name) {
  const bytes = fs.readFileSync(assetPath(name));
  assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], `${name} must be a PNG`);
  let offset = 8;
  let header = null;
  const idat = [];
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const data = bytes.subarray(dataStart, dataEnd);
    if (type === "IHDR") {
      header = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data[8],
        colorType: data[9],
        interlace: data[12],
      };
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    offset = dataEnd + 4;
  }

  assert.ok(header, `${name} must include an IHDR chunk`);
  assert.equal(header.bitDepth, 8, `${name} must use 8-bit channels`);
  assert.equal(header.colorType, 6, `${name} must be RGBA`);
  assert.equal(header.interlace, 0, `${name} must be non-interlaced for the asset regression check`);

  const stride = header.width * 4;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const pixels = Buffer.alloc(header.height * stride);
  for (let y = 0; y < header.height; y += 1) {
    const rawRowStart = y * (stride + 1);
    const pixelRowStart = y * stride;
    const filter = raw[rawRowStart];
    const previousRowStart = pixelRowStart - stride;
    for (let x = 0; x < stride; x += 1) {
      const left = x >= 4 ? pixels[pixelRowStart + x - 4] : 0;
      const above = y > 0 ? pixels[previousRowStart + x] : 0;
      const upperLeft = y > 0 && x >= 4 ? pixels[previousRowStart + x - 4] : 0;
      const source = raw[rawRowStart + 1 + x];
      let value = source;
      if (filter === 1) value += left;
      else if (filter === 2) value += above;
      else if (filter === 3) value += Math.floor((left + above) / 2);
      else if (filter === 4) value += paethPredictor(left, above, upperLeft);
      else assert.equal(filter, 0, `${name} uses an unsupported PNG filter`);
      pixels[pixelRowStart + x] = value & 0xff;
    }
  }

  let transparentPixels = 0;
  let visiblePixels = 0;
  let minX = header.width;
  let minY = header.height;
  let maxX = -1;
  let maxY = -1;
  for (let index = 3; index < pixels.length; index += 4) {
    const alpha = pixels[index];
    const pixel = Math.floor(index / 4);
    const x = pixel % header.width;
    const y = Math.floor(pixel / header.width);
    if (alpha === 0) transparentPixels += 1;
    if (alpha > 16) {
      visiblePixels += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  return {
    ...header,
    transparentPixels,
    visiblePixels,
    visibleBounds: { minX, minY, maxX, maxY },
    alphaAt(x, y) {
      return pixels[(y * header.width + x) * 4 + 3];
    },
  };
}

test("runtime Nubi sprites keep an alpha channel and valid dimensions", () => {
  for (const name of ["nubi-transparent-v3.png", "nubi-evolved-v2.png"]) {
    const image = readPng(name);
    assert.ok(image.width > 0 && image.height > 0, `${name} must have usable dimensions`);
    assert.equal(image.alphaAt(0, 0), 0, `${name} top-left corner must be transparent`);
    assert.equal(image.alphaAt(image.width - 1, 0), 0, `${name} top-right corner must be transparent`);
    assert.equal(image.alphaAt(0, image.height - 1), 0, `${name} bottom-left corner must be transparent`);
    assert.equal(image.alphaAt(image.width - 1, image.height - 1), 0, `${name} bottom-right corner must be transparent`);
    assert.ok(image.transparentPixels / (image.width * image.height) > 0.1, `${name} must retain a transparent canvas around Nubi`);
  }
});

test("runtime Nubi sprites preserve an isolated cutout margin", () => {
  for (const name of ["nubi-transparent-v3.png", "nubi-evolved-v2.png"]) {
    const image = readPng(name);
    const { minX, minY, maxX, maxY } = image.visibleBounds;
    assert.ok(image.visiblePixels > 0, `${name} must contain visible Nubi pixels`);
    assert.ok(minX > 0 && minY > 0, `${name} must not touch the top or left canvas edge`);
    assert.ok(maxX < image.width - 1 && maxY < image.height - 1, `${name} must not touch the bottom or right canvas edge`);
    assert.ok(minX / image.width > 0.005, `${name} needs a visible left cutout margin`);
    assert.ok((image.width - 1 - maxX) / image.width > 0.005, `${name} needs a visible right cutout margin`);
    assert.ok(minY / image.height > 0.005, `${name} needs a visible top cutout margin`);
    assert.ok((image.height - 1 - maxY) / image.height > 0.005, `${name} needs a visible bottom cutout margin`);
  }
});

test("the runtime evolution registry does not point at the flattened hero concept asset", () => {
  const gameData = fs.readFileSync(path.resolve(srcDir, "gameData.js"), "utf8");
  assert.match(gameData, /nubi-transparent-v3\.png/);
  assert.match(gameData, /nubi-evolved-v2\.png/);
  assert.doesNotMatch(gameData, /nubi-hero-v2\.png/);
});
