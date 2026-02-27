/**
 * BodyVision - AI Skin Detection
 * Canvas-based skin color analysis for body photo validation.
 * Threshold: >= 15% skin pixels = valid semi-naked photo.
 */

export function analyzeSkinContent(
  imageSrc: string
): Promise<{ isSemiNaked: boolean; skinPercentage: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve({ isSemiNaked: false, skinPercentage: 0 }); return; }
      const s = 150;
      canvas.width = s; canvas.height = s;
      ctx.drawImage(img, 0, 0, s, s);
      const d = ctx.getImageData(0, 0, s, s).data;
      let skin = 0, total = 0;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        total++;
        if (
          r > 60 && g > 40 && b > 20 &&
          r > g && r > b &&
          Math.abs(r - g) > 10 && r - b > 15 &&
          !(r > 220 && g > 210 && b > 200)
        ) skin++;
      }
      resolve({ isSemiNaked: (skin / total) * 100 >= 15, skinPercentage: (skin / total) * 100 });
    };
    img.onerror = () => resolve({ isSemiNaked: false, skinPercentage: 0 });
    img.src = imageSrc;
  });
}
