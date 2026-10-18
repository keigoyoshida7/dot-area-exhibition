import * as THREE from 'three';

/** A matte white sheet cut to the acrylic's trapezoidal lower outline. */
export function buildWhiteTrapezoidFloor({width=1.618,backWidth=width/((1+Math.sqrt(5))/2),depth=backWidth,register}={}){
  const thickness=.002,bottomY=.006,surfaceY=bottomY+thickness;
  const vertices=[[-width/2,depth/2],[width/2,depth/2],[backWidth/2,-depth/2],[-backWidth/2,-depth/2]];
  const shape=new THREE.Shape();vertices.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
  const group=new THREE.Group();group.name='core-white-trapezoid-floor';
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:false});
  const material=new THREE.MeshStandardMaterial({color:0xf1f1ed,roughness:.96,metalness:0});
  const sheet=new THREE.Mesh(geometry,material);sheet.position.y=bottomY;sheet.rotation.x=-Math.PI/2;
  sheet.name='white-linoleum-surface';sheet.castShadow=false;sheet.receiveShadow=true;group.add(sheet);
  const dimensions={W:width,B:backWidth,D:depth,shape:'trapezoid',verticesXZ:vertices,thickness,bottomY,surfaceY,area:(width+backWidth)*depth/2,finish:'matte-white',productUndecided:true};
  const info={id:'core-white-floor',title:'アクリル下のマットホワイト床材',description:'リノリウム等の白い床材をアクリル底面と同じ台形にカットし、その下だけに置く案。マットホワイトで再現し、周囲はCoreの黒カーペットです。製品・実際の厚さは未定。',dimensions:'前幅1,618 / 後幅1,000 / 奥行約1,000 mm · アクリル底面に一致 / 厚さ2 mmは描画用仮値',source:'ユーザー指定（2026-10-18）',status:'素材・製品は検討中'};
  group.userData={isWhiteTrapezoidFloor:true,dimensions,info};register?.(group,info);
  return {group,dimensions,info,dispose(){group.removeFromParent();geometry.dispose();material.dispose();}};
}
