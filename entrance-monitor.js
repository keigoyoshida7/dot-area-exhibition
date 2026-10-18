import * as THREE from 'three';

const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);

/** Generic borrowed-planned portrait sign, built at the origin facing local +Z. */
export function buildEntranceMonitor({register}={}) {
  const group=new THREE.Group();group.name='entrance-information-monitor';
  const geometries=[],materials=[],textures=[];
  const standard=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.62,metalness:.22,...extra});materials.push(m);return m;};
  const M={case:standard(0x111315),bezel:standard(0x242729,{roughness:.46,metalness:.46}),back:standard(0x17191b,{roughness:.8}),stand:standard(0x202325,{roughness:.48,metalness:.63}),base:standard(0x171a1c,{roughness:.52,metalness:.53}),rubber:standard(0x090a0b,{roughness:1,metalness:0}),steel:standard(0x4c5153,{roughness:.4,metalness:.72})};
  function mesh(geometry,material,parent=group,pos){geometries.push(geometry);const o=new THREE.Mesh(geometry,material);if(pos)o.position.copy(pos);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
  function box(w,h,d,pos,mat=M.case,parent=group){return mesh(new THREE.BoxGeometry(w,h,d),mat,parent,pos);}
  function cylinder(r,h,pos,mat=M.steel,parent=group){return mesh(new THREE.CylinderGeometry(r,r,h,18),mat,parent,pos);}
  function rod(a,b,r,mat=M.stand,parent=group){const direction=b.clone().sub(a);const o=cylinder(r,direction.length(),a.clone().lerp(b,.5),mat,parent);o.quaternion.setFromUnitVectors(V(0,1,0),direction.normalize());return o;}
  const screenWidth=.53,screenHeight=.94,displayCenterHeight=1.22,frameWidth=.574,frameHeight=.988,bodyDepth=.045;
  const baseWidth=.64,baseDepth=.48;
  // A low weighted plate and rubber feet form a stable, compact floor footprint.
  const shape=new THREE.Shape(),w=baseWidth/2,d=baseDepth/2,r=.028;
  shape.moveTo(-w+r,-d);shape.lineTo(w-r,-d);shape.quadraticCurveTo(w,-d,w,-d+r);shape.lineTo(w,d-r);shape.quadraticCurveTo(w,d,w-r,d);shape.lineTo(-w+r,d);shape.quadraticCurveTo(-w,d,-w,d-r);shape.lineTo(-w,-d+r);shape.quadraticCurveTo(-w,-d,-w+r,-d);
  const base=mesh(new THREE.ExtrudeGeometry(shape,{depth:.024,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.005,bevelThickness:.003,curveSegments:5}),M.base,group,V(0,.015,0));base.rotation.x=-Math.PI/2;base.name='entrance-monitor-weighted-base';
  for(const x of [-.255,.255])for(const z of [-.175,.175]){const foot=cylinder(.020,.012,V(x,.006,z),M.rubber);foot.name='entrance-monitor-rubber-foot';}
  box(.108,.018,.118,V(0,.052,-.065),M.stand).name='entrance-monitor-base-socket';
  box(.068,1.12,.062,V(0,.62,-.078),M.stand).name='entrance-monitor-upright';
  box(.084,.055,.078,V(0,.91,-.078),M.bezel).name='entrance-monitor-height-collar';
  // Slim generic display body with no unprovided manufacturer or model marks.
  const body=box(frameWidth,frameHeight,bodyDepth,V(0,displayCenterHeight,0),M.case);body.name='entrance-monitor-portrait-body';
  box(frameWidth-.018,frameHeight-.018,.009,V(0,displayCenterHeight,.024),M.bezel).name='entrance-monitor-front-bezel';
  box(.515,.874,.015,V(0,displayCenterHeight,-.028),M.back).name='entrance-monitor-rear-cover';
  box(.155,.175,.021,V(0,1.20,-.045),M.steel).name='entrance-monitor-vesa-plate';
  box(.075,.15,.068,V(0,1.16,-.087),M.stand).name='entrance-monitor-rear-mount';
  for(const x of [-.050,.050])for(const y of [1.15,1.25]){const bolt=cylinder(.0045,.004,V(x,y,-.058),M.steel);bolt.rotation.x=Math.PI/2;bolt.name='entrance-monitor-mount-bolt';}
  for(let i=0;i<8;i++)box(.20,.005,.002,V(.095,.88+i*.014,-.037),M.rubber).name='entrance-monitor-rear-vent';
  box(.047,.024,.004,V(-.17,.80,-.039),M.rubber).name='entrance-monitor-cable-port';
  const placeholderText=['Dot Area','De-symmetrical Core','liberated frequencies','展示のご案内','詳細内容は準備中（仮表示）'];
  let texture=null;
  if(typeof document!=='undefined'){
    const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=2128;const ctx=canvas.getContext('2d');
    ctx.fillStyle='#080808';ctx.fillRect(0,0,1200,2128);
    const center=600,left=112,right=1088;
    ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.font='500 29px "Hiragino Sans", "Noto Sans JP", sans-serif';ctx.letterSpacing='5px';ctx.fillStyle='#999999';ctx.fillText('EXHIBITION GUIDE',center,160);ctx.letterSpacing='0px';
    ctx.fillStyle='#f4f4f4';ctx.font='500 146px "Hiragino Mincho ProN", "Yu Mincho", Georgia, serif';ctx.fillText('Dot Area',center,378);
    ctx.strokeStyle='#6e6e6e';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(left,480);ctx.lineTo(right,480);ctx.stroke();
    ctx.font='400 59px "Hiragino Mincho ProN", "Yu Mincho", serif';ctx.fillText('展示のご案内',center,618);
    ctx.textAlign='left';ctx.font='400 28px sans-serif';ctx.fillStyle='#898989';ctx.fillText('01',left,824);
    ctx.fillStyle='#eeeeee';ctx.font='400 75px "Hiragino Mincho ProN", "Yu Mincho", Georgia, serif';ctx.fillText('De-symmetrical',left,928);ctx.fillText('Core',left,1024);
    ctx.fillStyle='#898989';ctx.font='400 28px sans-serif';ctx.fillText('02',left,1225);
    ctx.fillStyle='#eeeeee';ctx.font='400 75px "Hiragino Mincho ProN", "Yu Mincho", Georgia, serif';ctx.fillText('liberated',left,1329);ctx.fillText('frequencies',left,1425);
    ctx.strokeStyle='#4c4c4c';ctx.beginPath();ctx.moveTo(left,1604);ctx.lineTo(right,1604);ctx.stroke();
    ctx.textAlign='center';ctx.fillStyle='#dfdfdf';ctx.font='400 49px "Hiragino Sans", "Noto Sans JP", sans-serif';ctx.fillText('詳細内容は準備中',center,1768);
    ctx.fillStyle='#a5a5a5';ctx.font='400 36px "Hiragino Sans", "Noto Sans JP", sans-serif';ctx.fillText('（仮表示）',center,1841);
    texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;textures.push(texture);
  }
  const screenMaterial=new THREE.MeshBasicMaterial({color:texture?0xffffff:0x080808,map:texture,toneMapped:false});materials.push(screenMaterial);
  const screen=mesh(new THREE.PlaneGeometry(screenWidth,screenHeight),screenMaterial,group,V(0,displayCenterHeight,.029));screen.castShadow=false;screen.name='entrance-monitor-portrait-screen';screen.userData={kind:'entrance-information-screen',isPortrait:true,placeholder:true,placeholderText};
  // Cabling is gathered along the rear upright and stays inside the base area.
  const cablePath=new THREE.CatmullRomCurve3([V(-.17,.795,-.044),V(-.14,.72,-.07),V(.018,.66,-.115),V(.018,.30,-.117),V(.03,.075,-.12),V(.15,.043,-.17),V(.23,.043,-.16)]);
  const cable=mesh(new THREE.TubeGeometry(cablePath,60,.0037,7,false),M.rubber);cable.name='entrance-monitor-gathered-power-cable';
  for(const y of [.27,.52,.77])box(.080,.012,.012,V(0,y,-.115),M.rubber).name='entrance-monitor-cable-clip';
  const dimensions={screenWidth,screenHeight,isPortrait:true,frameWidth,frameHeight,bodyDepth,displayCenterHeight,overallHeight:displayCenterHeight+frameHeight/2,baseWidth,baseDepth,unit:'m',assumed:true,placeholder:true,borrowedPlanned:true};
  const info={id:'entrance-information-monitor',title:'入口の縦置き案内モニター（借用予定）',description:'入口にある縦置きモニターを借りて展示の詳細案内を表示する想定。現在の画面は「Dot Area」「2作品のタイトル」「展示のご案内」「詳細内容は準備中（仮表示）」を載せた仮表示です。借用・機種・寸法・設置位置は未確定。スタンドと背面配線も仮の再構成です。',dimensions:`仮の画面 約W${screenWidth.toFixed(2)} × H${screenHeight.toFixed(2)} m / 全高 約${dimensions.overallHeight.toFixed(2)} m / 台座 約${baseWidth.toFixed(2)} × ${baseDepth.toFixed(2)} m`,source:'ユーザー提案 / PDF p.2の入口配置を参照',status:'借用予定 / 機種・寸法・位置・案内内容は仮'};
  group.userData={kind:'entrance-information-monitor',isPortrait:true,placeholder:true,borrowedPlanned:true,dimensions,info,placeholderText,frontDirection:[0,0,1]};
  register?.(group,info);
  return {group,dimensions,info,dispose(){group.removeFromParent();for(const g of new Set(geometries))g.dispose();for(const m of new Set(materials))m.dispose();for(const t of new Set(textures))t.dispose();}};
}
