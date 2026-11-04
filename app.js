// Number of videos = number of entries in VIDEOS (config.js)
const TOTAL=Object.keys(VIDEOS).length;
function watched(n){return sessionStorage.getItem("video"+n+"_done")==="1";}
function markWatched(n){sessionStorage.setItem("video"+n+"_done","1");unlockNext(n);}
function unlockNext(n){const b=document.getElementById("next");if(b){b.classList.remove("locked");b.removeAttribute("aria-disabled");b.href=b.dataset.href;document.getElementById("status").textContent="✓ Watched — you can continue.";}}
// Redirect if previous video not finished
function guard(required){if(required>0&&!watched(required)){location.replace(required===1?"video1.html":"video"+required+".html");}}
function toEmbed(u){
  let m=u.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/);if(m)return{type:"yt",id:m[1]};
  m=u.match(/vimeo\.com\/(?:video\/)?(\d+)/);if(m)return{type:"vimeo",id:m[1]};
  return{type:"file",src:u};
}
function setupVideo(n){
  guard(n-1);
  const box=document.getElementById("player"),url=VIDEOS[n];
  const next=document.getElementById("next");next.dataset.href=next.getAttribute("href");next.removeAttribute("href");
  if(watched(n))unlockNext(n);
  if(TEST_MODE){const t=document.getElementById("testbtn");t.hidden=false;t.onclick=()=>markWatched(n);}
  if(!url){box.innerHTML='<div class="ph">Video '+n+' link not added yet (edit config.js)</div>';return;}
  const e=toEmbed(url);
  if(e.type==="file"){box.innerHTML='<video controls playsinline preload="metadata" src="'+e.src+'"></video>';const v=box.querySelector("video");v.onended=()=>markWatched(n);
  // NO SKIPPING: remember the furthest point watched; jumping ahead snaps back. Rewinding is allowed.
  let maxT=0;v.addEventListener("timeupdate",()=>{if(!v.seeking&&v.currentTime>maxT&&v.currentTime-maxT<1.5)maxT=v.currentTime;});
  v.addEventListener("seeking",()=>{if(!watched(n)&&v.currentTime>maxT+0.5)v.currentTime=maxT;});
  v.addEventListener("ratechange",()=>{if(!watched(n)&&v.playbackRate>1)v.playbackRate=1;});v.onerror=()=>{box.innerHTML='<div class="ph">Video file not found or not playable: '+e.src+'</div>';};}
  else if(e.type==="yt"){box.innerHTML='<div id="yt"></div>';window.onYouTubeIframeAPIReady=()=>new YT.Player("yt",{videoId:e.id,events:{onStateChange:s=>{if(s.data===0)markWatched(n);}}});const s=document.createElement("script");s.src="https://www.youtube.com/iframe_api";document.head.appendChild(s);}
  else{box.innerHTML='<iframe id="vm" src="https://player.vimeo.com/video/'+e.id+'" allow="fullscreen"></iframe>';const s=document.createElement("script");s.src="https://player.vimeo.com/api/player.js";s.onload=()=>new Vimeo.Player(document.getElementById("vm")).on("ended",()=>markWatched(n));document.head.appendChild(s);}
}

// ===== FOOTER PROGRESS BAR =====
// Fixed bar at the bottom of every page. Fills by videos watched (sessionStorage);
// shows "Training complete" once the sign-off form has been submitted.
function renderProgress(){
  let bar=document.getElementById("progress");
  if(!bar){
    bar=document.createElement("footer");bar.id="progress";
    bar.innerHTML='<div class="track"><div class="fill"></div></div><span class="label"></span>';
    document.body.appendChild(bar);
  }
  const done=Object.keys(VIDEOS).map(Number).filter(watched).length;
  const signed=sessionStorage.getItem("signoff_done")==="1";
  bar.querySelector(".fill").style.width=(signed?100:done/TOTAL*100)+"%";
  bar.querySelector(".label").textContent=signed?"Training complete":done+" of "+TOTAL+" videos complete";
}
document.addEventListener("DOMContentLoaded",renderProgress);
// Refresh the bar whenever a video is marked watched
const _markWatched=markWatched;
markWatched=function(n){_markWatched(n);renderProgress();};
// Sign-off page: remember submission before the form posts to Formspree
// Sign-off page: send the form to Formspree in the background, then go to done.html.
document.addEventListener("submit",async e=>{
  if(e.target.id!=="f")return;
  e.preventDefault();
  const f=e.target,btn=f.querySelector("button");btn.disabled=true;btn.textContent="Sending...";
  try{
    const r=await fetch(FORMSPREE_URL,{method:"POST",body:new FormData(f),headers:{Accept:"application/json"}});
    if(!r.ok)throw 0;
    sessionStorage.setItem("signoff_done","1");
    location.href="done.html"; // completion page
  }catch(_){
    btn.disabled=false;btn.textContent="Submit sign-off";
    alert("Sorry, your sign-off didn't send. Check your internet connection and try again.");
  }
});
