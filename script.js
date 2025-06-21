//—— 共用 TTS 函式 ——
function speak(text, lang = 'en-US') {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = lang;
  window.speechSynthesis.speak(utt);
}

//—— 模式切換 ——
const modeSelection = document.getElementById('mode-selection');
const typingBox     = document.getElementById('typing-container');
const pronounceBox  = document.getElementById('pronounce-container');

document.getElementById('typing-mode-btn').onclick = () => {
  modeSelection.style.display = 'none';
  typingBox.style.display     = 'block';
  initTypingMode();
};
document.getElementById('pronounce-mode-btn').onclick = () => {
  modeSelection.style.display  = 'none';
  pronounceBox.style.display   = 'block';
  initPronounceMode();
};

//—— 英打＋記憶測驗 模式 ——
function initTypingMode() {
  /* ...（此處保留你原本的 initTypingMode 實作）... */
}

function initPronounceMode() {
  const wordEl   = document.getElementById('pronounce-word-display');
  const resultEl = document.getElementById('pronounce-result');
  const startBtn = document.getElementById('start-rec-btn');
  const stopBtn  = document.getElementById('stop-rec-btn');

  let audioCtx, analyser, dataArray, rafId;
  let targetWordObj;

  // 建立音量表
  const meterContainer = document.createElement('div');
  meterContainer.style.cssText =
    'margin-top:10px;width:100%;height:8px;background:#eee;border-radius:4px;overflow:hidden;';
  const meterLevel = document.createElement('div');
  meterLevel.style.cssText = 'width:0;height:100%;background:#4a69bd;';
  meterContainer.appendChild(meterLevel);
  stopBtn.parentNode.insertBefore(meterContainer, stopBtn.nextSibling);

  // 隨機取單字並 TTS
  function pickWord() {
    targetWordObj = words[Math.floor(Math.random() * words.length)];
    wordEl.innerHTML = `
      <div style="font-size:2rem;font-weight:bold;">${targetWordObj.word}</div>
      <div class="phonetic" style="font-size:1.4rem;color:#555;">
        ${targetWordObj.phonetic || ''}
      </div>
    `;
    resultEl.textContent = '';
    meterLevel.style.width = '0';
    setTimeout(() => speak(targetWordObj.word), 300);
  }
  pickWord();

  // 檢查支援度
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    resultEl.textContent = '❌ 此瀏覽器不支援語音辨識';
    startBtn.disabled = true;
    return;
  }
  const recog = new SpeechRec();
  recog.lang = 'en-US';
  recog.interimResults = false;
  recog.maxAlternatives = 1;

  // 開始錄音
  startBtn.onclick = () => {
    resultEl.textContent = '';
    if (!navigator.mediaDevices?.getUserMedia) {
      resultEl.textContent = '❌ 此瀏覽器不支援麥克風存取';
      return;
    }
    startBtn.disabled = true;
    resultEl.textContent = '請允許麥克風…';
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        resultEl.textContent = '錄音中⋯ 請跟讀單字';
        stopBtn.disabled = false;

        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        source.connect(analyser);

        (function drawMeter() {
          analyser.getByteTimeDomainData(dataArray);
          let sum = 0;
          dataArray.forEach(v => sum += (v - 128) ** 2);
          const rms = Math.sqrt(sum / dataArray.length);
          meterLevel.style.width = `${Math.min(1, rms / 128) * 100}%`;
          rafId = requestAnimationFrame(drawMeter);
        })();

        recog.start();
      })
      .catch(err => {
        console.error(err);
        startBtn.disabled = false;
        resultEl.textContent =
          err.name === 'NotAllowedError'
            ? '❌ 權限被拒絕，請允許麥克風'
            : `❌ 取用麥克風失敗：${err.name}`;
      });
  };

  // 停止錄音
  stopBtn.onclick = () => {
    recog.stop();
    stopBtn.disabled = true;
    cancelAnimationFrame(rafId);
    if (audioCtx) audioCtx.close();
    meterLevel.style.width = '0';
  };

  // 辨識結果
  recog.onresult = e => {
    const spoken = e.results[0][0].transcript.trim().toLowerCase();
    const target = targetWordObj.word.toLowerCase();
    if (spoken === target) {
      resultEl.innerHTML = `✅ 發音正確！<br><em>${spoken}</em>`;
      setTimeout(pickWord, 1000);
    } else {
      resultEl.innerHTML = `❌ 發音不符，請再試一次<br><em>${spoken}</em>`;
    }
  };

  // 辨識錯誤
  recog.onerror = ev => {
    console.error('SpeechRec error', ev.error);
    resultEl.textContent =
      ev.error === 'language-not-supported'
        ? '⚠️ 不支援此語言，請更換瀏覽器'
        : `⚠️ 辨識錯誤：${ev.error}`;
  };

  // —— 新增：辨識結束後顯示停止提示 ——  
  recog.onend = () => {
    startBtn.disabled = false;
    stopBtn.disabled  = true;
    resultEl.textContent = '🔇 錄音已停止，您可以再試一次或按「開始錄音」';
  };
}
