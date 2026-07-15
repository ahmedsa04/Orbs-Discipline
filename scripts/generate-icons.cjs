/**
 * Generate minimal solid-color PNG icons without external deps.
 */
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcBuf = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcBuf));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function png(size, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    for (let x = 0; x < size; x++) {
      const cx = x - size / 2;
      const cy = y - size / 2;
      const inCircle = cx * cx + cy * cy <= (size * 0.42) * (size * 0.42);
      const o = 1 + x * 4;
      if (inCircle) {
        row[o] = rgba[0];
        row[o + 1] = rgba[1];
        row[o + 2] = rgba[2];
        row[o + 3] = 255;
      } else {
        row[o] = 11;
        row[o + 1] = 15;
        row[o + 2] = 20;
        row[o + 3] = 255;
      }
    }
    rows.push(row);
  }
  const idat = zlib.deflateSync(Buffer.concat(rows));
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const dir = path.join(__dirname, "..", "public", "icons");
fs.mkdirSync(dir, { recursive: true });
const blue = [61, 139, 253];
fs.writeFileSync(path.join(dir, "icon-192.png"), png(192, blue));
fs.writeFileSync(path.join(dir, "icon-512.png"), png(512, blue));
fs.writeFileSync(path.join(dir, "icon-maskable-512.png"), png(512, blue));
fs.writeFileSync(path.join(dir, "apple-touch-icon.png"), png(180, blue));
console.log("Icons written to", dir);
