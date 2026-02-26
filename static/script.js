function openVoice() {
    window.location.href = "/voiceguard";
}
particlesJS("particles-js", {
  particles: {
    number: { value: 100 },
    color: { value: "#00ffff" },
    shape: { type: "circle" },
    opacity: { value: 0.5 },
    size: { value: 3 },

    line_linked: {
      enable: true,
      distance: 150,
      color: "#00ffff",
      opacity: 0.4,
      width: 1
    },

    move: {
      enable: true,
      speed: 3
    }
  },

  interactivity: {
    detect_on: "window",
    events: {
      onhover: {
        enable: true,
        mode: "repulse"
      },
      onclick: {
        enable: true,
        mode: "push"
      }
    },
    modes: {
      repulse: {
        distance: 120
      },
      push: {
        particles_nb: 4
      }
    }
  },

  retina_detect: true
});


/* ================= GSAP HERO ANIMATION ================= */

gsap.from(".hero h1", {
  y: 80,
  opacity: 0,
  duration: 1
});

gsap.from(".hero p", {
  y: 40,
  opacity: 0,
  duration: 1,
  delay: 0.5
});

const API_URL = "";


/* ================= API ================= */



let mediaRecorder;
let audioChunks = [];
let recordedBlob = null;

const fileInput = document.getElementById("audioFile");
const player = document.getElementById("player");
const resultBox = document.getElementById("result");

/* ================= START RECORD ================= */

document.getElementById("startBtn").onclick = async () => {

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  mediaRecorder = new MediaRecorder(stream, {
    mimeType: "audio/webm"
  });

  audioChunks = [];

  mediaRecorder.ondataavailable = e => audioChunks.push(e.data);

  mediaRecorder.start();
  resultBox.innerText = "🎙 Recording...";
};


/* ================= STOP RECORD ================= */

document.getElementById("stopBtn").onclick = () => {

  if (!mediaRecorder) return;

  mediaRecorder.stop();

  mediaRecorder.onstop = async () => {

    const webmBlob = new Blob(audioChunks,{type:"audio/webm"});
    recordedBlob = await convertToWav(webmBlob);

    player.src = URL.createObjectURL(recordedBlob);
    resultBox.innerText = "Recording Ready!";
  };
};


/* ================= CONVERT TO WAV ================= */

async function convertToWav(blob){

  const arrayBuffer = await blob.arrayBuffer();
  const audioCtx = new AudioContext();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

  return new Blob([encodeWAV(audioBuffer)],{type:"audio/wav"});
}

function encodeWAV(audioBuffer){

  const samples = audioBuffer.getChannelData(0);
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  function writeString(view,offset,string){
    for(let i=0;i<string.length;i++)
      view.setUint8(offset+i,string.charCodeAt(i));
  }

  writeString(view,0,"RIFF");
  view.setUint32(4,36+samples.length*2,true);
  writeString(view,8,"WAVE");
  writeString(view,12,"fmt ");
  view.setUint32(16,16,true);
  view.setUint16(20,1,true);
  view.setUint16(22,1,true);
  view.setUint32(24,44100,true);
  view.setUint32(28,44100*2,true);
  view.setUint16(32,2,true);
  view.setUint16(34,16,true);
  writeString(view,36,"data");
  view.setUint32(40,samples.length*2,true);

  let offset = 44;
  for(let i=0;i<samples.length;i++,offset+=2){
    const s=Math.max(-1,Math.min(1,samples[i]));
    view.setInt16(offset,s*0x7fff,true);
  }

  return buffer;
}


/* ================= FILE PREVIEW ================= */

fileInput.addEventListener("change", function(){
  if(this.files[0]){
    player.src = URL.createObjectURL(this.files[0]);
  }
});


/* ================= PREDICT ================= */
document.getElementById("predictBtn").onclick = async () => {

    let formData = new FormData();

    if (fileInput.files[0]) {
        formData.append("file", fileInput.files[0]);
    } 
    else if (recordedBlob) {
        formData.append("file", recordedBlob, "recorded.wav");
    } 
    else {
        alert("Upload or record audio first!");
        return;
    }

    resultBox.innerText = "Analyzing Voice...";

    const response = await fetch("/predict", {
        method: "POST",
        body: formData
    });
if (!response.ok) {
    const err = await response.json();
    resultBox.innerText = "Error: " + err.error;
    console.log(err);
    return;
}
    const data = await response.json();

    resultBox.innerText =
        `Result: ${data.result} (${data.confidence}% confidence)`;
};
