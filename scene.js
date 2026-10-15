import * as THREE from 'three';
import { OrbitControls } from './vendor/three/OrbitControls.js';
import { buildVenueArchitecture } from './venue-model.js?v=20261015-venue3';

const V = (x=0,y=0,z=0) => new THREE.Vector3(x,y,z);
const PALETTE = { black:0x111315, metal:0x24272a, edge:0xa6afb5, text:0xe7e8e6 };
const CORE_DIM = { width:6.5, depth:4.6, height:2.6, acrylicWidth:1.618, acrylicDepth:1, acrylicHeight:.618, topWidth:.62, topDepth:.38 };
const FREQ_DIM = { width:3, depth:3, height:3, eegPlinthWidth:.5, eegPlinthDepth:.32, eegPlinthHeight:1.05, monitorStandWidth:.26, monitorStandDepth:.22, monitorStandHeight:1.405, monitorScreenWidth:.2304, monitorScreenHeight:.4095 };
const LAYERS = ['labels','dimensions','lights','cameras','speakers','acrylic','stone','arm','cables','screens','headphones','equipment','architecture','counter','entrance','coreWork','frequenciesWork'];

export function createExhibitionView(container, callbacks={}) {
  const world = new THREE.Scene();
  world.background = new THREE.Color(0x08090a);
  world.fog = new THREE.FogExp2(0x08090a,.027);
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({antialias:true, alpha:false, preserveDrawingBuffer:true, powerPreference:'high-performance'});
  } catch (error) {
    const fallback=document.createElement('div');
    fallback.setAttribute('role','alert');
    fallback.style.cssText='color:#eee;background:#090909;padding:32px;max-width:480px;line-height:1.8';
    fallback.textContent='3D表示を開始できませんでした。WebGLに対応したブラウザで開いてください。PDFの展示資料は画面の資料パネルから確認できます。';
    container.appendChild(fallback);
    callbacks.onError?.(error);
    return { setScene(){},setView(){},setVenueFocus(){},setLayer(){},setExposure(){},setAutoRotate(){},setCutaway(){},setAcrylicHeight(){},setAnimation(){},reset(){},capture(){return null;},resize(){},getState(){return {error:'WebGL unavailable'};},dispose(){fallback.remove();} };
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.setSize(container.clientWidth||800,container.clientHeight||600);
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.18;
  renderer.domElement.setAttribute('aria-label','Dot Area 展示空間の操作可能な3Dビュー。ドラッグで回転、ホイールで拡大。');
  renderer.domElement.setAttribute('role','img');
  renderer.domElement.style.cssText='display:block;width:100%;height:100%;touch-action:none;outline:none;';
  renderer.domElement.tabIndex=0;
  container.appendChild(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(42,1,.03,200);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping=true; controls.dampingFactor=.07;
  controls.minDistance=.45; controls.maxDistance=100;
  controls.maxPolarAngle=Math.PI*.49;
  controls.target.set(0,.9,0);
  controls.autoRotateSpeed=.32;
  controls.screenSpacePanning=true;
  const ambient=new THREE.HemisphereLight(0xc8d1df,0x292522,.95);world.add(ambient);
  const key=new THREE.DirectionalLight(0xe5e8ee,2.1);key.position.set(4,7,6);world.add(key);
  const rim=new THREE.DirectionalLight(0xa5b3c0,.65);rim.position.set(-4,3,-2);world.add(rim);
  const scenes={}, pickables=[];
  const layerState=Object.fromEntries(LAYERS.map(n=>[n,n!=='dimensions']));
  let currentScene='venue', venue=null, cutaway=true, animation=false, destroyed=false, raf=0, selected=null, pointerStart=null;
  const clock=new THREE.Clock();
  const texturePool=[];
  const basic=(color=PALETTE.black,props={})=>new THREE.MeshStandardMaterial({color,roughness:.61,metalness:.12,...props});
  const materials={black:basic(),metal:basic(PALETTE.metal,{roughness:.36,metalness:.65}), dark:basic(0x070809), steel:basic(0x666c71,{roughness:.3,metalness:.85}), rubber:basic(0x08090a,{roughness:.94}), white:basic(0xb7baba)};
  function mesh(geometry,material,parent,pos,rot) {const o=new THREE.Mesh(geometry,material);if(pos)o.position.copy(pos);if(rot)o.rotation.set(...rot);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
  function box(w,h,d,parent,pos,mat=materials.black){return mesh(new THREE.BoxGeometry(w,h,d),mat,parent,pos);}
  function cyl(r1,r2,h,parent,pos,mat=materials.metal,rot){return mesh(new THREE.CylinderGeometry(r1,r2,h,24),mat,parent,pos,rot);}
  function tube(points,r,parent,mat=materials.rubber,curved=false){const g=curved?new THREE.CatmullRomCurve3(points):new THREE.CurvePath();if(!curved)for(let i=1;i<points.length;i++)g.add(new THREE.LineCurve3(points[i-1],points[i]));return mesh(new THREE.TubeGeometry(g,Math.max(12,points.length*12),r,8,false),mat,parent);}
  function rod(a,b,r,parent,mat=materials.metal){const d=b.clone().sub(a);const o=cyl(r,r,d.length(),parent,a.clone().add(b).multiplyScalar(.5),mat);o.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());return o;}
  function line(points,parent,color=0x929a9e,opacity=.45,dashed=false){const g=new THREE.BufferGeometry().setFromPoints(points);const m=dashed?new THREE.LineDashedMaterial({color,transparent:true,opacity,dashSize:.05,gapSize:.045}):new THREE.LineBasicMaterial({color,transparent:true,opacity});const o=new THREE.Line(g,m);if(dashed)o.computeLineDistances();parent.add(o);return o;}
  function meta(group,data){group.userData.info=data;group.traverse(o=>{if(o.isMesh)pickables.push(o);});return group;}
  function information(id,title,description,dimensions,source,status='PDF記載'){return {id,title,description,dimensions,source,status};}
  function group(parent,name){const g=new THREE.Group();g.name=name;parent.add(g);return g;}
  function makeSpace(name,dims){const g=group(world,name);const layers={};for(const name of LAYERS)layers[name]=group(g,name);const room=group(g,'architecture');return {group:g,layers,room,dims,walls:[],roof:null};}
  function makeLabel(text,parent,pos,opts={}) {
    const c=document.createElement('canvas'); const ctx=c.getContext('2d');
    const font=opts.font||'500 27px "Hiragino Sans", "Noto Sans JP", sans-serif';
    ctx.font=font;const w=Math.ceil(ctx.measureText(text).width+32);c.width=Math.max(w,128);c.height=58;
    ctx.font=font;ctx.textAlign='center';ctx.textBaseline='middle';
    if(opts.background!==false){ctx.fillStyle='rgba(7,9,11,.78)';ctx.beginPath();ctx.roundRect(0,4,c.width,50,7);ctx.fill();ctx.strokeStyle='rgba(206,215,221,.18)';ctx.stroke();}
    ctx.fillStyle=opts.color||'#e2e6e9';ctx.fillText(text,c.width/2,29);
    const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texturePool.push(texture);
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false,depthWrite:false,transparent:true,opacity:opts.opacity||.88}));
    sprite.position.copy(pos);const h=opts.size||.105;sprite.scale.set(h*c.width/58,h,1);sprite.renderOrder=20;parent.add(sprite);return sprite;
  }
  function dimension(a,b,text,parent,offset=V(0,0,0),size=.11){
    const p=a.clone().add(offset),q=b.clone().add(offset);line([a,p],parent,0x77848d,.32);line([b,q],parent,0x77848d,.32);line([p,q],parent,0xc1cbd2,.78);
    const dir=q.clone().sub(p).normalize();let cross=V(0,1,0);if(Math.abs(dir.y)>.8)cross=V(1,0,0);cross.cross(dir).normalize().multiplyScalar(.035);
    line([p.clone().sub(cross),p.clone().add(cross)],parent,0xe0e6ea,.8);line([q.clone().sub(cross),q.clone().add(cross)],parent,0xe0e6ea,.8);
    const mid=p.clone().lerp(q,.5);mid.y+=.075;makeLabel(text,parent,mid,{size});
  }
  function noiseTexture(){const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');const im=ctx.createImageData(512,512);let seed=8127;for(let i=0;i<im.data.length;i+=4){seed=(seed*16807)%2147483647;const n=91+(seed%17);im.data[i]=n;im.data[i+1]=n+2;im.data[i+2]=n+4;im.data[i+3]=255;}ctx.putImageData(im,0,0);const tex=new THREE.CanvasTexture(c);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(8,6);texturePool.push(tex);return tex;}
  function buildRoom(space){
    const {width:w,depth:d,height:h}=space.dims;
    const floorMat=basic(0x3a3c3e,{roughness:.39,metalness:.18,map:noiseTexture()});
    box(w+.14,.1,d+.14,space.room,V(0,-.055,0),materials.dark);
    const floor=box(w,.016,d,space.room,V(0,-.005,0),floorMat);floor.castShadow=false;
    const wallMat=basic(0x181b1f,{roughness:.9});
    const back=box(w,h,.065,space.room,V(0,h/2,-d/2-.032),wallMat);
    const left=box(.065,h,d,space.room,V(-w/2-.032,h/2,0),wallMat);
    const right=box(.065,h,d,space.room,V(w/2+.032,h/2,0),wallMat);
    space.walls=[{o:back,side:'back'},{o:left,side:'left'},{o:right,side:'right'}];
    const roof=box(w,.05,d,space.room,V(0,h+.025,0),basic(0x17191b));space.roof=roof;
    const footprint=[V(-w/2,.008,d/2),V(w/2,.008,d/2),V(w/2,.008,-d/2),V(-w/2,.008,-d/2),V(-w/2,.008,d/2)];line(footprint,space.room,0x616970,.5);
    line([V(-w/2,h,d/2),V(-w/2,h,-d/2),V(w/2,h,-d/2),V(w/2,h,d/2)],space.room,0x85909a,.22);
    for(let x=-w/2+1;x<w/2;x+=1)line([V(x,.011,-d/2),V(x,.011,d/2)],space.room,0x171a1c,.16);
    for(let z=-d/2+1;z<d/2;z+=1)line([V(-w/2,.011,z),V(w/2,.011,z)],space.room,0x171a1c,.16);
    for(let x=-w/2+1.08;x<w/2;x+=1.08)line([V(x,.04,-d/2+.035),V(x,h,-d/2+.035)],space.room,0x31373c,.19);
    const base=basic(0x080a0c);box(w,.048,.035,space.room,V(0,.026,-d/2+.035),base);
    box(.035,.048,d,space.room,V(-w/2+.035,.026,0),base);box(.035,.048,d,space.room,V(w/2-.035,.026,0),base);
    meta(floor,information(`${space.group.name}-room`,'展示室',space.group.name==='core'?'PDFの設置図に記された室寸法を基準に再構成。正面を開き、視点に合わせて壁・天井を省略して展示構成を確認できます。':'正面図の幅・高さを基準に再構成。奥行きは資料から確定できないため仮に3mとしています。',space.group.name==='core'?'W 6.5 × D 4.6 × H 2.6 m':'W 3.0 × D 約3.0 × H 3.0 m',space.group.name==='core'?'PDF p.8':'PDF p.6',space.group.name==='core'?'PDF記載':'再構成'));
    const roomDimensions=group(space.layers.dimensions,'room-dimensions');
    dimension(V(-w/2,.01,d/2),V(w/2,.01,d/2),`W ${w.toFixed(1)} m`,roomDimensions,V(0,0,.33),.15);
    dimension(V(w/2,.01,d/2),V(w/2,.01,-d/2),`D ${d.toFixed(1)} m${space.group.name==='frequencies'?'（仮）':''}`,roomDimensions,V(.3,0,0),.14);
    dimension(V(-w/2,0,-d/2),V(-w/2,h,-d/2),`H ${h.toFixed(1)} m`,roomDimensions,V(-.18,0,0),.14);
    return space;
  }
  function bolt(parent,pos,axis='z',radius=.008){const o=cyl(radius,radius,.006,parent,pos,materials.steel,axis==='z'?[Math.PI/2,0,0]:axis==='x'?[0,0,Math.PI/2]:null);return o;}
  function speaker(space,x,z,ch){const g=group(space.layers.speakers,`speaker-${ch}`);g.position.set(x,2.49,z);
    box(.27,.095,.27,g,V(0,0,0),materials.black);box(.24,.012,.24,g,V(0,-.054,0),materials.metal);
    const grillMat=basic(0x101214,{roughness:1});cyl(.098,.098,.006,g,V(0,-.063,0),grillMat);
    for(let r=.025;r<.095;r+=.014){const tor=new THREE.Mesh(new THREE.TorusGeometry(r,.0012,4,36),materials.metal);tor.rotation.x=Math.PI/2;tor.position.y=-.068;g.add(tor);}
    for(const sx of [-.102,.102])for(const sz of [-.102,.102])bolt(g,V(sx,-.065,sz),'y',.004);
    box(.058,.04,.058,g,V(0,.067,0),materials.metal);
    makeLabel(`Ch${String(ch).padStart(2,'0')}`,space.layers.labels,V(x,2.32,z),{size:.095,opacity:.72});
    meta(g,information(`speaker-${ch}`,`天井スピーカー Ch${ch}`,'12chを4列×3段に配置。前列Ch1–4、中列Ch5–8、後列Ch9–12。筐体形状・グリルは視認のための再構成。','12台 / 4列 × 3段','PDF p.8・p.10'));
  }
  function ceilingCamera(space,position,index){const g=group(space.layers.cameras,`camera-${index}`);g.position.copy(position);
    cyl(.009,.009,1.18,g,V(0,2.01,0),materials.steel);box(.13,.024,.13,g,V(0,2.59,0),materials.metal);
    const head=group(g,'camera-head');head.position.set(0,1.38,0);head.rotation.x=-.17;
    box(.115,.055,.062,head,V(0,0,0),materials.black);cyl(.017,.023,.019,head,V(0,-.036,0),materials.metal);
    cyl(.012,.012,.004,head,V(0,-.048,0),new THREE.MeshStandardMaterial({color:0x8d9ba8,metalness:1,roughness:.07}));
    tube([V(.025,2.59,0),V(.025,1.6,0),V(.05,1.43,0),V(.035,1.38,-.02)].map(p=>p.add(position)),.0035,space.layers.cables);
    makeLabel(`CAM 0${index}`,space.layers.labels,position.clone().add(V(-.08,1.57,.03)),{size:.087,opacity:.75});
    meta(g,information(`camera-${index}`,`カメラ ${index}`,'機材表の2台で再構成。展示図に示される天吊りの固定具・ポールを立体化し、石とアクリル付近へ向けて配置。','2台 / 天井固定','PDF p.8・p.10'));
  }
  function createStone(space){const g=group(space.layers.stone,'asama-stone');
    const geo=new THREE.IcosahedronGeometry(1,4);const p=geo.attributes.position,colors=[];
    let minY=10;
    for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);const n=Math.sin(x*13+z*19)*Math.sin(y*17+z*7)*.07+Math.sin(x*5-y*8+z*4)*.12;
      const xx=x*.25*(1+n)+.025*y,yy=(y+1)*.145*(1+n)+.035*Math.sin(x*3+z*2)*(y+.9),zz=z*.15*(1+n);p.setXYZ(i,xx,yy,zz);minY=Math.min(minY,yy);
      const shade=.034+.024*(Math.sin(x*77+y*36+z*59)*.5+.5)+.006*y;colors.push(shade*1.03,shade,shade*.95);
    }
    for(let i=0;i<p.count;i++)p.setY(i,p.getY(i)-minY+.012);geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();
    // IcosahedronGeometry stores repeated positions. Average their normals so
    // the irregular rock reads as one weathered surface rather than a gem.
    const normal=geo.attributes.normal,averages=new Map(),keys=[];
    for(let i=0;i<p.count;i++){const key=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e5)).join(',');keys.push(key);const sum=averages.get(key)||V();sum.add(V(normal.getX(i),normal.getY(i),normal.getZ(i)));averages.set(key,sum);}
    for(const n of averages.values())n.normalize();for(let i=0;i<p.count;i++){const n=averages.get(keys[i]);normal.setXYZ(i,n.x,n.y,n.z);}normal.needsUpdate=true;
    const bumpCanvas=document.createElement('canvas');bumpCanvas.width=bumpCanvas.height=512;const bc=bumpCanvas.getContext('2d');bc.fillStyle='#929292';bc.fillRect(0,0,512,512);
    let randomSeed=9217;const random=()=>{randomSeed=(randomSeed*16807)%2147483647;return randomSeed/2147483647;};
    for(let i=0;i<4200;i++){const x=random()*512,y=random()*512,r=.6+random()*4.5;const grad=bc.createRadialGradient(x,y,0,x,y,r);grad.addColorStop(0,'#242424');grad.addColorStop(.55,'#666666');grad.addColorStop(.82,'#adadad');grad.addColorStop(1,'#929292');bc.fillStyle=grad;bc.beginPath();bc.arc(x,y,r,0,Math.PI*2);bc.fill();}
    const bumpTex=new THREE.CanvasTexture(bumpCanvas);bumpTex.wrapS=bumpTex.wrapT=THREE.RepeatWrapping;bumpTex.repeat.set(2,2);texturePool.push(bumpTex);
    mesh(geo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.98,metalness:0,bumpMap:bumpTex,bumpScale:.008}),g);
    for(let i=0;i<9;i++){const a=i*2.399;const r=.22+(i%3)*.018;const chip=mesh(new THREE.DodecahedronGeometry(.012+(i%3)*.006,0),basic(0x464441,{roughness:1}),g,V(Math.cos(a)*r,.014,Math.sin(a)*r*.6));chip.scale.y=.55;}
    meta(g,information('stone','浅間石','展示の中心に置かれた浅間石。資料のイメージを参考に、粗い凹凸・不整形の輪郭を持つ石として再構成。石の実測寸法・表面形状は未記載。','約 W 0.50 × D 0.30 × H 0.31 m（推定）','PDF p.7–8','再構成'));
    makeLabel('浅間石',space.layers.labels,V(.38,.22,.25),{size:.095});
  }
  let acrylicGroup,acrylicDims;
  function disposeTemporary(root){
    const shared=new Set(Object.values(materials)),seenMaterials=new Set(),seenGeometries=new Set();
    root.traverse(o=>{if(o.geometry&&!seenGeometries.has(o.geometry)){seenGeometries.add(o.geometry);o.geometry.dispose();}const ms=Array.isArray(o.material)?o.material:[o.material];for(const m of ms){if(!m||shared.has(m)||seenMaterials.has(m))continue;seenMaterials.add(m);if(m.map){const i=texturePool.indexOf(m.map);if(i>=0)texturePool.splice(i,1);m.map.dispose();}m.dispose();}});
  }
  function buildAcrylic(space,height){
    if(acrylicGroup){disposeTemporary(acrylicGroup);space.layers.acrylic.remove(acrylicGroup);}
    if(acrylicDims){disposeTemporary(acrylicDims);space.layers.dimensions.remove(acrylicDims);}
    acrylicGroup=group(space.layers.acrylic,'acrylic-frustum');acrylicDims=group(space.layers.dimensions,'acrylic-dimensions');
    const bw=1.618,bd=1,tw=.62,td=.38,y=.022,h=height;
    const points=[V(-bw/2,y,bd/2),V(bw/2,y,bd/2),V(bw/2,y,-bd/2),V(-bw/2,y,-bd/2),V(-tw/2,h,td/2),V(tw/2,h,td/2),V(tw/2,h,-td/2),V(-tw/2,h,-td/2)];
    const panels=[[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7],[4,5,6,7]];
    const material=new THREE.MeshPhysicalMaterial({color:0xb5c4ce,metalness:0,roughness:.09,transmission:.72,thickness:.005,ior:1.49,clearcoat:1,clearcoatRoughness:.06,transparent:true,opacity:.19,side:THREE.DoubleSide,depthWrite:false});
    for(const face of panels){const a=[];for(const i of [face[0],face[1],face[2],face[0],face[2],face[3]])a.push(...points[i].toArray());const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(a,3));geo.computeVertexNormals();const m=mesh(geo,material,acrylicGroup);m.castShadow=false;m.receiveShadow=false;}
    const pairs=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
    for(const [a,b] of pairs){line([points[a],points[b]],acrylicGroup,0xd1e1eb,.7);rod(points[a],points[b],.0017,acrylicGroup,new THREE.MeshBasicMaterial({color:0xcbdce7,transparent:true,opacity:.35}));}
    for(const i of [0,1,2,3])cyl(.013,.013,.012,acrylicGroup,points[i].clone().add(V(0,-.008,0)),materials.steel);
    meta(acrylicGroup,information('acrylic','台形アクリル構造','底面は図面記載の1.618×1m。上面寸法と高さは参考図に合わせた仮値。高さは画面のスライダーで変更できます。図の斜辺付近の「1」は高さとして確定していません。',`底面 W 1.618 × D 1.000 m / H ${h.toFixed(3)} m（仮）/ 上面 約0.62 × 0.38 m`,'PDF p.7–8','再構成'));
    dimension(points[0],points[1],'1.618 m',acrylicDims,V(0,0,.13),.1);
    dimension(points[1],points[2],'1.000 m',acrylicDims,V(.16,0,0),.1);
    dimension(points[4],points[5],'約0.620 m',acrylicDims,V(0,.085,.04),.09);
    dimension(points[5],points[6],'約0.380 m',acrylicDims,V(.11,.07,0),.085);
    dimension(V(-bw/2,.022,bd/2),V(-bw/2,h,bd/2),`H ${h.toFixed(3)} m（仮）`,acrylicDims,V(-.13,0,0),.09);
    const slopeW=Math.sqrt(((bw-tw)/2)**2+(h-y)**2),slopeD=Math.sqrt(((bd-td)/2)**2+(h-y)**2);
    dimension(V(0,y,bd/2),V(0,h,td/2),`斜高 ${slopeD.toFixed(3)} m`,acrylicDims,V(0,0,.09),.08);
    dimension(V(bw/2,y,0),V(tw/2,h,0),`斜高 ${slopeW.toFixed(3)} m`,acrylicDims,V(.09,0,0),.08);
    space.dims.acrylicHeight=h;
  }
  function createArm(space){const g=group(space.layers.arm,'articulated-arm');
    box(.28,.055,.24,g,V(-.12,2.57,-.18),materials.metal);for(const x of [-.21,-.03])for(const z of [-.25,-.11])bolt(g,V(x,2.607,z),'y');
    const pts=[V(-.12,2.53,-.18),V(-.12,1.91,-.18),V(-.23,1.69,-.12),V(-.05,1.45,-.04),V(.015,1.31,.015)];
    for(let i=0;i<pts.length-1;i++){
      rod(pts[i],pts[i+1],i===0?.038:.028,g,materials.black);
      const d=pts[i+1].clone().sub(pts[i]);const brace=box(i===0?.075:.064,d.length()*.74,.052,g,pts[i].clone().lerp(pts[i+1],.5),materials.metal);brace.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());
      if(i>0)rod(pts[i].clone().add(V(.037,0,0)),pts[i+1].clone().add(V(.037,0,0)),.007,g,materials.steel);
    }
    for(let i=1;i<pts.length-1;i++){cyl(.057,.057,.085,g,pts[i],materials.metal,[Math.PI/2,0,0]);cyl(.032,.032,.094,g,pts[i],materials.black,[Math.PI/2,0,0]);bolt(g,pts[i].clone().add(V(0,0,.05)),'z',.009);}
    const head=group(g,'spot-head');head.position.copy(pts[4]);head.rotation.z=-.05;
    cyl(.04,.052,.11,head,V(0,-.025,0),materials.black);cyl(.037,.037,.01,head,V(0,-.084,0),materials.steel);
    cyl(.029,.029,.006,head,V(0,-.093,0),new THREE.MeshBasicMaterial({color:0xffffff}));
    for(let i=0;i<4;i++)cyl(.046,.046,.006,head,V(0,.014+i*.012,0),materials.metal);
    tube([V(-.15,2.57,-.22),V(-.18,2.15,-.22),V(-.19,1.9,-.23),V(-.32,1.69,-.16),V(-.12,1.45,-.12),V(-.03,1.32,-.03)],.007,space.layers.cables,materials.rubber,true);
    const spot=new THREE.SpotLight(0xffffff,11,5,.31,.6,1.5);spot.position.set(.015,1.22,.015);spot.target.position.set(0,.01,0);spot.castShadow=true;spot.shadow.mapSize.set(2048,2048);spot.shadow.bias=-.00008;spot.shadow.normalBias=.015;spot.shadow.camera.near=.1;spot.shadow.camera.far=5;space.layers.lights.add(spot,spot.target);
    // A very faint visible light volume makes the suspended spotlight readable.
    const cone=mesh(new THREE.ConeGeometry(.36,1.19,48,1,true),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.019,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}),space.layers.lights,V(.015,.625,.015));cone.castShadow=false;cone.receiveShadow=false;
    meta(g,information('robot-arm','天吊りアームとライト','天井固定具から複数関節のアームを吊り、先端のライトを浅間石へ向けて配置。関節構造・外装・ケーブル経路は資料イメージを基にした視覚的な再構成。','天井 H 2.6 m / ライト位置 約1.22 m','PDF p.7–8','再構成'));
    makeLabel('アーム / ライト',space.layers.labels,V(.43,1.66,-.03),{size:.095});
    space.robot=g;space.spot=spot;space.spotObjects=[spot,cone];
  }
  function ceilingServices(space){const w=space.dims.width,d=space.dims.depth,h=space.dims.height;
    for(const x of [-2.05,0,2.05])box(.023,.035,d-.3,space.layers.cables,V(x,h-.028,0),materials.metal);
    box(w-.3,.035,.045,space.layers.cables,V(0,h-.035,-d/2+.22),materials.metal);
    for(const x of [-2.1,-.7,.7,2.1])tube([V(x,h-.07,d/2-.55),V(x,h-.07,-d/2+.23),V(-.18,h-.07,-d/2+.23),V(-.18,h-.07,-.18)],.004,space.layers.cables);
    tube([V(-.18,h-.06,-.18),V(-.18,h-.06,-2.08),V(-3.16,h-.06,-2.08),V(-3.16,.12,-2.08)],.008,space.layers.cables);
    box(.12,.18,.055,space.layers.cables,V(-3.16,.14,-2.22),materials.metal);
  }
  const core=scenes.core=buildRoom(makeSpace('core',{...CORE_DIM}));
  for(let row=0;row<3;row++)for(let col=0;col<4;col++)speaker(core,-2.1+col*1.4,1.45-row*1.45,row*4+col+1);
  ceilingCamera(core,V(-.88,0,.24),1);ceilingCamera(core,V(-1.26,0,-.15),2);
  createStone(core);buildAcrylic(core,CORE_DIM.acrylicHeight);createArm(core);ceilingServices(core);
  makeLabel('De-symmetrical Core',core.layers.labels,V(0,.035,1.32),{size:.13,background:false,opacity:.7});
  function signalTexture(kind='projection'){
    const c=document.createElement('canvas');c.width=kind==='projection'?1536:600;c.height=kind==='projection'?600:1024;
    const ctx=c.getContext('2d'),w=c.width,h=c.height;
    ctx.fillStyle='#080b10';ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='#27313a';ctx.lineWidth=1;
    for(let x=32;x<w;x+=48){ctx.beginPath();ctx.moveTo(x,55);ctx.lineTo(x,h-30);ctx.stroke();}
    for(let y=64;y<h;y+=40){ctx.beginPath();ctx.moveTo(28,y);ctx.lineTo(w-28,y);ctx.stroke();}
    ctx.fillStyle='#bdc7ce';ctx.font='22px monospace';ctx.fillText('liberated frequencies',34,34);ctx.font='13px monospace';ctx.fillStyle='#798995';ctx.fillText('SIGNAL VISUALIZATION  /  SPATIAL RECONSTRUCTION',w-510,33);
    const channels=kind==='projection'?10:14,plotH=h*.58;
    for(let row=0;row<channels;row++){
      const y=74+row*(plotH/channels);ctx.fillStyle='#8b9aa7';ctx.font='12px monospace';ctx.fillText(`CH ${String(row+1).padStart(2,'0')}`,34,y+5);
      ctx.beginPath();for(let x=114;x<w-32;x+=2){const k=x/37;const n=Math.sin(k*.7+row*.8)*4+Math.sin(k*2.1+row)*2+Math.sin(k*5.3+row*3)*1.7+Math.pow(Math.sin(k*.18+row),14)*13;const py=y+n;if(x===114)ctx.moveTo(x,py);else ctx.lineTo(x,py);}ctx.strokeStyle=row%3===0?'#c4d2db':'#7d929f';ctx.lineWidth=1.3;ctx.stroke();
    }
    const top=h*.72;
    ctx.fillStyle='#101820';ctx.fillRect(30,top,w*.7,h*.23);ctx.strokeStyle='#c2d6e2';ctx.lineWidth=2;ctx.beginPath();
    for(let x=40;x<w*.72;x+=2){const v=Math.pow(Math.abs(Math.sin(x*.015)*Math.sin(x*.031)),3);const yy=top+h*.19-v*h*.16-(Math.sin(x*.073)*.5+.5)*h*.014;if(x===40)ctx.moveTo(x,yy);else ctx.lineTo(x,yy);}ctx.stroke();
    ctx.fillStyle='#8396a4';ctx.font='12px monospace';ctx.fillText('0         8         16         24         32         40 Hz',44,top+h*.22);
    const cx=w*.86,cy=top+h*.12,r=h*.105;ctx.fillStyle='#27343e';ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#a6b5bf';ctx.lineWidth=2;ctx.stroke();
    for(let i=0;i<9;i++){const a=i*2.4,rr=(i%3+1)*r*.24;ctx.fillStyle=i%3===0?'#c2d3df':'#778d9e';ctx.beginPath();ctx.arc(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr,4,0,Math.PI*2);ctx.fill();}
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);texturePool.push(t);return t;
  }
  function podium(space){
    // Two independent objects: a front rectangular EEG plinth and a rear
    // slender stand whose inclined face is nearly filled by a portrait panel.
    const g=group(space.layers.equipment,'eeg-plinth');g.position.set(0,0,.24);
    const w=.5,d=.32,plinthHeight=1.05;
    box(w,plinthHeight,d,g,V(0,plinthHeight/2,0),basic(0x191d22,{roughness:.67}));
    box(w+.012,.018,d+.012,g,V(0,plinthHeight+.009,0),materials.metal);
    box(.53,.025,.35,g,V(0,.014,0),materials.dark);
    for(let i=0;i<7;i++)box(.23,.005,.004,g,V(0,.17+i*.02,d/2+.003),materials.metal);
    meta(g,information('eeg-plinth','脳波計用の直方体台','前側に独立して置く脳波計用の台。後ろの傾斜ディスプレイ台とは分離した直方体です。寸法・間隔は資料と配置指示を基にした仮値。','約W 0.50 × D 0.32 × H 1.05 m（仮）','PDF p.5–6・配置指定','再構成'));
    const stand=group(space.layers.equipment,'portrait-monitor-stand');
    const sw=.26,backZ=-.455,frontZ=-.235,topY=1.405,frontY=1.024;
    const pts=[V(-sw/2,0,frontZ),V(sw/2,0,frontZ),V(sw/2,0,backZ),V(-sw/2,0,backZ),V(-sw/2,frontY,frontZ),V(sw/2,frontY,frontZ),V(sw/2,topY,backZ),V(-sw/2,topY,backZ)];
    const fs=[[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7],[4,5,6,7]],verts=[];for(const f of fs)for(const n of [f[0],f[1],f[2],f[0],f[2],f[3]])verts.push(...pts[n].toArray());const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.computeVertexNormals();mesh(geo,basic(0x14191f,{roughness:.66}),stand);
    box(.29,.025,.265,stand,V(0,.014,-.345),materials.dark);
    meta(stand,information('monitor-stand','縦型ディスプレイ用の傾斜台','奥側に独立して置く細身の傾斜ディスプレイ台。18.5インチ縦画面が斜面の大部分を占めます。図面の上端高さ1.4mを基準に、幅・奥行き・斜面角度を再構成。','上端 約1.40m / 斜面 約W0.26 × L0.44m（仮）','PDF p.5–6・配置指定','再構成'));
    const top=group(space.layers.screens,'monitor');top.position.set(0,1.2145,-.345);top.rotation.x=-Math.PI/6;
    box(.25,.43,.018,top,V(0,0,.002),materials.black);
    const display=mesh(new THREE.PlaneGeometry(.2304,.4095),new THREE.MeshBasicMaterial({map:signalTexture('monitor'),toneMapped:false}),top,V(0,0,.012));display.castShadow=false;
    cyl(.0015,.0015,.002,top,V(.111,-.207,.013),new THREE.MeshBasicMaterial({color:0xd4e5dc}),[Math.PI/2,0,0]);
    meta(top,information('monitor','18.5インチ 縦型モニター','奥の傾斜台の斜面をほぼ埋める縦型ディスプレイ。画面上の波形は空間の見え方を確認するための模式表示です。実測データや完成作品の映像ではありません。','18.5インチ / 縦表示 約W0.2304 × H0.4095m（16:9仮定）','PDF p.5–6・縦置き指定','再構成'));
    // OpenBCI UltraCortex: an open lattice cap with eight sensor housings.
    const eeg=group(space.layers.equipment,'eeg-device');eeg.position.set(0,1.075,.24);
    const capRadius=.086;
    for(const latitude of [.3,.62,1.02,1.42]){const r=Math.sin(latitude)*capRadius,yy=Math.cos(latitude)*capRadius;const pts=[];for(let i=0;i<=48;i++){const a=i/48*Math.PI*2;pts.push(V(Math.cos(a)*r,yy,Math.sin(a)*r));}tube(pts,.003,eeg,materials.metal);}
    for(let j=0;j<8;j++){const a=j/8*Math.PI*2;const pts=[];for(let i=0;i<=18;i++){const t=i/18*Math.PI*.5;pts.push(V(Math.cos(a)*Math.sin(t)*capRadius,Math.cos(t)*capRadius,Math.sin(a)*Math.sin(t)*capRadius));}tube(pts,.003,eeg,materials.metal);}
    for(let i=0;i<8;i++){const a=i*Math.PI*.764,t=i<2?.34:i<5?.78:1.18;const p=V(Math.cos(a)*Math.sin(t)*capRadius,Math.cos(t)*capRadius,Math.sin(a)*Math.sin(t)*capRadius);const sensor=cyl(.009,.011,.015,eeg,p,materials.black);sensor.quaternion.setFromUnitVectors(V(0,1,0),p.clone().normalize());const cap=cyl(.006,.006,.016,eeg,p.clone().multiplyScalar(1.05),materials.steel);cap.quaternion.copy(sensor.quaternion);}
    box(.025,.02,.044,eeg,V(0,.025,-.08),materials.black);
    tube([V(0,.02,-.08),V(.03,0,-.1),V(.05,-.06,-.12)],.0025,eeg,materials.rubber,true);
    meta(eeg,information('eeg','OpenBCI UltraCortex 8ch','機材表記載のUltraCortexを、格子状ヘッドキャップと8個のセンサーで模式的に再構成。実機の細部や保存時の向きは推定です。','8ch / キャップ形状 約W0.18 × D0.18 × H0.10m（推定）','PDF p.6・p.9','再構成'));
    // The central earphone position is separate from the two headphone tripods.
    const ear=group(space.layers.equipment,'earphones');ear.position.set(-.39,1.08,.24);
    cyl(.006,.008,1.035,ear,V(0,-.547,0),materials.metal);cyl(.062,.075,.016,ear,V(0,-1.064,0),materials.black);
    rod(V(-.034,0,0),V(.034,0,0),.004,ear,materials.steel);
    for(const sx of [-.023,.023]){cyl(.007,.007,.013,ear,V(sx,-.022,.008),materials.white,[Math.PI/2,0,.4]);tube([V(sx,-.022,.009),V(sx*1.6,-.13,.025),V(0,-.37,.025),V(.01,-1.05,0)],.0014,ear,materials.rubber,true);}
    tube([V(-.39,.026,.24),V(-.28,.026,-.18),V(.08,.026,-.32),V(.08,.47,-.32)],.002,space.layers.cables,materials.rubber,true);
    meta(ear,information('earphones','イヤフォンと専用スタンド','ヘッドフォンの三脚とは別の中央寄りの位置に、イヤフォン1組と細い専用スタンドを配置。形状・寸法は資料図からの再構成。','1組 / スタンド高さ 約1.08m（推定）','PDF p.6','再構成'));
    // The source lists two hidden PCs and one audio interface inside the stand.
    const internals=group(g,'hidden-electronics');box(.44,.015,.27,internals,V(0,.245,0),materials.metal);
    for(const x of [-.115,.115]){const pc=group(internals,'hidden-pc');pc.position.set(x,.365,-.03);box(.17,.22,.23,pc,V(0,0,0),materials.black);for(let i=0;i<6;i++)box(.11,.004,.003,pc,V(0,-.06+i*.016,.117),materials.metal);cyl(.008,.008,.003,pc,V(.055,.075,.118),materials.steel,[Math.PI/2,0,0]);meta(pc,information(`pc-${x<0?1:2}`,`PC ${x<0?1:2}（什器内）`,'機材表のPC2台を什器内部の棚に収納。通常の外観では筐体に隠れる配置。','2台 / 隠し収納','PDF p.6・p.9','再構成'));}
    box(.43,.012,.27,internals,V(0,.58,-.03),materials.metal);
    const audio=group(internals,'audio-interface');box(.32,.045,.18,audio,V(0,.615,-.03),materials.metal);for(const x of [-.11,-.065,.065,.11])cyl(.012,.012,.009,audio,V(x,.615,.065),materials.black,[Math.PI/2,0,0]);meta(audio,information('audio-interface','オーディオインターフェース（什器内）','機材表のオーディオインターフェース1台を什器内部に収納。','1台 / 隠し収納','PDF p.6・p.9','再構成'));
    makeLabel('18.5″ 縦型ディスプレイ',space.layers.labels,V(.43,1.39,-.37),{size:.09});makeLabel('脳波計 / 前側の台',space.layers.labels,V(.34,1.19,.36),{size:.08});makeLabel('イヤフォン',space.layers.labels,V(-.43,1.27,.24),{size:.08});
    dimension(V(-.25,0,.40),V(.25,0,.40),'台 W 約0.50 m',space.layers.dimensions,V(0,0,.15),.09);
    dimension(V(.25,0,.40),V(.25,0,.08),'台 D 約0.32 m',space.layers.dimensions,V(.15,0,0),.08);
    dimension(V(-.13,0,-.455),V(-.13,1.405,-.455),'上端 約1.40 m',space.layers.dimensions,V(-.20,0,0),.09);
    dimension(V(-.1152,1.2145,-.345),V(.1152,1.2145,-.345),'縦画面 W 0.230 m',space.layers.dimensions,V(0,.05,.12),.075);
  }
  function headphones(parent,pos){const g=group(parent,'headphone');g.position.copy(pos);
    const band=new THREE.Mesh(new THREE.TorusGeometry(.064,.007,10,32,Math.PI),materials.black);g.add(band);
    const pad=new THREE.Mesh(new THREE.TorusGeometry(.064,.004,8,32,Math.PI),materials.metal);pad.position.z=-.003;g.add(pad);
    for(const x of [-.066,.066]){rod(V(x,0,0),V(x,-.035,0),.004,g,materials.metal);cyl(.027,.027,.018,g,V(x,-.04,0),materials.black,[0,0,Math.PI/2]);cyl(.021,.021,.021,g,V(x,-.04,0),materials.rubber,[0,0,Math.PI/2]);}
    return g;
  }
  function headphoneStand(space,x,index){const g=group(space.layers.headphones,`headphone-stand-${index}`);g.position.x=x;g.position.z=.3;
    cyl(.009,.012,1.06,g,V(0,.55,0),materials.metal);cyl(.015,.015,.065,g,V(0,.57,0),materials.black);
    for(let i=0;i<3;i++){const a=i*Math.PI*2/3;rod(V(0,.12,0),V(Math.cos(a)*.19,.025,Math.sin(a)*.19),.007,g);cyl(.014,.014,.012,g,V(Math.cos(a)*.19,.014,Math.sin(a)*.19),materials.rubber);}
    rod(V(-.17,1.07,0),V(.17,1.07,0),.006,g,materials.metal);
    headphones(g,V(-.09,1.075,0));headphones(g,V(.09,1.075,0));
    for(const offset of [-.09,.09])tube([V(x+offset-.065,1.03,.3),V(x+offset-.09,.67,.33),V(x+offset,.045,.33),V(x*.7,.025,.05),V(.15,.025,-.32),V(.15,.47,-.32)],.0025,space.layers.cables,materials.rubber,true);
    meta(g,information(`headphones-${index}`,`ヘッドフォンスタンド ${index}`,'図面の左右のスタンドに、それぞれ2組のヘッドフォンを配置。支柱・三脚とケーブルは視認のための再構成。','各2組 / 合計4組','PDF p.6','PDF記載'));
    makeLabel(`ヘッドフォン ×2`,space.layers.labels,V(x,1.29,.35),{size:.09});
  }
  function createProjection(space){const g=group(space.layers.screens,'projection');g.position.set(0,2.12,-1.458);
    const panel=mesh(new THREE.PlaneGeometry(2.42,.86),new THREE.MeshBasicMaterial({map:signalTexture('projection'),toneMapped:false}),g);panel.castShadow=false;
    const glow=new THREE.PointLight(0x9eabbc,.7,2.6,2);glow.position.set(0,2.1,-1.1);space.layers.lights.add(glow);
    meta(g,information('projection','壁面プロジェクション','図面の横長投影を壁面に再構成。波形・周波数スペクトル・頭皮図は模式的な画像です。資料の完成映像や計測データは使用していません。','約W 2.42 × H 0.86 m（推定）','PDF p.5–6','再構成'));
    const projector=group(space.layers.equipment,'ceiling-projector');projector.position.set(0,2.82,.75);
    box(.27,.11,.2,projector,V(0,0,0),basic(0x33373b,{roughness:.5}));cyl(.026,.028,.04,projector,V(-.067,-.009,-.115),materials.black,[Math.PI/2,0,0]);
    cyl(.019,.019,.003,projector,V(-.067,-.009,-.118),new THREE.MeshStandardMaterial({color:0x9aafc7,emissive:0x758fa9,emissiveIntensity:.3,roughness:.1,metalness:1}),[Math.PI/2,0,0]);
    cyl(.008,.008,.14,projector,V(0,.12,0),materials.steel);box(.1,.018,.1,projector,V(0,.194,0),materials.metal);
    for(let i=0;i<7;i++)box(.04,.004,.003,projector,V(.095,-.027+i*.009,-.102),materials.dark);
    tube([V(.12,2.84,.75),V(.14,2.96,.75),V(.14,2.96,-1.37),V(1.39,2.96,-1.37),V(1.39,.05,-1.37),V(.15,.025,-.32)],.006,space.layers.cables);
    meta(projector,information('projector','会場プロジェクター','天井設置の会場プロジェクターを模式形状として再構成。実機の機種、レンズ、吊り位置は未確定。','天井 H 3.0 m / 位置は仮定','PDF p.6','再構成'));
    makeLabel('壁面プロジェクション',space.layers.labels,V(0,2.68,-1.4),{size:.12,opacity:.85});
  }
  const frequencies=scenes.frequencies=buildRoom(makeSpace('frequencies',{...FREQ_DIM}));
  const beam=group(frequencies.room,'overhead-beam');box(.28,1,1.6,beam,V(1.36,2.5,-.68),basic(0x202327,{roughness:.9}));meta(beam,information('overhead-beam','梁・下端高さ2m','側面図に示された下端2mの梁を右奥に再構成。平面位置・梁幅は資料から確定できないため仮の配置。','室高3.0m / 梁下端2.0m / 平面位置は仮','PDF p.6','再構成'));const beamDimensions=group(frequencies.layers.dimensions,'beam-dimensions');dimension(V(1.2,0,-.55),V(1.2,2,-.55),'梁下 2.0 m',beamDimensions,V(.06,0,.09),.10);
  podium(frequencies);headphoneStand(frequencies,-.91,1);headphoneStand(frequencies,.91,2);createProjection(frequencies);
  const freqKey=new THREE.SpotLight(0xe2e6ed,17,6,.8,.8,1.5);freqKey.position.set(0,2.8,1.05);freqKey.target.position.set(0,.8,0);freqKey.castShadow=true;freqKey.shadow.mapSize.set(1024,1024);freqKey.shadow.normalBias=.02;frequencies.layers.lights.add(freqKey,freqKey.target);
  makeLabel('liberated frequencies',frequencies.layers.labels,V(0,.03,1.05),{size:.12,background:false,opacity:.75});
  frequencies.group.visible=false;
  // One shared physical venue floor; standalone proposal rooms are omitted.
  const venueModel=buildVenueArchitecture({label:makeLabel,register:meta});
  const venueRoot=group(world,'venue');
  venue=scenes.venue={group:venueRoot,layers:{},layerTargets:{},dims:{...(venueModel.dimensions||{width:15,depth:13.5,height:2.6})},walls:[],roof:null,model:venueModel};
  for(const n of LAYERS){venue.layers[n]=group(venueRoot,`venue-${n}`);venue.layerTargets[n]=[];}
  const architectureRoot=venueModel.group||venueModel;
  venueRoot.add(architectureRoot);
  for(const [n,g]of Object.entries(venueModel.layerGroups||{})){if(venue.layers[n])venueRoot.remove(venue.layers[n]);venue.layers[n]=g;venue.layerTargets[n].push(g);}
  venue.anchors=venueModel.anchors||{core:{position:[3.75,0,3.4],rotationY:Math.PI/2},frequencies:{position:[3.75,0,9.9],rotationY:Math.PI},bar:{position:[10.64,0,2.79]},entrance:{position:[8.16,0,-.32]}};
  function anchorValues(name){const raw=venue.anchors[name]||(name==='counter'?venue.anchors.bar:null)||{};const position=Array.isArray(raw)?raw:(raw.position||raw.center||[0,0,0]);return {position,rotationY:raw.rotationY??raw.rotation??0};}
  function cloneInstallation(space,name){
    const cloned=space.group.clone(true);cloned.name=`${name}-installation`;cloned.visible=true;
    const originalObjects=[],clonedObjects=[],objectMap=new Map();space.group.traverse(o=>originalObjects.push(o));cloned.traverse(o=>clonedObjects.push(o));
    originalObjects.forEach((o,i)=>objectMap.set(o,clonedObjects[i]));
    // A SpotLight target is a separate Object3D. Use its sibling clone so that
    // both light and aim follow the installation's rotation and translation.
    originalObjects.forEach(o=>{if(o.isSpotLight||o.isDirectionalLight){const copy=objectMap.get(o);copy.target=objectMap.get(o.target)||o.target.clone();if(!copy.target.parent)cloned.add(copy.target);}});
    const roomCopy=objectMap.get(space.room);if(roomCopy)roomCopy.removeFromParent();
    const dims=objectMap.get(space.layers.dimensions);dims?.getObjectByName('room-dimensions')?.removeFromParent();dims?.getObjectByName('beam-dimensions')?.removeFromParent();
    const anchor=anchorValues(name);cloned.position.set(...anchor.position);cloned.rotation.y=anchor.rotationY;
    venueRoot.add(cloned);
    for(const n of LAYERS){const copy=objectMap.get(space.layers[n]);if(copy)venue.layerTargets[n].push(copy);}
    venue.layerTargets[name==='core'?'coreWork':'frequenciesWork'].push(cloned);
    return {group:cloned,map:objectMap};
  }
  const venueCore=cloneInstallation(core,'core'),venueFrequencies=cloneInstallation(frequencies,'frequencies');
  makeLabel('De-symmetrical Core',venue.layers.labels,V(6.2,.18,3.4),{size:.28,opacity:.95});
  makeLabel('liberated frequencies',venue.layers.labels,V(3.75,.18,8.65),{size:.28,opacity:.95});
  venue.coreClone=venueCore.group;venue.frequencyClone=venueFrequencies.group;venue.coreRobot=venueCore.map.get(core.robot);venue.coreSpot=venueCore.map.get(core.spot);
  venue.spotObjects=core.spotObjects.map(o=>venueCore.map.get(o));
  function syncVenueAcrylic(){
    if(!venue?.coreClone)return;
    const cloneLayer=venueCore.map.get(core.layers.acrylic);cloneLayer.clear();for(const o of core.layers.acrylic.children)cloneLayer.add(o.clone(true));
    const cloneDims=venueCore.map.get(core.layers.dimensions);cloneDims.getObjectByName('acrylic-dimensions')?.removeFromParent();cloneDims.add(acrylicDims.clone(true));
  }
  function applyLayer(name,visible){
    for(const space of Object.values(scenes)){if(space.layers[name])space.layers[name].visible=visible;if(space.layerTargets?.[name])for(const obj of space.layerTargets[name])obj.visible=visible;}
    if(name==='arm'||name==='lights'){core.spotObjects.forEach(o=>o.visible=layerState.arm&&layerState.lights);venue?.spotObjects?.forEach(o=>o.visible=layerState.arm&&layerState.lights);}
  }
  core.group.visible=false;frequencies.group.visible=false;venueRoot.visible=true;
  for(const n of LAYERS)applyLayer(n,layerState[n]);

  const selectionBox=new THREE.Box3Helper(new THREE.Box3(),0xa1bacb);selectionBox.visible=false;selectionBox.material.transparent=true;selectionBox.material.opacity=.5;selectionBox.material.depthTest=false;world.add(selectionBox);
  function select(object){
    selected=object;
    if(!object){selectionBox.visible=false;callbacks.onSelect?.(null);return;}
    selectionBox.box.setFromObject(object).expandByScalar(.025);selectionBox.visible=true;
    callbacks.onSelect?.({...object.userData.info});
  }
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
  function onPointerDown(event){pointerStart={x:event.clientX,y:event.clientY};}
  function onPointerUp(event){
    if(!pointerStart||Math.hypot(event.clientX-pointerStart.x,event.clientY-pointerStart.y)>5)return;
    const rect=renderer.domElement.getBoundingClientRect();pointer.set(((event.clientX-rect.left)/rect.width)*2-1,-((event.clientY-rect.top)/rect.height)*2+1);raycaster.setFromCamera(pointer,camera);
    const hits=raycaster.intersectObjects(scenes[currentScene].group.children,true),candidates=[];
    for(const hit of hits){if(!hit.object.isMesh)continue;if(currentScene==='venue'&&cutaway&&hit.object.userData.cutawayWall)continue;let obj=hit.object,visible=true;while(obj){if(!obj.visible)visible=false;obj=obj.parent;}if(!visible)continue;
      obj=hit.object;while(obj&&!obj.userData.info)obj=obj.parent;if(obj?.userData.info&&!candidates.includes(obj))candidates.push(obj);}
    // Transparent acrylic should not prevent selecting the stone visible through it.
    const throughGlass=candidates[0]?.userData.info.id==='acrylic'?candidates.find(o=>o.userData.info.id==='stone'):null;
    select(throughGlass||candidates[0]||null);
  }
  function onKey(event){const step=.15;if(event.key==='Escape'){select(null);return;}if(event.key==='Home'){api.reset();event.preventDefault();return;}if(event.key==='+'||event.key==='='){camera.position.lerp(controls.target,.12);event.preventDefault();}if(event.key==='-'){camera.position.add(camera.position.clone().sub(controls.target).multiplyScalar(.12));event.preventDefault();}if(event.key==='ArrowLeft'||event.key==='ArrowRight'){const delta=event.key==='ArrowLeft'?-step:step;const v=camera.position.clone().sub(controls.target);v.applyAxisAngle(V(0,1,0),delta);camera.position.copy(controls.target).add(v);event.preventDefault();}if(event.key==='ArrowUp'||event.key==='ArrowDown'){camera.position.y+=event.key==='ArrowUp'?step:-step;event.preventDefault();}}
  renderer.domElement.addEventListener('pointerdown',onPointerDown);renderer.domElement.addEventListener('pointerup',onPointerUp);renderer.domElement.addEventListener('keydown',onKey);
  let lastFitFactor=1;
  const fitMultiplier=view=>['detail','visitor'].includes(view)||view.startsWith('venue-')?Math.min(1.18,Math.max(1,1/camera.aspect)):Math.min(3,Math.max(1,(1/camera.aspect)*(camera.aspect<.8?1.15:1)));
  function setView(view='perspective'){
    const coreScene=currentScene==='core';
    const views=currentScene==='venue'?{
      perspective:{pos:[23,18,-16],target:[6,.4,4.7],fov:43},
      front:{pos:[29,6.8,4.8],target:[5.5,.7,4.8],fov:43},
      top:{pos:[5.4,28,5.05],target:[5.4,0,5.0],fov:43},
      side:{pos:[5.5,8.2,27],target:[5.5,.5,4.8],fov:43},
      visitor:{pos:[8.2,1.65,1.4],target:[4.1,.75,4.5],fov:68},
      detail:{pos:[9.55,4.9,-1.55],target:[3.75,.65,3.4],fov:43}
    }:coreScene?{
      perspective:{pos:[5.9,4.1,8.0],target:[0,.72,0],fov:42},front:{pos:[0,1.65,8.6],target:[0,1.25,0],fov:42},top:{pos:[0,9.8,.005],target:[0,.4,0],fov:42},side:{pos:[9,2.7,.03],target:[0,1.15,0],fov:42},visitor:{pos:[0,1.62,3.55],target:[0,.81,-.08],fov:55},detail:{pos:[1.8,1.5,2.35],target:[0,.56,0],fov:43}
    }:{perspective:{pos:[3.8,3.1,5.5],target:[0,1.25,0],fov:42},front:{pos:[0,1.8,6.5],target:[0,1.45,0],fov:42},top:{pos:[0,7.3,.005],target:[0,.8,0],fov:42},side:{pos:[6,2.5,.03],target:[0,1.35,0],fov:42},visitor:{pos:[0,1.65,2.2],target:[0,1.6,-.3],fov:65},detail:{pos:[1.1,1.85,1.6],target:[0,1.15,0],fov:45}};
    const v=views[view]||views.perspective;camera.position.set(...v.pos);controls.target.set(...v.target);lastFitFactor=fitMultiplier(view);camera.position.sub(controls.target).multiplyScalar(lastFitFactor).add(controls.target);camera.fov=v.fov;camera.updateProjectionMatrix();controls.update();
    api.view=view;
  }
  function updateCutaway(){const space=scenes[currentScene];if(currentScene==='venue'){
      architectureRoot.traverse(o=>{if(o.userData.cutawayRoof)o.visible=!cutaway;if(o.userData.cutawayWall&&o.material){const ms=Array.isArray(o.material)?o.material:[o.material];for(const m of ms){if(m.userData.originalOpacity===undefined){m.userData.originalOpacity=m.opacity;m.userData.originalTransparent=m.transparent;m.userData.originalDepthWrite=m.depthWrite;}m.opacity=cutaway?.18:m.userData.originalOpacity;m.transparent=cutaway||m.userData.originalTransparent;m.depthWrite=cutaway?false:m.userData.originalDepthWrite;}}});return;}
    if(space.roof)space.roof.visible=!cutaway;for(const wall of space.walls){if(!cutaway){wall.o.visible=true;continue;}const p=camera.position;wall.o.visible=wall.side==='back'?p.z>-.1:wall.side==='left'?p.x>-.2:p.x<.2;}}
  const api={
    renderer,camera,controls,scene:world,view:'perspective',
    setScene(name){if(!scenes[name])return;currentScene=name;world.fog.density=name==='venue'?.005:.027;for(const [key,space]of Object.entries(scenes))space.group.visible=key===name;select(null);setView('perspective');callbacks.onSceneChange?.(name);},
    setView,
    setVenueFocus(name){if(currentScene!=='venue')api.setScene('venue');const a=anchorValues(name==='bar'?'counter':name);const target=V(...a.position);if(name==='core')target.y=.7;else if(name==='frequencies')target.y=1.1;else target.y=.9;const offsets={core:[5.5,3.8,-4.4],frequencies:[3.1,2.8,-3.6],bar:[3.3,3.2,4.8],entrance:[4.5,3.6,4.2]};camera.position.copy(target).add(V(...(offsets[name]||offsets.core)));controls.target.copy(target);camera.fov=48;camera.updateProjectionMatrix();controls.update();api.view=`venue-${name}`;lastFitFactor=1;},
    setLayer(name,visible){if(!(name in layerState))return;layerState[name]=!!visible;applyLayer(name,!!visible);},
    setExposure(value){renderer.toneMappingExposure=THREE.MathUtils.clamp(Number(value)||1,.25,3);},
    setAutoRotate(value){controls.autoRotate=!!value;},
    setCutaway(value){cutaway=!!value;updateCutaway();},
    setAcrylicHeight(value){const h=THREE.MathUtils.clamp(Number(value)||.618,.35,1);buildAcrylic(core,h);syncVenueAcrylic();if(selected?.userData.info?.id==='acrylic')select(currentScene==='venue'?venue.coreClone.getObjectByName('acrylic-frustum'):acrylicGroup);},
    setAnimation(value){animation=!!value;if(!animation){core.robot.rotation.y=0;core.spot.position.set(.015,1.22,.015);if(venue){venue.coreRobot.rotation.y=0;venue.coreSpot.position.set(.015,1.22,.015);venue.coreSpot.target.position.set(0,.01,0);}}},
    reset(){controls.autoRotate=false;animation=false;core.robot.rotation.y=0;if(venue)venue.coreRobot.rotation.y=0;renderer.toneMappingExposure=1.18;setView('perspective');select(null);},
    capture(){renderer.render(world,camera);return renderer.domElement.toDataURL('image/png');},
    resize(){const w=Math.max(container.clientWidth,1),h=Math.max(container.clientHeight,1);renderer.setSize(w,h);camera.aspect=w/h;const factor=fitMultiplier(api.view);camera.position.sub(controls.target).multiplyScalar(factor/lastFitFactor).add(controls.target);lastFitFactor=factor;camera.updateProjectionMatrix();},
    getState(){const space=scenes[currentScene],hasCore=currentScene!=='frequencies',hasFrequencies=currentScene!=='core';const objects=[];space.group.traverse(o=>{if(o.userData.info)objects.push({...o.userData.info});});return {currentScene,scene:currentScene,view:api.view,cutaway,animation,autoRotate:controls.autoRotate,exposure:renderer.toneMappingExposure,layers:{...layerState},dimensions:{...space.dims},coreDimensions:{...core.dims},frequencyDimensions:{...frequencies.dims},venueDimensions:{...venue.dims},venueAnchors:venue.anchors,counts:{speakers:hasCore?12:0,cameras:hasCore?2:0,stones:hasCore?1:0,robotArms:hasCore?1:0,acrylicStructures:hasCore?1:0,headphones:hasFrequencies?4:0,headphoneStands:hasFrequencies?2:0,projectors:hasFrequencies?1:0,monitors:hasFrequencies?1:0,computers:hasFrequencies?2:0,pcs:hasFrequencies?2:0,audioInterfaces:hasFrequencies?1:0,eegDevices:hasFrequencies?1:0,earphones:hasFrequencies?1:0,fixtures:hasFrequencies?2:0,eegPlinths:hasFrequencies?1:0,monitorStands:hasFrequencies?1:0},objects,provisional:{acrylicHeight:true,acrylicTop:true,frequencyDepth:true,stoneGeometry:true},cameraPosition:camera.position.toArray(),target:controls.target.toArray()};},
    dispose(){destroyed=true;cancelAnimationFrame(raf);observer?.disconnect();renderer.domElement.removeEventListener('pointerdown',onPointerDown);renderer.domElement.removeEventListener('pointerup',onPointerUp);renderer.domElement.removeEventListener('keydown',onKey);controls.dispose();world.traverse(o=>{o.geometry?.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose();});texturePool.forEach(t=>t.dispose());renderer.dispose();renderer.domElement.remove();}
  };
  let observer;
  if(typeof ResizeObserver!=='undefined'){observer=new ResizeObserver(()=>api.resize());observer.observe(container);}
  world.fog.density=.005;api.resize();setView('perspective');
  function frame(){if(destroyed)return;raf=requestAnimationFrame(frame);const elapsed=clock.getElapsedTime();if(animation){core.robot.rotation.y=Math.sin(elapsed*.18)*.09;core.spot.position.x=.015+Math.sin(elapsed*.18)*.035;core.spot.target.position.x=Math.sin(elapsed*.18)*.045;if(venue){venue.coreRobot.rotation.y=core.robot.rotation.y;venue.coreSpot.position.copy(core.spot.position);venue.coreSpot.target.position.copy(core.spot.target.position);}}
    controls.update();updateCutaway();renderer.render(world,camera);
  }
  frame();requestAnimationFrame(()=>callbacks.onReady?.(api.getState()));
  return api;
}
