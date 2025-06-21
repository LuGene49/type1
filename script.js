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
  const wordEl     = document.getElementById("word-display");
  const phoneticEl = document.getElementById("phonetic-display");
  const meaningEl  = document.getElementById("meaning");
  const exampleEl  = document.getElementById("example");
  const inputEl    = document.getElementById("typing-input");
  const fbEl       = document.getElementById("feedback");
  const scoreEl    = document.querySelector("#score span");

  let currentWord = null,
      score       = 0,
      practiceCnt = 0;
  const practicedList = [];

  loadNext();
  inputEl.addEventListener("input", checkInput);

  function loadNext() {
    const idx = Math.floor(Math.random() * words.length);
    currentWord = words[idx];
    wordEl.textContent     = currentWord.word;
    phoneticEl.textContent = currentWord.phonetic || "";
    meaningEl.textContent  = currentWord.meaning;
    exampleEl.textContent  = currentWord.example;
    inputEl.value    = "";
    fbEl.textContent = "";
    inputEl.focus();
    speak(currentWord.word);

    if (!practicedList.some(w => w.word === currentWord.word)) {
      practicedList.push(currentWord);
    }
  }

  function checkInput() {
    const val    = inputEl.value.trim().toLowerCase();
    const target = currentWord.word.toLowerCase();
    if (val === target) {
      fbEl.textContent   = "✅ 正確！";
      fbEl.style.color   = "green";
      scoreEl.textContent = ++score;
      practiceCnt++;
      if (!maybeMemoryTest()) {
        setTimeout(loadNext, 800);
      }
    }
    else if (target.startsWith(val)) {
      fbEl.textContent = "";
    }
    else {
      fbEl.textContent = "❌ 拼寫錯誤";
      fbEl.style.color = "red";
    }
  }

  function maybeMemoryTest() {
    if (practiceCnt >= 20 && Math.random() < 0.2) {
      practiceCnt = 0;
      showMemoryTest(practicedList);
      practicedList.length = 0;
      return true;
    }
    return false;
  }

  function showMemoryTest(pool) {
    const idx = Math.floor(Math.random() * pool.length);
    const target = pool[idx];
    speak("");

    const modal = document.createElement("div");
    modal.id = "memory-test";
    modal.innerHTML = `
      <div class="test-content">
        <h3>記憶測驗</h3>
        <p>請輸入英文單字：<br><strong>${target.meaning}</strong></p>
        <input id="test-answer" type="text" placeholder="請輸入英文單字..." />
        <div id="test-feedback"></div>
      </div>
    `;
    document.body.appendChild(modal);

    const ansEl = modal.querySelector("#test-answer");
    const tfbEl = modal.querySelector("#test-feedback");
    ansEl.focus();
    ansEl.addEventListener("blur", () => setTimeout(() => ansEl.focus(), 0));

    ansEl.addEventListener("keyup", e => {
      if (e.key === "Enter") {
        const v = ansEl.value.trim().toLowerCase();
        if (v === target.word.toLowerCase()) {
          tfbEl.textContent = "✅ 答對了！";
          tfbEl.style.color = "green";
          setTimeout(close, 1200);
        } else {
          tfbEl.textContent = "❌ 再試一次或按 Esc 跳過";
          tfbEl.style.color = "red";
        }
      }
      if (e.key === "Escape") close();
    });

    function close() {
      const m = document.getElementById("memory-test");
      if (m) m.remove();
      loadNext();
    }
  }
}

//—— 發音錄音檢測 模式 ——
function initPronounceMode() {
  const wordEl   = document.getElementById('pronounce-word-display');
  const resultEl = document.getElementById('pronounce-result');
  const startBtn = document.getElementById('start-rec-btn');
  const stopBtn  = document.getElementById('stop-rec-btn');
  let audioCtx, analyser, dataArray, rafId;
  let targetObj;

  // 建立音量表
  const meterContainer = document.createElement('div');
  meterContainer.style.cssText =
    'margin-top:10px;width:100%;height:8px;background:#eee;border-radius:4px;overflow:hidden;';
  const meterLevel = document.createElement('div');
  meterLevel.style.cssText = 'width:0;height:100%;background:#4a69bd;';
  meterContainer.appendChild(meterLevel);
  stopBtn.parentNode.insertBefore(meterContainer, stopBtn.nextSibling);

  // 換題並 TTS
  function pickWord() {
    targetObj = words[Math.floor(Math.random() * words.length)];
    const phon = targetObj.phonetic || '';
    wordEl.innerHTML = `
      <div style="font-size:2rem;font-weight:bold;">${targetObj.word}</div>
      <div class="phonetic" style="font-size:1.4rem;color:#555;">${phon}</div>
    `;
    resultEl.textContent = '';
    meterLevel.style.width = '0';
    setTimeout(() => speak(targetObj.word), 300);
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
          dataArray.forEach(d => sum += (d - 128) ** 2);
          const rms = Math.sqrt(sum / dataArray.length);
          meterLevel.style.width = `${Math.min(1, rms/128) * 100}%`;
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

  stopBtn.onclick = () => {
    recog.stop();
    stopBtn.disabled = true;
    cancelAnimationFrame(rafId);
    if (audioCtx) audioCtx.close();
    meterLevel.style.width = '0';
  };

  recog.onresult = e => {
    const spoken = e.results[0][0].transcript.trim().toLowerCase();
    const target = targetObj.word.toLowerCase();
    if (spoken === target) {
      resultEl.innerHTML = `✅ 發音正確！<br><em>${spoken}</em>`;
      setTimeout(pickWord, 1000);
    } else {
      resultEl.innerHTML = `❌ 發音不符，請再試一次<br><em>${spoken}</em>`;
    }
  };

  recog.onerror = ev => {
    console.error('SpeechRec error', ev.error);
    resultEl.textContent =
      ev.error === 'language-not-supported'
        ? '⚠️ 不支援此語言，請更換瀏覽器'
        : `⚠️ 辨識錯誤：${ev.error}`;
  };

  // 停止錄音、辨識結束後顯示提示
  recog.onend = () => {
    startBtn.disabled = false;
    stopBtn.disabled  = true;
    resultEl.textContent = '🔇 錄音已停止，您可以再試一次或按「開始錄音」';
  };
}
  // 辨識結果處理
  recog.onresult = e => {
    const spoken = e.results[0][0].transcript.trim().toLowerCase();
    const target = targetObj.word.toLowerCase();
    if (spoken === target) {
      resultEl.innerHTML = `✅ 發音正確！<br><em>${spoken}</em>`;
      setTimeout(pickWord, 1000);
    } else {
      resultEl.innerHTML = `❌ 發音不符，請再試一次<br><em>${spoken}</em>`;
    }
  };

  // 辨識錯誤處理
  recog.onerror = ev => {
    console.error('SpeechRec error', ev.error);
    resultEl.textContent =
      ev.error === 'language-not-supported'
        ? '⚠️ 不支援此語言，請更換瀏覽器'
        : `⚠️ 辨識錯誤：${ev.error}`;
  };

  // 停止錄音、辨識結束後顯示提示
  recog.onend = () => {
    startBtn.disabled = false;
    stopBtn.disabled  = true;
    resultEl.textContent = '🔇 錄音已停止，您可以再試一次或按「開始錄音」';
  };

} // end of initPronounceMode()
