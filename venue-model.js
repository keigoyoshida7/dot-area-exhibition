import * as THREE from 'three';

// Traced from the unobscured floor plan embedded in Dot_Area.pdf p.2.
// World origin = plan pixel (149,114). X points right; Z points down the plan.
// Plan chains give 46.8 px/m. Elevations and small construction details are estimates.
// Core front is rotated 90 degrees toward the counter per the user correction.
const SCALE=46.8, ORIGIN=[149,114];
const P=(x,z,y=0)=>new THREE.Vector3((x-ORIGIN[0])/SCALE,y,(z-ORIGIN[1])/SCALE);
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const FLOOR=[[148,106],[509,106],[509,114],[756,114],[756,143],[908,143],[908,540],[507,540],[507,650],[50,650],[50,536],[148,536]];
const LANDING=[[500,114],[500,81],[551,30],[766,30],[766,94],[576,94],[576,114]];
const ANCHORS={
  core:{position:[3.75,0,3.4],rotationY:Math.PI/2},
  frequencies:{position:[3.75,0,9.9],rotationY:Math.PI},
  intro:{position:[8,0,4],rotationY:0},
  counter:{position:[10.64,0,2.79],rotationY:0},
  entrance:{position:[8.16,0,-.32],rotationY:0},
};

export function buildVenueArchitecture({label,register}={}){
  const group=new THREE.Group();group.name='venue-architecture';
  const layerGroups={};
  for(const name of ['architecture','counter','entrance','labels','dimensions']){
    layerGroups[name]=new THREE.Group();layerGroups[name].name=`venue-${name}`;group.add(layerGroups[name]);
  }
  const A=layerGroups.architecture,C=layerGroups.counter,E=layerGroups.entrance,L=layerGroups.labels,D=layerGroups.dimensions;
  const mat=(color,roughness=.88,metalness=.04)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const M={floor:mat(0x343638,.72),wall:mat(0x222426),column:mat(0x161819),edge:mat(0x515557),
    bar:mat(0x202224,.75),barTop:mat(0x818582,.48),barInset:mat(0x3e4243),steel:mat(0x73797b,.4,.63),
    fixture:mat(0x969b99,.49),dark:mat(0x101213),support:mat(0x292d2f),yard:mat(0x3b3e3b,.97),
    step:mat(0x44484a,.83),tread:mat(0x626768,.7)};
  const wallMeshes=[],cutawayMeshes=[];
  function mesh(geometry,material,parent,pos,rotation){const m=new THREE.Mesh(geometry,material);if(pos)m.position.copy(pos);if(rotation)m.rotation.set(...rotation);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  function box(w,h,d,parent,pos,material=M.wall){return mesh(new THREE.BoxGeometry(w,h,d),material,parent,pos);}
  function cyl(radius,height,parent,pos,material=M.steel){return mesh(new THREE.CylinderGeometry(radius,radius,height,20),material,parent,pos);}
  function line(points,parent=A,color=0xb3bab9,opacity=.25){const o=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color,transparent:true,opacity}));parent.add(o);return o;}
  function rod(a,b,r,parent,material=M.steel){const delta=b.clone().sub(a);const o=cyl(r,delta.length(),parent,a.clone().lerp(b,.5),material);o.quaternion.setFromUnitVectors(V(0,1,0),delta.normalize());return o;}
  function g(name,parent=A){const o=new THREE.Group();o.name=name;parent.add(o);return o;}
  function info(o,id,title,description,dimensions,status='図面準拠・高さは推定'){
    const metadata={id:`venue-${id}`,title,description,dimensions,source:'PDF p.2 埋め込み会場図面',status};
    o.userData.info=metadata;register?.(o,metadata);return o;
  }
  function text(t,parent,pos,opts={}){return label?.(t,parent,pos,{size:.18,opacity:.86,...opts});}
  function footprint(points,parent,material,y=-.018){const s=new THREE.Shape();points.forEach(([x,z],i)=>{const p=P(x,z);if(i===0)s.moveTo(p.x,-p.z);else s.lineTo(p.x,-p.z);});s.closePath();const m=mesh(new THREE.ShapeGeometry(s),material,parent,V(0,y,0),[-Math.PI/2,0,0]);m.castShadow=false;return m;}
  function tracedBox(rect,height,parent=A,material=M.wall,bottom=0){const [x1,z1,x2,z2]=rect;const a=P(x1,z1),b=P(x2,z2);return box(Math.abs(b.x-a.x),height,Math.abs(b.z-a.z),parent,V((a.x+b.x)/2,bottom+height/2,(a.z+b.z)/2),material);}
  function wall(a,b,height=.95,thickness=.14,parent=A,material=M.wall){const pa=P(...a),pb=P(...b),d=pb.clone().sub(pa);const m=box(d.length(),height,thickness,parent,pa.clone().lerp(pb,.5).add(V(0,height/2,0)),material.clone());m.rotation.y=-Math.atan2(d.z,d.x);m.userData.cutawayWall=true;wallMeshes.push(m);cutawayMeshes.push(m);const topA=pa.clone().add(V(0,height+.008,0)),topB=pb.clone().add(V(0,height+.008,0));line([topA,topB],parent,0x929997,.33);return m;}
  function roomFloor(rect,material,parent=A){return tracedBox(rect,.012,parent,material,-.007);}
  function roomLabel(title,pixel,subtitle){const p=P(...pixel,.08);text(title,L,p,{size:.21,opacity:.8});if(subtitle)text(subtitle,L,p.clone().add(V(0,.15,0)),{size:.11,opacity:.54});}

  // One connected L-shaped floor, including the support wing. No independent
  // exhibition boxes are put inside the venue.
  const floorGroup=g('L-shaped-floor');
  footprint(FLOOR,floorGroup,M.floor);
  const floorShape=new THREE.Shape();FLOOR.forEach(([x,z],i)=>{const p=P(x,z);i?floorShape.lineTo(p.x,-p.z):floorShape.moveTo(p.x,-p.z);});floorShape.closePath();
  const slab=mesh(new THREE.ExtrudeGeometry(floorShape,{depth:.11,bevelEnabled:false}),M.dark,floorGroup,V(0,-.14,0),[-Math.PI/2,0,0]);
  const outline=FLOOR.map(([x,z])=>P(x,z,-.012));outline.push(outline[0]);line(outline,floorGroup,0x8e9693,.45);
  // A subtle 600-mm joint pattern is clipped to the traced footprint.
  const pointInside=(x,z)=>{let inside=false;for(let i=0,j=FLOOR.length-1;i<FLOOR.length;j=i++){const a=P(...FLOOR[i]),b=P(...FLOOR[j]);if(((a.z>z)!==(b.z>z))&&(x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x))inside=!inside;}return inside;};
  for(let x=-2.1;x<16.3;x+=.6){let start=null;for(let z=-.1;z<11.5;z+=.12){const yes=pointInside(x,z);if(yes&&start===null)start=z;if((!yes||z>11.35)&&start!==null){line([V(x,-.01,start),V(x,-.01,z-.12)],floorGroup,0x151819,.32);start=null;}}}
  for(let z=.1;z<11.5;z+=.6){let start=null;for(let x=-2.1;x<16.4;x+=.12){const yes=pointInside(x,z);if(yes&&start===null)start=x;if((!yes||x>16.2)&&start!==null){line([V(start,-.009,z),V(x-.12,-.009,z)],floorGroup,0x151819,.32);start=null;}}}
  info(floorGroup,'floor','FIL 共通会場 / L字形の床','PDF内部に埋め込まれた会場平面図から外形・柱・諸室を追跡。2作品は一続きの会場床上に配置。設置位置はPDFの作品領域を参考にした推定です。','下辺の寸法列合計 18.025 m / 原点は主室北西寄りの基準点');

  // Perimeter traces. Opening at northeast leads into the stair landing.
  const perimeter=g('exterior-cutaway-walls');
  wall([143,144],[143,486],1.05,.17,perimeter);
  wall([213,97],[428,97],1.05,.17,perimeter);
  wall([780,139],[908,139],1.05,.18,perimeter);
  wall([908,139],[908,546],1.05,.18,perimeter);
  wall([508,546],[908,546],.92,.18,perimeter);
  wall([512,570],[512,655],.72,.18,perimeter);
  wall([47,655],[512,655],.72,.18,perimeter);
  wall([47,532],[47,655],.72,.18,perimeter);
  wall([47,532],[138,532],.85,.18,perimeter);
  // Long north wall is a structural spandrel between the two heavy columns.
  const northTop=box((428-213)/SCALE,.1,.22,perimeter,P((428+213)/2,97,2.48),M.column);northTop.castShadow=false;
  line([P(213,97,2.6),P(428,97,2.6)],perimeter,0x919997,.28);
  // Source plan shows doubled west edge; model an inner sill and dark frame.
  box(.08,.075,(486-144)/SCALE,perimeter,P(153,(144+486)/2,.08),M.edge);
  for(const y of [144,486])box(.065,2.52,.065,perimeter,P(153,y,1.26),M.column);
  info(perimeter,'perimeter','会場外周 / 壁の切断表示','外周の凹凸と北東の入口を平面図から再構成。見通しを確保するため壁上部を切断表示しています。図面に高さ情報がない部分の高さは推定です。','壁厚 約0.14–0.18 m（描画用推定） / 主室の高さ基準 2.6 m');

  // Exact plan rectangles for six structural columns / thickened wall piers.
  const columns=g('structural-columns');
  const columnRects=[[138,68,213,144],[428,68,509,144],[713,89,780,144],[135,486,192,541],[448,510,509,571],[714,396,766,448]];
  columnRects.forEach((rect,i)=>{const c=tracedBox(rect,2.6,columns,M.column);const [x1,z1,x2,z2]=rect;tracedBox([x1-1,z1-1,x2+1,z2+1],.045,columns,M.edge,.008);line([P(x1,z1,2.605),P(x2,z1,2.605),P(x2,z2,2.605),P(x1,z2,2.605),P(x1,z1,2.605)],columns,0x616966,.38);c.name=`structural-column-${i+1}`;});
  info(columns,'columns','図面に描かれた6か所の柱・構造体','平面図の黒塗り矩形を追跡。大小や張り出しを保ち、主室・入口・L字形の接続部の構造を表示しています。','平面寸法は図面トレース / 高さ 2.6 m（推定）');

  // The right wing: open courtyard, backyard, mechanical room and toilets.
  const support=g('support-rooms');
  roomFloor([766,143,908,284],M.yard,support);
  roomFloor([766,287,890,448],M.support,support);
  roomFloor([769,450,908,540],M.support,support);
  roomFloor([449,422,620,540],M.support,support);
  roomFloor([679,447,766,536],M.support,support);
  roomFloor([50,538,146,647],M.support,support);
  // Courtyard and back room: the narrow west boundary has openings as drawn.
  wall([760,144],[760,284],1.05,.14,support);
  wall([766,287],[908,287],.78,.13,support);
  wall([887,288],[887,448],.78,.12,support);
  wall([766,449],[887,449],.78,.12,support);
  wall([766,449],[766,536],.78,.12,support);
  // Women's two cubicles and the basin recess; entrance at upper right.
  wall([449,422],[584,422],.74,.11,support);
  wall([449,422],[449,510],.74,.11,support);
  wall([449,468],[524,468],.64,.08,support);
  wall([524,430],[524,509],.64,.08,support);
  wall([524,509],[524,540],.64,.08,support);
  wall([524,540],[583,540],.74,.10,support);
  wall([583,469],[583,540],.74,.10,support);
  wall([583,469],[678,469],.62,.10,support);
  wall([583,507],[678,507],.62,.10,support);
  // Men's room with doorway near its northwestern corner.
  wall([679,468],[679,536],.74,.1,support);
  wall([679,536],[766,536],.74,.1,support);
  wall([710,447],[714,447],.74,.1,support);
  // Storage in the southwest wing; keep its side door visibly open.
  wall([146,539],[146,575],.78,.11,support);
  wall([146,612],[146,647],.78,.11,support);
  const storageDoor=box(.035,.7,.72,support,P(147,575,.35),M.barInset);storageDoor.rotation.y=-Math.PI/3;
  // Door arcs follow plan swing locations, represented on the floor.
  function doorArc(pixel,radius,from,to,parent=support){const pts=[];for(let i=0;i<=24;i++){const a=from+(to-from)*i/24;pts.push(P(pixel[0]+Math.cos(a)*radius,pixel[1]+Math.sin(a)*radius,.018));}line(pts,parent,0xb1b6b3,.37);}
  doorArc([146,575],37,0,Math.PI/2);doorArc([584,422],36,Math.PI/2,Math.PI);doorArc([678,448],34,0,Math.PI/2);
  // Simplified ceramic plan fixtures: ellipse bowls, cisterns and basins.
  function toilet(x,z,rotation=0){const f=g('toilet-symbol',support);f.position.copy(P(x,z));f.rotation.y=rotation;box(.35,.4,.14,f,V(0,.2,-.24),M.fixture);const bowl=mesh(new THREE.SphereGeometry(1,20,12),M.fixture,f,V(0,.24,0));bowl.scale.set(.19,.12,.27);const seat=mesh(new THREE.TorusGeometry(.15,.026,8,28),M.edge,f,V(0,.34,.025),[-Math.PI/2,0,0]);seat.scale.y=1.35;box(.22,.18,.25,f,V(0,.1,.025),M.fixture);}
  toilet(468,445,-Math.PI/2);toilet(468,489,-Math.PI/2);toilet(737,515,Math.PI);
  function basin(x,z){const b=mesh(new THREE.SphereGeometry(1,22,12),M.fixture,support,P(x,z,.61));b.scale.set(.28,.07,.17);const ring=mesh(new THREE.TorusGeometry(.15,.014,6,30),M.edge,support,P(x,z,.67),[-Math.PI/2,0,0]);ring.scale.x=1.55;const tap=rod(P(x,z-5,.67),P(x,z-5,.79),.009,support);rod(P(x,z-5,.79),P(x,z,.79),.009,support);}
  basin(553,523);basin(694,486);
  roomLabel('中庭',[834,215],'OPEN COURTYARD');
  roomLabel('バックヤード',[828,364]);
  roomLabel('機械室',[835,501]);
  roomLabel('女子トイレ',[557,453]);
  roomLabel('男子トイレ',[729,466]);
  roomLabel('倉庫',[99,594]);
  info(support,'support-rooms','中庭・バックヤード・設備諸室','平面図右側の中庭、バックヤード、機械室、男女トイレと南西の倉庫を区分。扉の開口と便器・洗面の位置は図記号を参考に簡略化しています。中庭には屋根を設けていません。','平面位置はPDF会場図 / 什器の立体形状・高さは推定');

  // Bar counter follows its long north–south plan footprint; no invented stools.
  const bar=g('long-bar-counter',C);
  tracedBox([623,159,673,327],.94,bar,M.bar,.025);
  tracedBox([619,155,677,329],.055,bar,M.barTop,.965);
  tracedBox([629,166,668,322],.012,bar,M.barInset,1.021);
  // Linear panel seams, recessed toe kick, top edges and discreet end plates.
  tracedBox([625,160,671,327],.07,bar,M.dark,.01);
  for(const z of [196,234,272,310])line([P(622,z,.12),P(622,z,.91)],bar,0x848a87,.32);
  line([P(619,155,1.023),P(619,329,1.023)],bar,0xc4c9c3,.42);
  line([P(677,155,1.023),P(677,329,1.023)],bar,0xa4aaa5,.33);
  const service=g('southern-counter-extension',C);
  tracedBox([623,329,689,432],.78,service,M.bar,.02);
  tracedBox([621,328,691,433],.045,service,M.barTop,.8);
  // The plan annotates a 300 / 853 / 300 mm transverse division here.
  tracedBox([636,331,676,430],.012,service,M.barInset,.847);
  for(const z of [360,396])line([P(622,z,.847),P(690,z,.847)],service,0x7d8580,.4);
  text('BAR COUNTER',L,P(648,235,1.23),{size:.22});
  text('カウンター',L,P(649,283,1.18),{size:.17});
  info(bar,'bar','既存バーカウンター','会場図にある東側の縦長カウンターを、その平面位置と長さに合わせて再構成。南側の灰色の延長部も連続する造作として表示しています。天板・側板・足元の形状と高さは推定です。','本体 約W1.11 × L3.65 m / 南側延長 約W1.45 × L2.24 m / 天板H約1.02 m（推定）');
  info(service,'bar-extension','カウンター南側の延長部','会場図の灰色の造作領域と300 / 853 / 300 mmの横方向区分を参考にした再構成。立体的な用途や高さは平面図から確定できません。','横区分 300 + 853 + 300 mm（図面） / H約0.85 m（推定）');

  // Northeast entrance, diagonal landing and a real stepped stair flight.
  const entry=g('northeast-stair-entrance',E);
  footprint(LANDING,entry,M.step,-.009);
  wall([500,81],[551,30],.84,.15,entry,M.column);
  wall([551,30],[766,30],.84,.15,entry,M.column);
  wall([576,94],[713,94],.84,.13,entry,M.column);
  // Short diagonal edge and masonry threshold at the entrance door.
  box(1.05,.035,.14,entry,P(532,114,.012),M.steel);
  wall([509,82],[509,88],1,.12,entry,M.column);
  const doorWidth=.90,door=g('open-entrance-door',entry);door.position.copy(P(509,114));door.rotation.y=-Math.PI/3.7;
  box(doorWidth,.82,.035,door,V(doorWidth/2,.41,0),M.barInset);rod(V(.72,.36,-.035),V(.72,.52,-.035),.013,door);
  doorArc([509,114],42,-Math.PI/2,0,entry);
  const startX=583,endX=756,startZ=33,endZ=88,steps=18,treadPx=(endX-startX)/steps,rise=.11;
  for(let i=0;i<steps;i++){
    const x1=startX+i*treadPx,x2=startX+(i+1)*treadPx,h=(i+1)*rise;
    tracedBox([x1,startZ,x2,endZ],h,entry,i%2?M.step:M.tread,0);
    line([P(x1,startZ,h+.006),P(x1,endZ,h+.006)],entry,0xb4bbb8,.34);
    // Narrow anti-slip strips on the visible tread leading edges.
    tracedBox([x1+.65,startZ+2,x1+1.25,endZ-2],.008,entry,M.edge,h+.002);
  }
  // Rail geometry is a readable construction estimate; footprint is plan based.
  const flightLow=P(startX,startZ,.92),flightHigh=P(endX,startZ,steps*rise+.92);
  rod(flightLow,flightHigh,.019,entry);rod(P(startX,endZ,.92),P(endX,endZ,steps*rise+.92),.019,entry);
  for(let i=0;i<=5;i++){const t=i/5,x=startX+(endX-startX)*t,h=steps*rise*t;rod(P(x,startZ,h),P(x,startZ,h+.92),.014,entry);rod(P(x,endZ,h),P(x,endZ,h+.92),.014,entry);}
  // Arrow drawn on the landing matches the access direction in the PDF.
  const arrow=[P(714,107,.025),P(536,107,.025)];line(arrow,entry,0xd5d9d4,.67);line([P(549,100,.026),P(536,107,.026),P(549,114,.026)],entry,0xd5d9d4,.67);
  text('ENTRANCE / 入口',L,P(533,132,.22),{size:.21});
  text('階段',L,P(673,59,2.6),{size:.18});
  info(entry,'entrance','北東の階段と入口','会場図の北東にある横方向の階段、斜めの踊り場、南西端の開き戸を再構成。階段の平面外形と入口位置は図面に準拠し、蹴上げ・段数・手すり高さは視認のための推定です。','階段領域 約4.57 × 1.37 m / 上り高さ 約1.98 m（推定）');

  // Keep the talk / intro zone open: the source supplies no seating layout.
  const intro=g('intro-zone-outline');
  const introRect=[[444,273],[601,273],[601,378],[444,378],[444,273]];
  line(introRect.map(([x,z])=>P(x,z,.016)),intro,0xaeb6b1,.23);
  text('Intro / Talk Area',L,P(522,326,.045),{size:.22,opacity:.68});
  info(intro,'intro','Intro / Talk Area','平面図のIntro AreaとPDF上のTalk Session領域を参考にした空きスペース。椅子や演台の配置は資料にないため、床領域のみを表示しています。','作品とカウンターの間に設けた共通会場内の領域（位置は概略）','概略配置');

  // Survey-style dimension strings, all on the common venue coordinate frame.
  function dimension(a,b,title,offset=V(),size=.15){const p=a.clone().add(offset),q=b.clone().add(offset);line([a,p],D,0xaeb7b0,.25);line([b,q],D,0xaeb7b0,.25);line([p,q],D,0xd2d9d2,.7);const delta=q.clone().sub(p).normalize(),cross=V(-delta.z,0,delta.x).multiplyScalar(.065);for(const x of [p,q])line([x.clone().sub(cross),x.clone().add(cross)],D,0xe0e5dc,.7);text(title,D,p.clone().lerp(q,.5).add(V(0,.07,0)),{size});}
  dimension(P(60,655,.02),P(904,655,.02),'18.025 m · 下辺の寸法列合計',V(0,0,.55),.20);
  dimension(P(908,89,.02),P(908,536,.02),'9.535 m · 右側の寸法列合計',V(.55,0,0),.18);
  dimension(P(622,158,1.05),P(622,328,1.05),'約3.65 m · counter',V(-.25,0,0),.14);
  dimension(P(622,328,.88),P(690,328,.88),'300 / 853 / 300 mm',V(0,0,.12),.13);
  text('会場平面：PDF p.2 / 高さ・立体の細部：推定',D,V(7.0,.06,12.45),{size:.18,opacity:.7});

  // scene.js uses these names for common layer / cutaway controls.
  group.userData.cutawayMeshes=cutawayMeshes;
  group.userData.wallMeshes=wallMeshes;
  group.userData.anchors=ANCHORS;
  const bounds={min:[-2.4,0,-2.05],max:[16.5,3.05,11.9],center:[7.05,.5,4.8],width:18.9,depth:13.95,height:3.05};
  const dimensions={width:18.025,depth:13.9,height:2.6,footprint:'L-shaped',unit:'m',status:'平面図の寸法列・高さは一部推定'};
  const source={page:2,image:'venue-plan-original.png',originPixel:ORIGIN,pixelsPerMetre:SCALE,notes:'原図の平面外形をトレース。作品位置・造作高さ・階段高さは推定。独立した2室ではなく共通床上の配置。'};
  return {group,dimensions,anchors:ANCHORS,layerGroups,bounds,source};
}
