export interface ModalResult {
  action: 'close' | 'share' | 'restart' | 'screenshot';
  data?: any;
}

export function showCompletionModal(
  durationMinutes: number,
  screenshotDataUrl?: string
): Promise<ModalResult> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const content = document.createElement('div');
    content.className = 'modal-content';

    const mins = Math.floor(durationMinutes);
    const secs = Math.round((durationMinutes - mins) * 60);

    content.innerHTML = `
      <div style="font-size: 48px; margin-bottom: 16px;">🪷</div>
      <h2 class="modal-title">圆满成就</h2>
      <p class="modal-subtitle">
        已完成 ${mins}${secs > 0 ? `分${secs}秒` : '分钟'} 禅修
      </p>
      <div style="
        padding: 24px;
        background: rgba(255,255,255,0.03);
        border-radius: 16px;
        margin: 24px 0;
        border: 1px solid rgba(255,255,255,0.05);
      ">
        <p style="
          font-size: 15px;
          line-height: 2;
          color: rgba(255,255,255,0.8);
          font-style: italic;
          letter-spacing: 0.05em;
        ">
          一念心清净，莲花处处开。<br/>
          愿以此功德，普及于一切。
        </p>
      </div>
      <div class="modal-actions">
        <button class="btn-modal" data-action="restart">再次冥想</button>
        <button class="btn-modal" data-action="screenshot">保存截图</button>
        <button class="btn-modal primary" data-action="close">完成</button>
      </div>
    `;

    overlay.appendChild(content);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cleanup();
        resolve({ action: 'close' });
      }
    });

    content.querySelectorAll('.btn-modal').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = (btn as HTMLElement).dataset.action as ModalResult['action'];
        if (action === 'screenshot' && screenshotDataUrl) {
          downloadDataUrl(screenshotDataUrl, `lotus-meditation-${Date.now()}.png`);
        }
        cleanup();
        resolve({ action, data: screenshotDataUrl });
      });
    });

    function cleanup(): void {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    }
  });
}

export function showScreenshotModal(dataUrl: string): Promise<ModalResult> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const content = document.createElement('div');
    content.className = 'modal-content screenshot-modal';

    content.innerHTML = `
      <h2 class="modal-title">分享截图</h2>
      <p class="modal-subtitle">保存或分享您的冥想时刻</p>
      <img src="${dataUrl}" alt="冥想截图" style="max-height: 300px; object-fit: contain;"/>
      <div class="modal-actions">
        <button class="btn-modal" data-action="close">关闭</button>
        <button class="btn-modal primary" data-action="share">下载图片</button>
      </div>
    `;

    overlay.appendChild(content);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cleanup();
        resolve({ action: 'close' });
      }
    });

    content.querySelectorAll('.btn-modal').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = (btn as HTMLElement).dataset.action as ModalResult['action'];
        if (action === 'share') {
          downloadDataUrl(dataUrl, `lotus-meditation-${Date.now()}.png`);
        }
        cleanup();
        resolve({ action, data: dataUrl });
      });
    });

    function cleanup(): void {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    }
  });
}

function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
