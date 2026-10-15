import * as THREE from 'three';

// One local exhibition footprint. Position / rotation is inherited when this
// group is placed with an installation in the common FIL venue.
export function buildExhibitionCarpet({width=6.5,depth=4.6,centerX=0,centerZ=0,register}={}) {
  if(!Number.isFinite(width)||width<=0||!Number.isFinite(depth)||depth<=0) {
    throw new RangeError('Carpet width and depth must be positive finite numbers.');
  }
  const group=new THREE.Group();
  group.name='exhibition-black-carpet';
  group.position.set(Number.isFinite(centerX)?centerX:0,0,Number.isFinite(centerZ)?centerZ:0);
  group.userData.layer='carpet';
  group.userData.isExhibitionCarpet=true;

  const thickness=.008,surfaceY=.006,textureSize=256;
  let seed=190271;
  const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  const colourBytes=new Uint8Array(textureSize*textureSize*4);
  const bumpBytes=new Uint8Array(textureSize*textureSize*4);
  const fibreRows=Array.from({length:textureSize},()=>random()*2-1);
  for(let y=0;y<textureSize;y++) {
    for(let x=0;x<textureSize;x++) {
      const i=(y*textureSize+x)*4;
      // Narrow broken fibres, low-contrast grain and fine cross-weave. The
      // colour map stays neutral grey; the black material supplies its tone.
      const grain=(random()-.5)*8;
      const weave=Math.sin(x*Math.PI)*1.5+Math.sin(y*Math.PI/2)*1.3;
      const fibre=fibreRows[y]*3.5*Math.sin(x*.09+y*.17);
      const n=Math.round(167+grain+weave+fibre);
      const h=Math.round(128+grain*1.5+fibre*2.0+weave);
      colourBytes[i]=colourBytes[i+1]=colourBytes[i+2]=n;
      bumpBytes[i]=bumpBytes[i+1]=bumpBytes[i+2]=h;
      colourBytes[i+3]=bumpBytes[i+3]=255;
    }
  }
  // Browser builds use native CanvasTexture. The DataTexture fallback keeps
  // geometry inspection possible in Node without a DOM or external assets.
  function makeTexture(bytes,colour=false) {
    const canvas=typeof document!=='undefined'?document.createElement('canvas'):
      typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(textureSize,textureSize):null;
    let texture;
    if(canvas) {
      canvas.width=canvas.height=textureSize;
      const context=canvas.getContext('2d');
      if(context) {
        const image=context.createImageData(textureSize,textureSize);
        image.data.set(bytes);context.putImageData(image,0,0);
        // Individual short strands add a cloth direction without white flecks.
        context.lineWidth=.55;
        for(let n=0;n<900;n++) {
          const x=random()*textureSize,y=random()*textureSize;
          const shade=colour?153+Math.floor(random()*20):116+Math.floor(random()*25);
          context.strokeStyle=`rgb(${shade},${shade},${shade})`;
          context.beginPath();context.moveTo(x,y);context.lineTo(x+2+random()*6,y+(random()-.5)*1.8);context.stroke();
        }
        texture=new THREE.CanvasTexture(canvas);
      }
    }
    if(!texture) {
      texture=new THREE.DataTexture(bytes,textureSize,textureSize,THREE.RGBAFormat);
      texture.needsUpdate=true;
    }
    texture.name=colour?'black-carpet-fibre-colour':'black-carpet-fibre-height';
    texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
    texture.repeat.set(width*3,depth*3);
    texture.anisotropy=4;
    texture.colorSpace=colour?THREE.SRGBColorSpace:THREE.NoColorSpace;
    return texture;
  }
  const colourMap=makeTexture(colourBytes,true);
  const bumpMap=makeTexture(bumpBytes);
  const fabric=new THREE.MeshStandardMaterial({
    name:'deep-black-matte-carpet',color:0x202020,roughness:1,metalness:0,
    map:colourMap,bumpMap,bumpScale:.00045,
  });
  const edgeMaterial=new THREE.MeshStandardMaterial({
    name:'black-carpet-bound-edge',color:0x101010,roughness:1,metalness:0,
    bumpMap,bumpScale:.0003,
  });
  const undersideMaterial=new THREE.MeshStandardMaterial({
    name:'black-carpet-backing',color:0x080808,roughness:1,metalness:0,
  });
  // Backing sinks into the original floor by about 2 mm; the cloth surface is
  // 6 mm above world floor zero, safely above both existing floor surfaces.
  const backing=new THREE.Mesh(new THREE.BoxGeometry(width,thickness,depth),undersideMaterial);
  backing.name='carpet-soft-backing';backing.position.y=surfaceY-thickness/2-.00025;
  backing.receiveShadow=true;backing.castShadow=false;group.add(backing);
  const face=new THREE.Mesh(new THREE.PlaneGeometry(width-.005,depth-.005),fabric);
  face.name='carpet-fibrous-surface';face.rotation.x=-Math.PI/2;face.position.y=surfaceY;
  face.receiveShadow=true;face.castShadow=false;group.add(face);

  // A small bound hem sits nearly flush with the fabric. Its edge and a fine
  // stitched line make the footprint legible without a hard reflective rim.
  const binding=Math.min(.012,width*.12,depth*.12),edgeHeight=.003;
  const bindingTop=surfaceY+.00065;
  const edges=[
    {w:width,d:binding,x:0,z:-depth/2+binding/2},
    {w:width,d:binding,x:0,z:depth/2-binding/2},
    {w:binding,d:Math.max(.001,depth-binding*2),x:-width/2+binding/2,z:0},
    {w:binding,d:Math.max(.001,depth-binding*2),x:width/2-binding/2,z:0},
  ];
  for(const [index,e] of edges.entries()) {
    const strip=new THREE.Mesh(new THREE.BoxGeometry(e.w,edgeHeight,e.d),edgeMaterial);
    strip.name=`carpet-bound-hem-${index+1}`;
    strip.position.set(e.x,bindingTop-edgeHeight/2,e.z);
    strip.receiveShadow=true;strip.castShadow=false;group.add(strip);
  }
  const seamMaterial=new THREE.LineDashedMaterial({color:0x373737,transparent:true,opacity:.27,dashSize:.006,gapSize:.004,depthWrite:false});
  const inset=binding*.78,seamY=bindingTop+.00015;
  const points=[
    new THREE.Vector3(-width/2+inset,seamY,-depth/2+inset),
    new THREE.Vector3(width/2-inset,seamY,-depth/2+inset),
    new THREE.Vector3(width/2-inset,seamY,depth/2-inset),
    new THREE.Vector3(-width/2+inset,seamY,depth/2-inset),
    new THREE.Vector3(-width/2+inset,seamY,-depth/2+inset),
  ];
  const stitching=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),seamMaterial);
  stitching.name='carpet-fine-binding-stitches';stitching.computeLineDistances();group.add(stitching);

  const dimensions={width,depth,thickness,surfaceY,centerX:group.position.x,centerZ:group.position.z,area:width*depth};
  const info={
    id:'exhibition-carpet',title:'黒カーペット',
    description:'展示エリアの床に敷く黒いカーペット。反射を抑えた繊維面と細い縁の仕上げで再構成しています。表示はカーテンと独立して切り替えられます。',
    dimensions:`W ${width.toFixed(2)} × D ${depth.toFixed(2)} m / 厚さ 約8 mm`,
    dims:{...dimensions},source:'ユーザー指定',status:'敷設範囲・厚さは再構成',
  };
  group.userData.info=info;
  group.userData.dimensions=dimensions;
  register?.(group,info);
  let disposed=false;
  function dispose() {
    if(disposed)return;
    disposed=true;
    const geometries=new Set();
    group.traverse(object=>{if(object.geometry)geometries.add(object.geometry);});
    for(const geometry of geometries)geometry.dispose();
    for(const material of [fabric,edgeMaterial,undersideMaterial,seamMaterial])material.dispose();
    colourMap.dispose();bumpMap.dispose();
    group.removeFromParent();
  }
  return {group,dimensions,dispose};
}
