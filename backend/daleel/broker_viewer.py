"""Self-contained human sign-in viewer. No external assets or secret persistence."""
VIEWER_HTML = r'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Daleel · Authorized sign-in</title><style>
*{box-sizing:border-box}body{margin:0;background:#f5f5f4;color:#202624;font:15px/1.5 system-ui,sans-serif}
header,main{max-width:1320px;margin:auto;padding:20px}header{display:flex;justify-content:space-between;gap:16px;align-items:center}
h1{font-size:23px;margin:0}h2{font-size:15px;margin:0 0 8px}p{margin:6px 0;color:#545e59}.brand{font-weight:700;letter-spacing:.03em}
.badge{border:1px solid #cdd3ce;border-radius:20px;padding:5px 12px;font-size:12px;background:white}.card{background:white;border:1px solid #d9dedb;border-radius:12px;padding:18px;margin-bottom:16px}
.intro{display:flex;gap:24px;justify-content:space-between}.steps{display:flex;gap:20px;padding:0;list-style:none;flex-wrap:wrap;color:#545e59;font-size:13px}.steps strong{color:#202624}
.toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px}button,input{font:inherit;border:1px solid #b9c2bc;border-radius:7px;padding:10px 12px;background:white;color:#202624;min-height:44px}
button{cursor:pointer}button:hover{background:#eef1ee}button:disabled{opacity:.5;cursor:wait}button:focus-visible,input:focus-visible,#screen:focus-visible{outline:3px solid #536d60;outline-offset:2px}.primary{background:#263c32;color:white;border-color:#263c32}.primary:hover{background:#344e41}
label{display:block;font-size:13px;font-weight:600;margin-bottom:5px}.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.row input{flex:1;min-width:180px}.hint{font-size:12px}.viewport{overflow:auto;background:#eef0ee;border:1px solid #d9dedb;border-radius:8px;max-height:70vh}
#screen{display:block;width:100%;height:auto;cursor:crosshair}#screen.zoom{width:1280px;max-width:none}#status:empty{display:none}#status{padding:12px;border:1px solid #b9c2bc;background:#f5f5f4;border-radius:8px;margin-top:12px}
.footer{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:12px}details{font-size:13px}summary{cursor:pointer}.hidden{display:none}
@media(max-width:650px){header,main{padding:12px}.intro{display:block}h1{font-size:20px}.steps{display:block}.steps li{margin-top:6px}.card{padding:12px}.toolbar button{flex:1}.viewport{max-height:52vh}}
</style></head><body>
<header><span class="brand">DALEEL / Secure connection</span><span class="badge" id="connection-state" role="status">Connecting…</span></header>
<main><section class="card"><div class="intro"><div><h1>Sign in to <span id="domain">your research site</span></h1>
<p>This browser is isolated for your workspace. Complete sign-in and MFA yourself.</p></div><span class="badge" id="expiry">Checking connection…</span></div>
<ol class="steps"><li><strong>1. Open a field</strong> · Click inside the remote page</li><li><strong>2. Sign in</strong> · Send your text below</li><li><strong>3. Return to Daleel</strong> · Choose Finish connection</li></ol>
<p class="hint">Use a normal signed-in site page when finished. You do not need to change your password or MFA settings.</p></section>
<section class="card" aria-label="Isolated browser controls"><div class="toolbar">
<button id="refresh" type="button">Refresh image</button><button id="zoom" type="button" aria-pressed="false">Actual size</button>
<details><summary>Keyboard &amp; scrolling</summary><div class="toolbar" style="margin-top:8px">
<button type="button" data-key="Tab">Tab</button><button type="button" data-key="Enter">Enter</button><button type="button" data-key="Backspace">Backspace</button><button type="button" data-key="Escape">Escape</button>
<button id="up" type="button">Scroll up</button><button id="down" type="button">Scroll down</button></div></details></div>
<div class="viewport"><img id="screen" alt="Isolated browser viewport — click a field before sending text" width="1280" height="900" tabindex="0"></div>
<p class="hint">On small screens, swipe sideways to see the full remote page. Use Fit to window for an overview.</p>
<p id="status" role="alert" aria-live="polite"></p>
<form id="typing"><label for="text">Text for the selected remote field</label><div class="row"><input id="text" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="4096" placeholder="Select a remote field, then enter text here" aria-describedby="text-hint"><button id="reveal" type="button" aria-pressed="false">Show text</button><button class="primary" id="send">Send text</button></div>
<p id="text-hint" class="hint">Text is sent only when you select Send text. It is cleared immediately and is never saved in this page.</p></form>
<div class="footer"><p class="hint" id="selected">Select a field in the remote page to begin.</p><button id="close" type="button">Close isolated browser</button></div></section>
<details class="card"><summary>Need help with a code or connection?</summary><p>For an email code, open your inbox separately. For an authenticator code, use your authenticator app. Daleel does not generate these codes.</p><p>If validation fails, return to the research site's normal home page in this browser, then retry Finish connection in Daleel. If the connection expired, start a new connection from Sessions.</p><p>Only connect a site when your research needs member-only data. Public research does not require a connected account.</p></details>
</main><script>
const base=location.pathname,screen=document.getElementById('screen'),status=document.getElementById('status');
let current,busy=false,refreshing=false,closed=false,timer;
const controls=[...document.querySelectorAll('button'),document.getElementById('text')];
if(matchMedia('(max-width:650px)').matches){screen.classList.add('zoom');document.getElementById('zoom').textContent='Fit to window';document.getElementById('zoom').setAttribute('aria-pressed','true');}
function unavailable(message){closed=true;clearTimeout(timer);status.textContent=message;document.getElementById('connection-state').textContent='Disconnected';controls.forEach(e=>e.disabled=true);screen.removeAttribute('src');if(current)URL.revokeObjectURL(current);}
async function refresh(){if(refreshing||closed)return;refreshing=true;try{const r=await fetch(base+'/screen',{cache:'no-store'});if(r.status===410){unavailable('Connection expired. Return to Daleel Sessions and start a new connection.');return;}if(!r.ok)throw Error('Browser image could not load. Refresh this page or start a new connection in Daleel.');const next=URL.createObjectURL(await r.blob());const previous=current;screen.onload=()=>{if(previous)URL.revokeObjectURL(previous);};screen.src=next;current=next;}catch(e){status.textContent=e.message;}finally{refreshing=false;}}
async function state(){try{const r=await fetch(base+'/status',{cache:'no-store'});if(r.status===410){unavailable('Connection expired. Return to Daleel Sessions and start a new connection.');return;}if(!r.ok)return;const s=await r.json();document.getElementById('domain').textContent=s.domain;document.getElementById('expiry').textContent=Math.ceil(s.remainingSeconds/60)+' min remaining';document.getElementById('connection-state').textContent=s.authenticated?'Signed in · Return to Daleel':'Awaiting your sign-in';}catch{}}
async function control(body){if(busy||closed)return;busy=true;controls.forEach(e=>e.disabled=true);try{const r=await fetch(base+'/control',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(r.status===410){unavailable('Connection expired. Start a new connection in Daleel.');return;}if(!r.ok)throw Error('This action could not be completed. Check the selected field and try again.');status.textContent='';await refresh();await state();}catch(e){status.textContent=e.message;}finally{busy=false;if(!closed)controls.forEach(e=>e.disabled=false);}}
screen.onerror=()=>{if(!closed)status.textContent='Browser image could not load. Refresh this page or start a new connection in Daleel.';};
screen.onclick=e=>{const r=screen.getBoundingClientRect();document.getElementById('selected').textContent='Remote location selected. Enter text below or use Tab to move between fields.';control({action:'click',x:Math.max(0,Math.min(1280,(e.clientX-r.left)*1280/r.width)),y:Math.max(0,Math.min(900,(e.clientY-r.top)*900/r.height))});};
document.querySelectorAll('[data-key]').forEach(b=>b.onclick=()=>control({action:'key',text:b.dataset.key}));
document.getElementById('up').onclick=()=>control({action:'scroll',y:-600});document.getElementById('down').onclick=()=>control({action:'scroll',y:600});
document.getElementById('refresh').onclick=()=>{status.textContent='';refresh();state();};
document.getElementById('zoom').onclick=e=>{const zoom=screen.classList.toggle('zoom');e.target.setAttribute('aria-pressed',String(zoom));e.target.textContent=zoom?'Fit to window':'Actual size';};
document.getElementById('reveal').onclick=e=>{const input=document.getElementById('text'),show=input.type==='password';input.type=show?'text':'password';e.target.textContent=show?'Hide text':'Show text';e.target.setAttribute('aria-pressed',String(show));};
document.getElementById('typing').onsubmit=e=>{e.preventDefault();const el=document.getElementById('text'),text=el.value;el.value='';el.type='password';document.getElementById('reveal').textContent='Show text';document.getElementById('reveal').setAttribute('aria-pressed','false');if(text)control({action:'type',text});};
document.getElementById('close').onclick=async()=>{if(!confirm('Close this isolated browser? Unsaved sign-in progress will be lost.'))return;try{const r=await fetch(base+'/close',{method:'POST'});if(r.ok||r.status===410)unavailable('Browser closed. Return to Daleel to start another connection.');else status.textContent='Could not close the browser. Please retry.';}catch{status.textContent='Could not close the browser. Please retry.';}};
async function tick(){if(closed)return;await refresh();await state();if(!closed)timer=setTimeout(tick,2000);}
document.addEventListener('visibilitychange',()=>{document.getElementById('text').value='';});window.addEventListener('pagehide',()=>{clearTimeout(timer);if(current)URL.revokeObjectURL(current);});tick();
</script></body></html>'''
