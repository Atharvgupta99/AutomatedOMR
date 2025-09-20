// src/omr/omrProcessor.ts
// TypeScript in-browser OMR processing using OpenCV.js
// Imports: none (uses global `cv` from OpenCV.js loaded in index.html)

export type Bubble = {
  x: number;
  y: number;
  r: number;
  contourIndex: number;
  filledRatio?: number; // 0..1
  isFilled?: boolean;
};

export type AnalyzeResult = {
  questions: { index: number; selected: number | null; scores: number[] }[];
  bubbles: Bubble[];
  debug?: { canvas?: HTMLCanvasElement };
};

type Options = {
  minBubbleArea?: number;
  maxBubbleArea?: number;
  fillThreshold?: number; // fraction of dark pixels inside bubble to consider filled (0..1)
  expectedOptions?: number; // number of columns/options per question (if known)
  expectedQuestions?: number; // optional expected number of questions to aid grouping
  debug?: boolean;
};

/**
 * Wait for OpenCV.js to initialize
 */
function waitForCv(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof (window as any).cv !== "undefined" && (window as any).cv && (window as any).cv.Mat) {
      resolve();
    } else {
      const interval = setInterval(() => {
        if (typeof (window as any).cv !== "undefined" && (window as any).cv && (window as any).cv.Mat) {
          clearInterval(interval);
          resolve();
        }
      }, 50);
    }
  });
}

/**
 * Helper: create HTMLImageElement from dataURL or from image element
 */
function ensureImageEl(input: HTMLImageElement | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (typeof input === "string") {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = input;
    } else {
      if (input.complete) return resolve(input);
      input.onload = () => resolve(input);
      input.onerror = (e) => reject(e);
    }
  });
}

/**
 * Main API: analyze image (HTMLImageElement or dataURL)
 */
export async function analyzeOmrImage(
  imgOrDataUrl: HTMLImageElement | string,
  opts?: Options
): Promise<AnalyzeResult> {
  await waitForCv();
  const cv: any = (window as any).cv;
  const options: Options = {
    minBubbleArea: 150, // px, tune for your scanned resolution
    maxBubbleArea: 20000,
    fillThreshold: 0.35,
    expectedOptions: undefined,
    expectedQuestions: undefined,
    debug: false,
    ...opts,
  };

  const imgEl = await ensureImageEl(imgOrDataUrl);

  // Create a canvas sized to the image
  const canvas = document.createElement("canvas");
  canvas.width = imgEl.naturalWidth || imgEl.width;
  canvas.height = imgEl.naturalHeight || imgEl.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);

  // Read into OpenCV Mat
  let src = cv.imread(canvas);
  let gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

  // Optionally improve contrast with CLAHE (adaptive histogram equalization)
  try {
    let clahe = new cv.CLAHE(2.0, new cv.Size(8, 8));
    let claheDst = new cv.Mat();
    clahe.apply(gray, claheDst);
    gray.delete();
    gray = claheDst;
    clahe.delete();
  } catch (e) {
    // if CLAHE not available, ignore
  }

  // Smooth to reduce noise
  let blurred = new cv.Mat();
  cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);

  // Adaptive threshold (works better under uneven lighting)
  let thresh = new cv.Mat();
  cv.adaptiveThreshold(
    blurred,
    thresh,
    255,
    cv.ADAPTIVE_THRESH_GAUSSIAN_C,
    cv.THRESH_BINARY_INV,
    15,
    7
  );

  // Morphology: close small gaps inside bubbles
  let kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(3, 3));
  let closed = new cv.Mat();
  cv.morphologyEx(thresh, closed, cv.MORPH_CLOSE, kernel);

  // Find contours (external)
  let contours = new cv.MatVector();
  let hierarchy = new cv.Mat();
  cv.findContours(closed, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

  const bubbles: Bubble[] = [];

  // Filter contours by area and circularity, compute minEnclosingCircle
  for (let i = 0; i < contours.size(); i++) {
    let cnt = contours.get(i);
    const area = cv.contourArea(cnt);
    if (area < options.minBubbleArea! || area > options.maxBubbleArea!) {
      cnt.delete();
      continue;
    }
    // Compute circularity: 4π*area / perimeter^2 (1.0 = perfect circle)
    const perim = cv.arcLength(cnt, true);
    const circularity = perim > 0 ? (4 * Math.PI * area) / (perim * perim) : 0;
    // Accept somewhat circular shapes (>0.45)
    if (circularity < 0.35) {
      cnt.delete();
      continue;
    }
    const circle = cv.minEnclosingCircle(cnt);
    const center = circle.center;
    const radius = circle.radius;
    bubbles.push({ x: center.x, y: center.y, r: radius, contourIndex: i });
    cnt.delete();
  }

  // If too few bubbles found, try a relaxed pass (larger max area or lower circularity)
  if (bubbles.length < 10) {
    for (let i = 0; i < contours.size(); i++) {
      let cnt = contours.get(i);
      const area = cv.contourArea(cnt);
      if (area < options.minBubbleArea! * 0.6 || area > options.maxBubbleArea! * 2) {
        cnt.delete();
        continue;
      }
      const perim = cv.arcLength(cnt, true);
      const circularity = perim > 0 ? (4 * Math.PI * area) / (perim * perim) : 0;
      if (circularity < 0.28) {
        cnt.delete();
        continue;
      }
      const circle = cv.minEnclosingCircle(cnt);
      const center = circle.center;
      const radius = circle.radius;
      // avoid duplicates (close centers)
      const nearby = bubbles.find((b) => Math.hypot(b.x - center.x, b.y - center.y) < Math.max(5, radius * 0.6));
      if (!nearby) bubbles.push({ x: center.x, y: center.y, r: radius, contourIndex: i });
      cnt.delete();
    }
  }

  // Compute filled ratio for each detected bubble by creating circular mask and sampling
  // We'll operate on the 'gray' or 'blurred' image to compute pixel darkness
  // First make sure 'thresh' is available: closed is inverted binary (white bubbles if filled)
  const filledBubbles: Bubble[] = [];
  for (let i = 0; i < bubbles.length; i++) {
    const b = bubbles[i];
    // Create mask
    let mask = new cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC1);
    cv.circle(mask, new cv.Point(Math.round(b.x), Math.round(b.y)), Math.max(1, Math.round(b.r * 0.8)), new cv.Scalar(255), -1);

    // Count dark pixels inside mask from the blurred grayscale
    let masked = new cv.Mat();
    cv.bitwise_and(blurred, blurred, masked, mask);

    // Convert masked to binary by thresholding low intensities
    let tmp = new cv.Mat();
    cv.threshold(masked, tmp, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);

    // Count non-zero (light) vs zero (dark) inside mask area
    const totalMask = cv.countNonZero(mask); // pixels inside circle
    const whiteInside = cv.countNonZero(tmp);
    const darkInside = totalMask - whiteInside;
    const filledRatio = totalMask > 0 ? darkInside / totalMask : 0;

    b.filledRatio = filledRatio;
    b.isFilled = filledRatio >= (options.fillThreshold ?? 0.35);

    mask.delete();
    masked.delete();
    tmp.delete();

    filledBubbles.push(b);
  }

  // Group bubbles into rows (questions) by clustering on Y coordinate
  // We'll sort by y, then form rows by distance threshold
  filledBubbles.sort((a, b) => a.y - b.y || a.x - b.x);

  const rows: Bubble[][] = [];
  const rowTolerance = Math.max(8, Math.round((src.rows / 200))); // adapt to resolution
  for (const bub of filledBubbles) {
    if (rows.length === 0) {
      rows.push([bub]);
      continue;
    }
    const lastRow = rows[rows.length - 1];
    const avgY = lastRow.reduce((s, x) => s + x.y, 0) / lastRow.length;
    if (Math.abs(bub.y - avgY) <= rowTolerance) lastRow.push(bub);
    else rows.push([bub]);
  }

  // For each row sort by x (left->right). If expectedOptions is provided, pick top expectedOptions per row
  const questions: { index: number; selected: number | null; scores: number[] }[] = [];
  for (let qi = 0; qi < rows.length; qi++) {
    const row = rows[qi].slice().sort((a, b) => a.x - b.x);
    // If expectedOptions provided, ensure exactly that many by merging/choosing
    let optionsInRow = row;
    if (options.expectedOptions && row.length > options.expectedOptions) {
      // Merge closest centers to form expectedOptions clusters
      // Simple method: split into equal groups
      const groups: Bubble[][] = Array.from({ length: options.expectedOptions }, () => []);
      for (let i = 0; i < row.length; i++) {
        groups[Math.floor((i * options.expectedOptions) / row.length)].push(row[i]);
      }
      optionsInRow = groups.map((g) =>
        g.reduce((acc, cur) => ({ ...acc, x: acc.x + cur.x, y: acc.y + cur.y, r: acc.r + cur.r, filledRatio: (acc.filledRatio ?? 0) + (cur.filledRatio ?? 0) }), { x: 0, y: 0, r: 0, filledRatio: 0 } as any)
      ).map((agg, idx) => ({
        x: agg.x / groups[idx].length,
        y: agg.y / groups[idx].length,
        r: agg.r / groups[idx].length,
        filledRatio: agg.filledRatio / groups[idx].length,
        isFilled: agg.filledRatio / groups[idx].length >= (options.fillThreshold ?? 0.35),
        contourIndex: -1,
      })) as Bubble[];
    }

    const scores = optionsInRow.map((b) => b.filledRatio ?? 0);
    // choose option with max score only if it exceeds fill threshold
    let maxIdx = -1;
    let maxScore = -1;
    for (let i = 0; i < scores.length; i++) {
      if (scores[i] > maxScore) {
        maxScore = scores[i];
        maxIdx = i;
      }
    }
    const selected = maxScore >= (options.fillThreshold ?? 0.35) ? maxIdx : null;
    questions.push({ index: qi + 1, selected, scores });
  }

  // Clean up mats
  src.delete();
  gray.delete();
  blurred.delete();
  thresh.delete();
  closed.delete();
  contours.delete();
  hierarchy.delete();
  kernel.delete();

  const result: AnalyzeResult = { questions, bubbles: filledBubbles };
  if (options.debug) {
    result.debug = { canvas: drawDebugCanvas(imgEl, filledBubbles, questions) };
  }
  return result;
}

/**
 * Draw debug overlay canvas: draws detected bubbles and fills
 */
export function drawDebugCanvas(img: HTMLImageElement | string, bubbles: Bubble[], questions?: { index: number; selected: number | null; scores: number[] }[]) {
  const imageEl = typeof img === "string" ? new Image() : img;
  if (typeof img === "string") imageEl.src = img;
  const canvas = document.createElement("canvas");
  canvas.width = (imageEl as HTMLImageElement).naturalWidth || (imageEl as HTMLImageElement).width || 1000;
  canvas.height = (imageEl as HTMLImageElement).naturalHeight || (imageEl as HTMLImageElement).height || 1000;
  const ctx = canvas.getContext("2d")!;
  if (typeof img !== "string") ctx.drawImage(imageEl as HTMLImageElement, 0, 0, canvas.width, canvas.height);
  // If string, image might not be loaded; user should draw original image to canvas first for correct overlay.
  ctx.lineWidth = 2;
  for (let i = 0; i < bubbles.length; i++) {
    const b = bubbles[i];
    ctx.beginPath();
    ctx.strokeStyle = b.isFilled ? "lime" : "red";
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,0,0.2)";
    ctx.fillRect(b.x - 2, b.y - 2, 4, 4);
    // label
    ctx.fillStyle = "white";
    ctx.font = "12px Arial";
    ctx.fillText((b.filledRatio ?? 0).toFixed(2), b.x + b.r + 4, b.y + 4);
  }
  return canvas;
}
