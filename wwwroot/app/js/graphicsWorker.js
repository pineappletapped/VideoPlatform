import { renderSocialImage } from './graphicsEngine.js';

self.onmessage = async (e) => {
  const { id, opts } = e.data;
  try {
    const blob = await renderSocialImage(opts);
    const buf = await blob.arrayBuffer();
    self.postMessage({ id, buf }, [buf]);
  } catch (err) {
    self.postMessage({ id, error: err.message });
  }
};
