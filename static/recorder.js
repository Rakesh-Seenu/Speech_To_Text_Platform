// // static/recorder.js
// let mediaRecorder;
// let audioChunks = [];

// const startBtn = document.getElementById("startBtn");
// const stopBtn = document.getElementById("stopBtn");
// const recStatus = document.getElementById("recStatus");
// const uploadBtn = document.getElementById("uploadBtn");
// const fileInput = document.getElementById("fileInput");
// const segmentsDiv = document.getElementById("segments");
// const apiKeyInput = document.getElementById("apiKeyInput");
// const saveApiKeyBtn = document.getElementById("saveApiKey");
// const showApiKeyBtn = document.getElementById("showApiKey");

// // Check API key status on load
// async function checkApiKeyStatus() {
//   try {
//     const response = await fetch('/api/config');
//     const data = await response.json();
//     if (data.has_api_key) {
//       apiKeyInput.value = data.api_key;
//       apiKeyInput.type = 'password';
//       updateUIWithApiKey();
//     }
//   } catch (error) {
//     console.error('Error checking API key status:', error);
//   }
// }

// // Save API key
// saveApiKeyBtn.addEventListener('click', async () => {
//   const apiKey = apiKeyInput.value.trim();
//   if (!apiKey) {
//     alert('Please enter an API key');
//     return;
//   }

//   try {
//     const response = await fetch('/api/config', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({ api_key: apiKey })
//     });

//     const data = await response.json();
//     if (response.ok) {
//       alert('API key saved successfully!');
//       updateUIWithApiKey();
//     } else {
//       alert(data.error || 'Failed to save API key');
//     }
//   } catch (error) {
//     console.error('Error saving API key:', error);
//     alert('Failed to save API key. Please try again.');
//   }
// });

// // Toggle API key visibility
// showApiKeyBtn.addEventListener('click', () => {
//   if (apiKeyInput.type === 'password') {
//     apiKeyInput.type = 'text';
//     showApiKeyBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
//   } else {
//     apiKeyInput.type = 'password';
//     showApiKeyBtn.innerHTML = '<i class="fas fa-eye"></i>';
//   }
// });

// // Update UI elements when API key is configured
// function updateUIWithApiKey() {
//   startBtn.disabled = false;
//   uploadBtn.disabled = false;
//   saveApiKeyBtn.innerHTML = '<i class="fas fa-check"></i> API Key Saved';
//   saveApiKeyBtn.classList.add('success');
// }

// // Initialize on page load
// checkApiKeyStatus();

// startBtn.addEventListener("click", async () => {
//   if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
//     alert("getUserMedia not supported in this browser.");
//     return;
//   }
//   try {
//     const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
//     mediaRecorder = new MediaRecorder(stream);
//     audioChunks = [];

//     mediaRecorder.ondataavailable = (e) => {
//       if (e.data && e.data.size > 0) audioChunks.push(e.data);
//     };

//     mediaRecorder.onstart = () => {
//       recStatus.textContent = "Recording...";
//       recStatus.className = "status recording";
//       startBtn.disabled = true;
//       stopBtn.disabled = false;
//       startBtn.innerHTML = '<i class="fas fa-microphone"></i> Recording...';
//     };

//     mediaRecorder.onstop = async () => {
//       recStatus.textContent = "Processing...";
//       recStatus.className = "status";
//       startBtn.disabled = false;
//       stopBtn.disabled = true;
//       startBtn.innerHTML = '<i class="fas fa-microphone"></i> Start Recording';

//       const blob = new Blob(audioChunks, { type: "audio/webm" });
//       // auto-upload after stop
//       await uploadBlob(blob, "recording.webm");
//     };

//     mediaRecorder.start();
//   } catch (err) {
//     console.error(err);
//     alert("Could not start microphone: " + err.message);
//   }
// });

// stopBtn.addEventListener("click", () => {
//   if (mediaRecorder && mediaRecorder.state !== "inactive") {
//     mediaRecorder.stop();
//   }
// });

// uploadBtn.addEventListener("click", async () => {
//   const file = fileInput.files[0];
//   if (!file) {
//     alert("Please pick a file first.");
//     return;
//   }
//   await uploadFile(file);
// });

// async function uploadFile(file) {
//   await uploadBlob(file, file.name);
// }

// async function uploadBlob(blob, filename) {
//   recStatus.textContent = "Uploading...";
//   recStatus.className = "status";
//   segmentsDiv.innerHTML = `
//     <div class="transcription-text">
//       <i class="fas fa-circle-notch fa-spin"></i> Uploading audio and waiting for transcription...
//     </div>
//   `;

//   const form = new FormData();
//   form.append("file", blob, filename);
//   // Set required params for English transcription
//   form.append("model", "whisper-large-v3-turbo");
//   form.append("response_format", "verbose_json");
//   form.append("language", "en");  // Force English language

//   try {
//     const res = await fetch("/transcribe", {
//       method: "POST",
//       body: form
//     });
//     const data = await res.json();
//     if (!res.ok) {
//       segmentsDiv.innerHTML = `
//         <div class="transcription-text error">
//           <i class="fas fa-exclamation-circle"></i> Error: ${data.error || JSON.stringify(data)}
//         </div>
//       `;
//       recStatus.textContent = "Error";
//       recStatus.className = "status recording"; // Use recording class for error state
//       return;
//     }

//     recStatus.textContent = "Transcription received";
//     recStatus.className = "status success";
//     // show the text and transcription metadata
//     const pretty = JSON.stringify(data.transcription, null, 2);
//     const txt = data.text || "";

//     // Escape HTML to avoid injection, then convert newlines to paragraphs/line breaks
//     function escapeHtml(str) {
//       return String(str)
//         .replace(/&/g, '&amp;')
//         .replace(/</g, '&lt;')
//         .replace(/>/g, '&gt;')
//         .replace(/"/g, '&quot;')
//         .replace(/'/g, '&#039;');
//     }

//     const escaped = escapeHtml(txt);
//     // Split into paragraphs by two-or-more newlines; single newlines become <br>
//     const paragraphs = escaped.split(/\n{2,}/).map(p => p.replace(/\n/g, '<br>'));
//     const paraHtml = paragraphs.map(p => `<p class="transcription-paragraph">${p}</p>`).join('');

//     segmentsDiv.innerHTML = `
//       <div class="transcription-text">
//         <div class="transcription-header">
//           <i class="fas fa-file-alt"></i> Transcribed Text
//         </div>
//         ${paraHtml}
//       </div>
//       <div class="transcription-header">
//         <i class="fas fa-code"></i> Full Response
//       </div>
//       <pre class="json-response">${pretty}</pre>
//     `;
//   } catch (err) {
//     console.error(err);
//     segmentsDiv.textContent = "Upload or transcription error: " + err;
//     recStatus.textContent = "Error";
//   }
// }
// static/recorder.js

let mediaRecorder;
let audioChunks = [];

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const recStatus = document.getElementById("recStatus");
const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("fileInput");
const segmentsDiv = document.getElementById("segments");
const apiKeyInput = document.getElementById("apiKeyInput");
const saveApiKeyBtn = document.getElementById("saveApiKey");
const showApiKeyBtn = document.getElementById("showApiKey");

// Check API key status on load
async function checkApiKeyStatus() {
  try {
    const response = await fetch('/api/config');
    const data = await response.json();
    if (data.has_api_key) {
      apiKeyInput.value = data.api_key;
      apiKeyInput.type = 'password';
      updateUIWithApiKey();
    }
  } catch (error) {
    console.error('Error checking API key status:', error);
  }
}

// Save API key
saveApiKeyBtn.addEventListener('click', async () => {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    alert('Please enter an API key');
    return;
  }
  try {
    const response = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey })
    });
    const data = await response.json();
    if (response.ok) {
      alert('API key saved successfully!');
      updateUIWithApiKey();
    } else {
      alert(data.error || 'Failed to save API key');
    }
  } catch (error) {
    console.error('Error saving API key:', error);
    alert('Failed to save API key. Please try again.');
  }
});

// Toggle API key visibility
showApiKeyBtn.addEventListener('click', () => {
  if (apiKeyInput.type === 'password') {
    apiKeyInput.type = 'text';
    showApiKeyBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
  } else {
    apiKeyInput.type = 'password';
    showApiKeyBtn.innerHTML = '<i class="fas fa-eye"></i>';
  }
});

function updateUIWithApiKey() {
  startBtn.disabled = false;
  uploadBtn.disabled = false;
  saveApiKeyBtn.innerHTML = '<i class="fas fa-check"></i> API Key Saved';
  saveApiKeyBtn.classList.add('success');
}

checkApiKeyStatus();

startBtn.addEventListener("click", async () => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert("getUserMedia not supported in this browser.");
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstart = () => {
      recStatus.textContent = "Recording...";
      recStatus.className = "status recording";
      startBtn.disabled = true;
      stopBtn.disabled = false;
      startBtn.innerHTML = '<i class="fas fa-microphone"></i> Recording...';
    };

    mediaRecorder.onstop = async () => {
      recStatus.textContent = "Processing...";
      recStatus.className = "status";
      startBtn.disabled = false;
      stopBtn.disabled = true;
      startBtn.innerHTML = '<i class="fas fa-microphone"></i> Start Recording';

      const blob = new Blob(audioChunks, { type: "audio/webm" });
      await uploadBlob(blob, "recording.webm");
    };

    mediaRecorder.start();
  } catch (err) {
    console.error(err);
    alert("Could not start microphone: " + err.message);
  }
});

stopBtn.addEventListener("click", () => {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
});

uploadBtn.addEventListener("click", async () => {
  const file = fileInput.files[0];
  if (!file) {
    alert("Please pick a file first.");
    return;
  }
  await uploadFile(file);
});

async function uploadFile(file) {
  await uploadBlob(file, file.name);
}

async function uploadBlob(blob, filename) {
  recStatus.textContent = "Uploading...";
  recStatus.className = "status";
  segmentsDiv.innerHTML = `
    <div class="transcription-text">
      <i class="fas fa-circle-notch fa-spin"></i> Uploading audio and waiting for transcription...
    </div>
  `;

  const form = new FormData();
  form.append("file", blob, filename);
  form.append("model", "whisper-large-v3-turbo");
  form.append("response_format", "verbose_json");
  form.append("language", "en");

  try {
    const res = await fetch("/transcribe", {
      method: "POST",
      body: form
    });
    const data = await res.json();
    if (!res.ok) {
      segmentsDiv.innerHTML = `
        <div class="transcription-text error">
          <i class="fas fa-exclamation-circle"></i> Error: ${data.error || JSON.stringify(data)}
        </div>
      `;
      recStatus.textContent = "Error";
      recStatus.className = "status recording";
      return;
    }

    recStatus.textContent = "Transcription received";
    recStatus.className = "status success";
    const pretty = JSON.stringify(data.transcription, null, 2);
    const txt = data.text || "";

    function escapeHtml(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    const escaped = escapeHtml(txt.trim());
    let paragraphs;
    if (escaped.includes('\n\n')) {
      paragraphs = escaped.split(/\n{2,}/).map(p => p.replace(/\n/g, '<br>'));
    } else if (escaped.includes('\n')) {
      paragraphs = [escaped.replace(/\n/g, '<br>')];
    } else {
      paragraphs = escaped.split(/([.?!])\s+/g)
        .reduce((acc, val, i, arr) => {
          if (/^[.?!]$/.test(val) && arr[i-1]) {
            acc[acc.length-1] += val + " ";
          } else if (val.trim()) {
            acc.push(val.trim());
          }
          return acc;
        }, []);
    }

    const paraHtml = paragraphs.filter(Boolean).map(p => `<p class="transcription-paragraph">${p}</p>`).join('');

    segmentsDiv.innerHTML = `
      <div class="transcription-text">
        <div class="transcription-header">
          <i class="fas fa-file-alt"></i> Transcribed Text
        </div>
        ${paraHtml}
      </div>
      <div class="transcription-header">
        <i class="fas fa-code"></i> Full Response
      </div>
      <pre class="json-response">${pretty}</pre>
    `;
  } catch (err) {
    console.error(err);
    segmentsDiv.textContent = "Upload or transcription error: " + err;
    recStatus.textContent = "Error";
  }
}
