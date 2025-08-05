import { SOCIAL_TEMPLATES } from './templates/socialTemplates.js';

const IMG_CACHE = new Map();

export async function renderSocialImage({ templateStyle, aspect, data, size, options = {} }) {
  const [w, h] = size;
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d');
  const nodes = SOCIAL_TEMPLATES[templateStyle]?.[aspect] || [];
  for (const node of nodes) {
    await drawNode(ctx, node, data, w, h, options);
  }
  return await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 });
}

async function drawNode(ctx, node, data, w, h, options) {
  if (node.mask) {
    ctx.save();
    await drawNode(ctx, node.mask, data, w, h, options);
    ctx.globalCompositeOperation = 'source-in';
    const copy = { ...node };
    delete copy.mask;
    await drawNode(ctx, copy, data, w, h, options);
    ctx.restore();
    return;
  }
  const x = (node.x || 0) * w;
  const y = (node.y || 0) * h;
  const width = (node.w || 1) * w;
  const height = (node.h || 1) * h;
  switch (node.type) {
    case 'rect':
      ctx.fillStyle = node.color || '#000';
      ctx.fillRect(x, y, width, height);
      break;
    case 'image':
      const src = resolve(node.src, data);
      if (!src) break;
      const img = await loadImage(src, options?.ignoreMissing);
      if (!img) break;
      let dw = width, dh = height;
      if (node.mode === 'cover' || node.mode === 'contain') {
        const ratio = img.width / img.height;
        const target = width / height;
        if ((ratio > target) === (node.mode === 'contain')) {
          dh = height;
          dw = height * ratio;
        } else {
          dw = width;
          dh = width / ratio;
        }
      }
      const dx = x + (width - dw) / 2;
      const dy = y + (height - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);
      break;
    case 'text':
    case 'textFit':
      const text = resolve(node.text, data);
      let fontSize = node.fontSize || 40;
      if (node.type === 'textFit') {
        do {
          ctx.font = `${fontSize}px ${node.font || 'sans-serif'}`;
          if (ctx.measureText(text).width <= width) break;
          fontSize -= 2;
        } while (fontSize > 10);
      } else {
        ctx.font = node.font || `${fontSize}px sans-serif`;
      }
      ctx.fillStyle = node.color || '#000';
      ctx.textAlign = node.align || 'left';
      ctx.textBaseline = 'middle';
      const tx = node.align === 'center' ? x + width / 2 : x;
      ctx.fillText(text, tx, y + height / 2, width);
      break;
  }
}

function resolve(val, data) {
  return data[val] || val;
}

function loadImage(src, ignoreMissing) {
  if (!IMG_CACHE.has(src)) {
    IMG_CACHE.set(src, new Promise((res, rej) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => res(img);
      img.onerror = () => ignoreMissing ? res(null) : rej(new Error(`missing:${src}`));
      img.src = src;
    }));
  }
  return IMG_CACHE.get(src);
}
