import * as THREE from 'three';

const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const SOURCE_STATUS='ユーザー提案 / 寸法・吊り位置は仮';

/**
 * One taut, flat blackout fabric panel and one full-height side entrance.
 * Coordinates face the LF audience along local +Z. Legacy gap / return-panel
 * arguments are accepted but coverage is authoritative for the geometry.
 */
export function buildBlackoutCurtain({label,register,width=3,height=2.6,z=1.4,centerX=0,coverage=2/3,openingSide='left',gapWidth:_legacyGapWidth,gapOffset:_legacyGapOffset,returnPanel:_legacyReturnPanel}={}) {
  width=Math.max(1.6,Number(width)||3);
  height=Math.max(1.9,Number(height)||2.6);
  coverage=THREE.MathUtils.clamp(Number(coverage)||2/3,.25,.88);
  openingSide=openingSide==='right'?'right':'left';
  const half=width/2,coveredWidth=width*coverage,openingWidth=width-coveredWidth,gapWidth=openingWidth;
  const openingMinX=openingSide==='left'?-half:half-openingWidth;
  const openingMaxX=openingSide==='left'?-half+openingWidth:half;
  const gapOffset=(openingMinX+openingMaxX)/2;
  const panelMinX=openingSide==='left'?openingMaxX:-half;
  const panelMaxX=openingSide==='left'?half:openingMinX;
  const panelCenterX=(panelMinX+panelMaxX)/2;
  const clothBottom=.035,clothTop=height-.088,panelHeight=clothTop-clothBottom;
  const group=new THREE.Group();group.name='blackout-curtain';group.position.set(centerX,0,z);
  const layerGroups={};
  for(const name of ['fabric','track','placard','labels']){const g=new THREE.Group();g.name=`curtain-${name}`;group.add(g);layerGroups[name]=g;}
  const textures=[],materials=[],geometries=[];
  const material=args=>{const m=new THREE.MeshStandardMaterial(args);materials.push(m);return m;};
  const cloth=material({color:0x171717,roughness:1,metalness:0,side:THREE.DoubleSide,transparent:false,opacity:1});
  const binding=material({color:0x1d1d1d,roughness:1,metalness:0});
  const railMaterial=material({color:0x181a1b,roughness:.5,metalness:.5});
  const eyeletMaterial=material({color:0x575b5b,roughness:.5,metalness:.68});
  const tieMaterial=material({color:0x222323,roughness:.92,metalness:0});
  const paper=material({color:0xdddeda,roughness:1,metalness:0});
  function mesh(geometry,mat,parent,pos){geometries.push(geometry);const o=new THREE.Mesh(geometry,mat);if(pos)o.position.copy(pos);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
  function box(w,h,d,parent,pos,mat){return mesh(new THREE.BoxGeometry(w,h,d),mat,parent,pos);}
  function rod(a,b,r,parent,mat){const delta=b.clone().sub(a);const o=mesh(new THREE.CylinderGeometry(r,r,delta.length(),12),mat,parent,a.clone().lerp(b,.5));o.quaternion.setFromUnitVectors(V(0,1,0),delta.normalize());return o;}
  // Only a microscopic woven surface is textured. The fabric geometry has
  // four coplanar vertices, straight edges and no folds, return or billow.
  if(typeof document!=='undefined'){
    const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');const image=ctx.createImageData(256,256);
    let seed=7243;for(let i=0;i<image.data.length;i+=4){seed=(seed*16807)%2147483647;const pixel=i/4,x=pixel%256,y=Math.floor(pixel/256);const n=122+(seed%9)+(x%3===0?7:0)-(y%4===0?6:0);image.data[i]=image.data[i+1]=image.data[i+2]=n;image.data[i+3]=255;}ctx.putImageData(image,0,0);
    const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(Math.max(4,coveredWidth*3),8);textures.push(t);cloth.bumpMap=t;cloth.bumpScale=.0003;
  }
  const panel=mesh(new THREE.PlaneGeometry(coveredWidth,panelHeight,1,1),cloth,layerGroups.fabric,V(panelCenterX,(clothTop+clothBottom)/2,0));
  panel.name='tensioned-flat-blackout-fabric';panel.userData={kind:'blackout-fabric',cutawayImmune:true,opaque:true,tensioned:true,form:'tensioned-flat',coverage};
  // Reinforced straight binding stays entirely within the panel footprint.
  const bindingWidth=.014,bindingThickness=.0024;
  for(const x of [panelMinX+bindingWidth/2,panelMaxX-bindingWidth/2])box(bindingWidth,panelHeight,bindingThickness,layerGroups.fabric,V(x,(clothTop+clothBottom)/2,.0006),binding);
  for(const y of [clothBottom+bindingWidth/2,clothTop-bindingWidth/2])box(coveredWidth,bindingWidth,bindingThickness,layerGroups.fabric,V(panelCenterX,y,.0006),binding);
  // The rail covers the fabric only: nothing spans the side walk opening.
  rod(V(panelMinX,height,0),V(panelMaxX,height,0),.0105,layerGroups.track,railMaterial);
  for(const x of [panelMinX+.018,panelMaxX-.018]){
    box(.034,.028,.034,layerGroups.track,V(x,height+.012,0),railMaterial);
    rod(V(x,height+.022,0),V(x,height+.087,0),.0038,layerGroups.track,eyeletMaterial);
    for(const y of [clothBottom+.017,clothTop-.017]){
      const eyelet=mesh(new THREE.TorusGeometry(.0062,.0018,6,16),eyeletMaterial,layerGroups.fabric,V(x,y,.0016));eyelet.name='fabric-tension-eyelet';
      const endpoint=y<height/2?V(x,.012,0):V(x,height-.012,0);
      rod(V(x,y,0),endpoint,.0014,layerGroups.track,tieMaterial);
      if(y<height/2){const anchor=box(.025,.009,.024,layerGroups.track,V(x,.0065,0),railMaterial);anchor.name='panel-footprint-tension-anchor';}
    }
  }
  // A deliberately non-scannable, temporary information plate near the opening.
  const signX=openingSide==='left'?panelMinX+.27:panelMaxX-.27;
  const sign=layerGroups.placard;sign.position.set(THREE.MathUtils.clamp(signX,panelMinX+.14,panelMaxX-.14),1.48,.011);
  const signBoard=box(.244,.334,.004,sign,V(0,0,0),paper);signBoard.name='unassigned-qr-placard';
  if(typeof document!=='undefined'){
    const c=document.createElement('canvas');c.width=600;c.height=820;const ctx=c.getContext('2d');ctx.fillStyle='#e4e5df';ctx.fillRect(0,0,600,820);ctx.strokeStyle='#60635e';ctx.lineWidth=3;ctx.strokeRect(20,20,560,780);
    ctx.fillStyle='#151715';ctx.textAlign='center';ctx.font='500 43px "Hiragino Sans", "Noto Sans JP", sans-serif';ctx.fillText('QR案内（仮）',300,116);
    ctx.strokeStyle='#81867e';ctx.lineWidth=2;ctx.strokeRect(131,190,338,338);ctx.font='400 105px sans-serif';ctx.fillStyle='#777e74';ctx.fillText('QR',300,397);
    ctx.fillStyle='#2a2e28';ctx.font='500 35px "Hiragino Sans", "Noto Sans JP", sans-serif';ctx.fillText('リンク先未定',300,620);ctx.font='26px "Hiragino Sans", "Noto Sans JP", sans-serif';ctx.fillText('liberated frequencies',300,698);ctx.font='22px "Hiragino Sans", "Noto Sans JP", sans-serif';ctx.fillStyle='#666b62';ctx.fillText('読み取り用コードは未設置',300,751);
    const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;textures.push(texture);const face=new THREE.MeshBasicMaterial({map:texture,toneMapped:false});materials.push(face);const front=mesh(new THREE.PlaneGeometry(.238,.326),face,sign,V(0,0,.0025));front.castShadow=false;front.name='non-scannable-qr-location';
  }
  for(const x of [-.087,.087]){const pin=mesh(new THREE.SphereGeometry(.0028,8,6),eyeletMaterial,sign,V(x,.145,.005));pin.castShadow=false;}
  const dimensions={width,height,z,centerX,coverage,coveredWidth,openingWidth,gapWidth,gapOffset,openingSide,openingMinX,openingMaxX,panelMinX,panelMaxX,clothTop,clothBottom,foldDepth:0,returnDepth:0,tensioned:true,form:'tensioned-flat',placardWidth:.244,placardHeight:.334,assumed:true};
  const info={id:'lf-blackout-curtain',title:'liberated frequencies 入口の張り幕',description:'間口の2/3を、テンションをかけた平らな黒い布1枚で覆う構成。ひだや返し幕を設けず、残る1/3を片側の通り抜け入口として確保。幅・高さ・吊り位置は仮値です。',dimensions:`間口 W ${width.toFixed(2)} m / 張り幕 ${coveredWidth.toFixed(3)} m（2/3）/ 片側入口 ${openingWidth.toFixed(3)} m（1/3）/ H ${height.toFixed(2)} m（仮）`,source:'ユーザー指定 / PDF p.2 会場配置を参照',status:SOURCE_STATUS};
  group.userData={kind:'blackout-curtain',cutawayImmune:true,gapWidth,coverage,tensioned:true,form:'tensioned-flat',dimensions,info,frontDirection:[0,0,1],qrScannable:false};
  register?.(group,info);
  const placardInfo={id:'lf-curtain-qr-location',title:'カーテン上の仮QR案内位置',description:'リンク先は未定です。「QR案内（仮）」と記した位置確認用プレートで、読み取り用QRコードは設置していません。',dimensions:'プレート 約W0.244 × H0.334 m / 中心高さ 約1.48 m（仮）',source:'ユーザー指定',status:SOURCE_STATUS};sign.userData.info=placardInfo;sign.userData.kind='non-scannable-qr-location';sign.userData.qrScannable=false;register?.(sign,placardInfo);
  label?.('張り幕 / 片側の入口',layerGroups.labels,V(gapOffset,1.93,.08),{size:.105,opacity:.87});
  return {group,dimensions,info,opening:{center:[gapOffset,0,0],width:gapWidth,minX:openingMinX,maxX:openingMaxX,side:openingSide,walkThrough:true,frontDirection:[0,0,1]},geometry:{panels:1,returnPanels:0,openings:1,opaque:true,tensioned:true,form:'tensioned-flat',coverage},layerGroups,placard:sign,returnFlap:null,dispose(){group.removeFromParent();for(const g of new Set(geometries))g.dispose();for(const m of new Set(materials))m.dispose();for(const t of textures)t.dispose();}};
}
