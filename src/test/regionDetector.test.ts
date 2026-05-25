import { describe, it, expect } from "vitest";
import { detectRegionsFromImageData } from "../workers/regionDetector.worker";

describe("Region Detector", () => {
  it("should detect a simple square region in an image", () => {
    const width = 10;
    const height = 10;
    const data = new Uint8ClampedArray(width * height * 4);
    
    // Fill with white background
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = 255;
    }

    // Draw a gray square from (2,2) to (7,7) — brightness = 128 (within detectable range 25-230)
    for (let y = 2; y <= 7; y++) {
      for (let x = 2; x <= 7; x++) {
        const idx = (y * width + x) * 4;
        data[idx] = 128;
        data[idx + 1] = 128;
        data[idx + 2] = 128;
      }
    }

    const regions = detectRegionsFromImageData(data, width, height);
    
    expect(regions).toHaveLength(1);
    expect(regions[0].minX).toBe(2);
    expect(regions[0].maxX).toBe(7);
    expect(regions[0].minY).toBe(2);
    expect(regions[0].maxY).toBe(7);
    expect(regions[0].id).toBeDefined();
  });
});
