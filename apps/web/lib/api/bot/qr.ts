import "server-only";

import { crc32, deflateSync } from "node:zlib";
import qrcode from "qrcode-generator";

const chunk = (type: string, data: Buffer) => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
};

/**
 * A QR code as a black-on-white PNG (grayscale), drawn without an image
 * library: each module `scale` pixels, with a four-module quiet zone. The
 * door's scanner reads the same `sal:ticket:<code>` as the ticket on Today.
 */
export const qrPng = (text: string, scale = 10) => {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const modules = qr.getModuleCount();
  const quiet = 4;
  const size = (modules + quiet * 2) * scale;
  const rows: Buffer[] = [];
  for (let y = 0; y < size; y += 1) {
    const row = Buffer.alloc(size + 1, 0xff);
    row[0] = 0;
    const r = Math.floor(y / scale) - quiet;
    for (let x = 0; x < size; x += 1) {
      const c = Math.floor(x / scale) - quiet;
      if (r >= 0 && c >= 0 && r < modules && c < modules && qr.isDark(r, c)) {
        row[x + 1] = 0;
      }
    }
    rows.push(row);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
};
