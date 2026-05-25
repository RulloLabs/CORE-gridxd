import { describe, it, expect } from "vitest";
import { extractIconsFromRegions } from "../hooks/useImageProcessor";

const OPTIONS = {
  removeBackground: false,
  upscale: false,
  projectName: "test",
};

describe("Extract Icons", () => {
  it("should return an empty array when no regions are provided", async () => {
    const imgEl = document.createElement("img");
    imgEl.width = 100;
    imgEl.height = 100;
    
    const result = await extractIconsFromRegions(imgEl, [], OPTIONS);
    expect(result).toEqual([]);
  });

  it.skip("should extract icons based on regions", async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 100, 100);
    const dataUrl = canvas.toDataURL("image/png");

    const imgEl = document.createElement("img");
    imgEl.src = dataUrl;
    
    await new Promise((resolve) => {
      imgEl.onload = resolve;
      setTimeout(resolve, 50); 
    });

    const regions = [
      { id: "region-1", minX: 10, minY: 10, maxX: 50, maxY: 50 },
    ];

    const result = await extractIconsFromRegions(imgEl, regions, OPTIONS);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBeDefined();
    expect(result[0].dataUrl).toContain("data:image/png;base64,");
  });
});
