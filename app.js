import {createExhibitionView} from './scene.js?v=20261015-acrylic1';
import {exhibitionData} from './source-data.js?v=20261015-acrylic1';

const $=id=>document.getElementById(id);
const all=s=>[...document.querySelectorAll(s)];
let current='venue', view, toastTimeout;
const settings={dimensions:false,labels:true,cutaway:true,rotate:false,exposure:1,height:.618,animation:false,curtain:true,carpet:true};
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>$('toast').classList.remove('visible'),2800)}
function selectObject(data){
  const panel=$('selection');
  if(!data){panel.hidden=true;return}
  panel.hidden=false;
  panel.innerHTML=`<div class="eyebrow">SELECTED OBJECT</div><h3>${escape(data.title||data.name||data.id)}</h3><p>${escape(data.description)}</p><p class="selected-dim">${escape(data.dimensions)}</p><p class="selected-source">${escape(data.source)} · ${escape(data.status||'再構成')}</p>`;
  if(innerWidth<=760)$('inspector').classList.add('open');
  panel.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
}
function renderInfo(){
  const d=exhibitionData[current];
  $('work-title').innerHTML=d.title;$('work-description').textContent=d.description;$('room-scale').textContent=d.scale;
  $('scene-caption').textContent=`${({venue:'01',core:'02',frequencies:'03'})[current]} / ${d.short}`;
  $('metrics').innerHTML=d.metrics.map(([name,value,unit])=>`<div class="metric"><span>${name}</span><strong>${value}</strong><small>${unit}</small></div>`).join('');
  $('inventory').innerHTML=d.inventory.map(([name,count,dim,desc])=>`<div class="inventory-item"><div class="inventory-head"><span>${name}</span><small>${count}</small></div><div class="inventory-dim">${dim}</div><p>${desc}</p></div>`).join('');
  $('source-notes').innerHTML=d.notes;
  $('layer-list').innerHTML=d.layers.map(([id,label])=>`<label class="toggle-row"><span>${label}</span><input type="checkbox" checked data-layer="${id}" aria-label="${label}を表示"><span class="switch"></span></label>`).join('');
  d.layers.forEach(([id])=>view?.setLayer(id,true));
  all('[data-layer]').forEach(input=>input.addEventListener('change',()=>view?.setLayer(input.dataset.layer,input.checked)));
  $('core-settings').hidden=current==='frequencies';$('venue-settings').hidden=current!=='venue';$('selection').hidden=true;
  $('curtain-settings').hidden=current==='core';
  $('inspector').scrollTop=0;
  all('[data-scene]').forEach(b=>{b.classList.toggle('active',b.dataset.scene===current);b.setAttribute('aria-pressed',String(b.dataset.scene===current))});
}
function changeScene(scene){
  if(!exhibitionData[scene])return;
  current=scene;view.setScene(current);renderInfo();
  view.setLayer('labels',settings.labels);view.setLayer('dimensions',settings.dimensions);view.setLayer('curtain',settings.curtain);view.setLayer('carpet',settings.carpet);view.setCutaway(settings.cutaway);view.setExposure(settings.exposure);view.setAutoRotate(settings.rotate);view.setAnimation(settings.animation);
  if(current!=='frequencies')view.setAcrylicHeight(settings.height);
  setCamera('perspective');
  const url=new URL(location.href);url.searchParams.set('scene',scene);history.replaceState({},'',url);
}
const viewNames={perspective:'斜めから',visitor:'鑑賞位置 · 目線の高さ',front:'正面',side:'側面',top:'平面 · 天井配置',detail:'作品の細部'};
function setCamera(name){view?.setView(name);all('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));$('view-title').textContent=viewNames[name]||name;}
all('[data-scene]').forEach(b=>b.addEventListener('click',()=>changeScene(b.dataset.scene)));
all('[data-view]').forEach(b=>b.addEventListener('click',()=>setCamera(b.dataset.view)));
all('[data-focus]').forEach(b=>b.addEventListener('click',()=>{view.setVenueFocus?.(b.dataset.focus);all('[data-view]').forEach(t=>t.classList.remove('active'));$('view-title').textContent=({core:'De-symmetrical Core',frequencies:'liberated frequencies',bar:'バーカウンター',entrance:'入口・階段'})[b.dataset.focus];if(innerWidth<=760)$('inspector').classList.remove('open')}));
all('[data-curtain-view]').forEach(b=>b.addEventListener('click',()=>{view.setCurtainView(b.dataset.curtainView);all('[data-view]').forEach(t=>t.classList.remove('active'));$('view-title').textContent=b.dataset.curtainView==='inside'?'liberated frequencies · 暗幕の中':'liberated frequencies · 暗幕の入口';if(innerWidth<=760)$('inspector').classList.remove('open')}));
all('[data-tab]').forEach(b=>b.addEventListener('click',()=>{all('[data-tab]').forEach(t=>{t.classList.toggle('active',t===b);t.setAttribute('aria-selected',String(t===b))});all('.tab-panel').forEach(p=>p.hidden=p.id!==`${b.dataset.tab}-panel`)}));
for(const id of ['dimensions','labels'])$(id).addEventListener('change',e=>{settings[id]=e.target.checked;view.setLayer(id,settings[id])});
$('cutaway').addEventListener('change',e=>{settings.cutaway=e.target.checked;view.setCutaway(settings.cutaway)});
$('rotate').addEventListener('change',e=>{settings.rotate=e.target.checked;view.setAutoRotate(settings.rotate)});
$('animation').addEventListener('change',e=>{settings.animation=e.target.checked;view.setAnimation(settings.animation)});
$('curtain').addEventListener('change',e=>{settings.curtain=e.target.checked;$('curtain-state').textContent=settings.curtain?'ON':'OFF';view.setLayer('curtain',settings.curtain)});
$('carpet').addEventListener('change',e=>{settings.carpet=e.target.checked;$('carpet-state').textContent=settings.carpet?'ON':'OFF';view.setLayer('carpet',settings.carpet)});
$('exposure').addEventListener('input',e=>{settings.exposure=+e.target.value;$('exposure-output').value=`${Math.round(settings.exposure*100)}%`;view.setExposure(settings.exposure)});
$('acrylic-height').addEventListener('input',e=>{settings.height=+e.target.value;$('height-output').value=`${settings.height.toFixed(3)} m`;view.setAcrylicHeight(settings.height)});
$('reset').addEventListener('click',()=>{
  Object.assign(settings,{dimensions:false,labels:true,cutaway:true,rotate:false,exposure:1,height:.618,animation:false,curtain:true,carpet:true});
  for(const id of ['dimensions','labels','cutaway','rotate','animation','curtain','carpet'])$(id).checked=settings[id];
  $('curtain-state').textContent='ON';
  $('carpet-state').textContent='ON';
  $('exposure').value=1;$('exposure-output').value='100%';$('acrylic-height').value=.618;$('height-output').value='0.618 m';
  view.reset();changeScene(current);toast('初期表示に戻しました');
});
function openSource(){if(!$('source-dialog').open)$('source-dialog').showModal()}
$('source-open').addEventListener('click',openSource);$('compare-open').addEventListener('click',openSource);
$('source-close').addEventListener('click',()=>$('source-dialog').close());
$('source-dialog').addEventListener('click',e=>{if(e.target===$('source-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close()}});
$('panel-toggle').addEventListener('click',()=>$('inspector').classList.toggle('open'));$('panel-close').addEventListener('click',()=>$('inspector').classList.remove('open'));
$('snapshot').addEventListener('click',()=>{try{const a=document.createElement('a');a.href=view.capture();a.download=`dot-area-${current}.png`;a.click();toast('3Dビューの画像を保存しました')}catch{toast('画像を保存できませんでした')}});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.querySelector('.stage').requestFullscreen)await document.querySelector('.stage').requestFullscreen();else toast('この端末では全画面表示を利用できません')}catch{toast('全画面表示を利用できません')}});
document.addEventListener('fullscreenchange',()=>view?.resize());
document.addEventListener('keydown',e=>{
  if(['INPUT','TEXTAREA'].includes(e.target.tagName)||$('source-dialog').open)return;
  const cameras=['perspective','visitor','front','side','top','detail'];
  if(/^[1-6]$/.test(e.key))setCamera(cameras[Number(e.key)-1]);
  else if(e.key.toLowerCase()==='d'){$('dimensions').click()}
  else if(e.key.toLowerCase()==='l'){$('labels').click()}
  else if(e.key.toLowerCase()==='r'){$('reset').click()}
  else if(e.key==='Escape')$('inspector').classList.remove('open');
});
try{
  renderInfo();
  view=createExhibitionView($('viewport'),{onSelect:selectObject,onReady:()=>{$('loading')?.remove();document.body.dataset.ready='true'}});
  if(view.getState().error)throw new Error(view.getState().error);
  $('loading')?.remove();document.body.dataset.ready='true';
  const initial=new URLSearchParams(location.search).get('scene');
  changeScene(initial&&exhibitionData[initial]?initial:'venue');
  window.__exhibition={view,getState:()=>({scene:current,settings:{...settings},model:view.getState()}),selectScene:changeScene,setView:setCamera};
}catch(err){
  console.error(err);$('loading').innerHTML='<span>3D表示を開始できませんでした。ブラウザのWebGL設定を確認してください。</span>';document.body.dataset.ready='error';
}
