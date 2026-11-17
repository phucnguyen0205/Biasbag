import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export const runtime = "nodejs";

/** Favicon được sinh động từ file logo BIAS BAG trong thư mục public. */
export default async function Icon() {
  let logo: ArrayBuffer | null = null;
  try {
    const buf = await readFile(
      path.join(process.cwd(), "public", "logo.png"),
    );
    logo = buf.buffer.slice(
      buf.byteOffset,
      buf.byteOffset + buf.byteLength,
    ) as ArrayBuffer;
  } catch {
    logo = null;
  }

  if (!logo) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#1f2937",
            color: "#ffffff",
            fontSize: 20,
            fontWeight: 700,
          }}
        >
          B
        </div>
      ),
      { ...size },
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          borderRadius: "6px",
        }}
      >
        <img
          alt="BIAS BAG"
          src={`data:image/png;base64,${Buffer.from(logo).toString("base64")}`}
          width={26}
          height={26}
          style={{ objectFit: "contain" }}
        />
      </div>
    ),
    { ...size },
  );
}
