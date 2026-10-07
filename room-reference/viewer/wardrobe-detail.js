import * as THREE from 'three';

/** Refine the wardrobe's towel, hanger and handle grips, after applyLayout. */
export function refineWardrobe(model, { width = 2, depth = 3.9 } = {}) {
  const normalize = name => String(name || '').toLowerCase().replace(/[\/_]+/g, ' ').replace(/\s+/g, ' ').trim();
  const obsolete = /^(thin towel hanger wire|towel hanger hook|mauve terry towel hanging on wardrobe|towel woven lower border|towel turned front edge|towel care label)/;
  model.updateWorldMatrix(true, true);
  const inverse = model.matrixWorld.clone().invert();
  const boxInModel = object => new THREE.Box3().setFromObject(object).applyMatrix4(inverse);
  const handles = [], roses = [], hidden = [];
  model.traverse(object => {
    if (!object.isMesh) return;
    const name = normalize(object.name);
    if (/^black curved wardrobe handle/.test(name)) handles.push({ object, box: boxInModel(object) });
    if (/^wardrobe handle rose/.test(name)) roses.push({ object, box: boxInModel(object) });
    if (obsolete.test(name)) {
      object.visible = false;
      object.userData.layoutHidden = true;
      object.userData.wardrobeDetailReplaced = true;
      hidden.push(object.name);
    }
  });
  // Looking at the wardrobe from the room (-X), screen-left is the handle with
  // the more negative Z coordinate. Use its bottom mounting rose, not its top.
  handles.sort((a,b) => a.box.getCenter(new THREE.Vector3()).z - b.box.getCenter(new THREE.Vector3()).z);
  const handle = handles[0];
  const handleZ = handle ? handle.box.getCenter(new THREE.Vector3()).z : -(Math.max(0,depth-3.9)+.642);
  const lowerRose = roses.filter(rose => Math.abs(rose.box.getCenter(new THREE.Vector3()).z-handleZ)<.035)
    .sort((a,b) => a.box.getCenter(new THREE.Vector3()).y-b.box.getCenter(new THREE.Vector3()).y)[0];
  const roseCenter = lowerRose?.box.getCenter(new THREE.Vector3());
  const anchorY = roseCenter?.y ?? 1.14;
  const planeX = handle ? handle.box.min.x-.014 : width-.639;
  const contactX = roseCenter ? roseCenter.x-.010 : planeX+.038;

  const group = new THREE.Group();
  group.name = 'Wardrobe detail / pink hanger and mauve towel';
  group.position.set(planeX,anchorY,handleZ);
  group.userData.proceduralWardrobeDetail = true;
  group.userData.hiddenOriginals = hidden;
  group.userData.anchor = { handle: handle?.object.name || 'estimated left handle', rose: lowerRose?.object.name || 'estimated lower mount', x:contactX, y:anchorY, z:handleZ };
  const description = 'Plum terry towel draped over a pink wire hanger, with a soft looped pile, woven borders and uneven overlapping folds, following the wardrobe photograph.';

  let terryMap, terryBump, bandMap;
  if (typeof document !== 'undefined') {
    let seed=61273;
    const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
    const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
    const context=canvas.getContext('2d'),pixels=context.createImageData(512,512);
    for(let i=0;i<pixels.data.length;i+=4) {
      const value=220+random()*35;
      pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=value;pixels.data[i+3]=255;
    }
    context.putImageData(pixels,0,0);
    // Millimetre-scale loop pile: fine hooked fibres, not large spotted noise.
    for(let y=2;y<512;y+=5)for(let x=2;x<512;x+=5) {
      const cx=x+(random()-.5)*3,cy=y+(random()-.5)*3;
      const angle=(random()-.5)*1.8;
      context.strokeStyle=`rgba(72,72,72,${.23+random()*.19})`;context.lineWidth=1.5;
      context.beginPath();context.ellipse(cx,cy,1.3,2.0,angle,0,Math.PI*1.85);context.stroke();
      context.strokeStyle='rgba(255,255,255,.8)';context.lineWidth=1;
      context.beginPath();context.ellipse(cx-.4,cy-.5,1.0,1.7,angle,Math.PI,Math.PI*1.9);context.stroke();
    }
    terryMap=new THREE.CanvasTexture(canvas);terryMap.colorSpace=THREE.SRGBColorSpace;
    terryMap.wrapS=terryMap.wrapT=THREE.RepeatWrapping;
    terryBump=terryMap.clone();terryBump.colorSpace=THREE.NoColorSpace;terryBump.needsUpdate=true;
    const bandCanvas=document.createElement('canvas');bandCanvas.width=bandCanvas.height=128;
    const bc=bandCanvas.getContext('2d');bc.fillStyle='#c5c5c5';bc.fillRect(0,0,128,128);
    for(let y=0;y<128;y+=4){bc.fillStyle='#9d9d9d';bc.fillRect(0,y,128,1);bc.fillStyle='#e0e0e0';bc.fillRect(0,y+1,128,1);}
    bandMap=new THREE.CanvasTexture(bandCanvas);bandMap.colorSpace=THREE.SRGBColorSpace;
    bandMap.wrapS=bandMap.wrapT=THREE.RepeatWrapping;
  }
  const terry=new THREE.MeshStandardMaterial({color:0x806577,roughness:1,metalness:0,side:THREE.DoubleSide,map:terryMap||null,bumpMap:terryBump||null,bumpScale:.0014});
  const woven=new THREE.MeshStandardMaterial({color:0x806271,roughness:1,side:THREE.DoubleSide,map:bandMap||null,bumpMap:bandMap||null,bumpScale:.00022});
  const wireMaterial=new THREE.MeshStandardMaterial({color:0xc98393,roughness:.45,metalness:.23});
  const edgeMaterial=new THREE.MeshStandardMaterial({color:0x715666,roughness:1});
  function mesh(name,geometry,material) {
    const object=new THREE.Mesh(geometry,material);object.name=`Wardrobe detail / ${name}`;
    object.castShadow=object.receiveShadow=true;
    object.userData.proceduralWardrobeDetail=true;
    object.userData.display_name=/wire|hook/.test(name)?'Pink wire hanger':'Plum terry towel';
    object.userData.description=description;group.add(object);return object;
  }
  function tube(name,points,radius,material=wireMaterial,closed=false) {
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),closed,'centripetal');
    return mesh(name,new THREE.TubeGeometry(curve,Math.max(40,points.length*5),radius,7,closed),material);
  }
  // Preserve the mounting roses and hanger anchor, replacing only the two
  // bowed grips with the photograph's straight, gently tapered black pulls.
  const gripMaterial=new THREE.MeshStandardMaterial({color:0x111112,roughness:.39,metalness:.10});
  const neckMaterial=new THREE.MeshStandardMaterial({color:0xb8b6b1,roughness:.27,metalness:.85});
  const hardwareDescription='Near-straight tapered black wardrobe grip with short curved silver necks and the original silver mounting roses.';
  const hardware=object=>{object.userData.display_name='Wardrobe handle';object.userData.description=hardwareDescription;return object;};
  handles.forEach(({object,box},index)=>{
    const z=box.getCenter(new THREE.Vector3()).z;
    const mounts=roses.filter(rose=>Math.abs(rose.box.getCenter(new THREE.Vector3()).z-z)<.035)
      .map(rose=>rose.box.getCenter(new THREE.Vector3())).sort((a,b)=>a.y-b.y);
    if(mounts.length<2)return;
    const lower=mounts[0],upper=mounts[mounts.length-1];
    const inset=.020,gripBottom=lower.y+inset,gripTop=upper.y-inset;
    const gripX=(lower.x+upper.x)/2-.025;
    const height=gripTop-gripBottom;
    const profile=[[0,0],[.0045,.001],[.0077,.003],[.0080,.006],[.0062,.010],
      [.0060,.018],[.0078,height*.42],[.0078,height*.58],[.0060,height-.018],
      [.0062,height-.010],[.0080,height-.006],[.0077,height-.003],[.0045,height-.001],[0,height]];
    const grip=hardware(mesh(`straight black wardrobe grip ${index+1}`,
      new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),20),gripMaterial));
    grip.position.set(gripX-planeX,gripBottom-anchorY,z-handleZ);
    for(const [mount,endY,label]of[[lower,gripBottom,'lower'],[upper,gripTop,'upper']]) {
      hardware(tube(`silver wardrobe handle ${index+1} ${label} neck`,[
        [mount.x-planeX-.005,mount.y-anchorY,z-handleZ],
        [mount.x-planeX-.013,mount.y-anchorY+(endY-mount.y)*.12,z-handleZ],
        [gripX-planeX+.002,mount.y-anchorY+(endY-mount.y)*.62,z-handleZ],
        [gripX-planeX,endY-anchorY,z-handleZ],
      ],.0034,neckMaterial));
    }
    object.visible=false;object.userData.layoutHidden=true;object.userData.wardrobeDetailReplaced=true;
    hidden.push(object.name);
  });
  const touch=contactX-planeX;
  // The small hook reaches the handle's lower rose at y=0 in this local frame.
  // Its neck and triangle hang below it; nothing extends above the handle grip.
  tube('small pink wire hook',[
    [0,-.087,-.009],[0,-.066,-.010],[.006,-.035,-.019],
    [touch*.65,-.009,-.021],[touch,.006,-.008],[touch,.008,.008],
    [touch*.75,-.004,.022],[touch*.35,-.026,.031],[.008,-.061,.041],
  ],.00125);
  // Three straight sides with only 4 mm corner bends: a coat-hanger triangle,
  // not a closed spline that bows all three sides into an oval.
  const triangle=[new THREE.Vector3(0,-.091,-.009),new THREE.Vector3(0,-.223,-.180),new THREE.Vector3(0,-.223,.180)];
  const corners=triangle.map((point,i)=>({
    before:point.clone().addScaledVector(triangle[(i+2)%3].clone().sub(point).normalize(),.004),
    point,
    after:point.clone().addScaledVector(triangle[(i+1)%3].clone().sub(point).normalize(),.004),
  }));
  const trianglePath=new THREE.CurvePath();
  for(let i=0;i<3;i++) {
    const next=corners[(i+1)%3];
    trianglePath.add(new THREE.LineCurve3(corners[i].after,next.before));
    trianglePath.add(new THREE.QuadraticBezierCurve3(next.before,next.point,next.after));
  }
  const triangleWire=mesh('straight-sided triangular wire hanger',new THREE.TubeGeometry(trianglePath,180,.00135,8,true),wireMaterial);
  triangleWire.userData.shape='Three straight sides; level lower bar; 36 cm wide';
  const twisted=[];
  for(let i=0;i<=36;i++) {
    const t=i/36,a=t*Math.PI*6;
    twisted.push([.0015*Math.cos(a),-.093+.029*t,-.009+.0017*Math.sin(a)]);
  }
  tube('short twisted wire neck',twisted,.00065);

  // A rear fall and two asymmetric front falls reproduce the open central fold.
  // X is depth away from the cupboard: smaller X points toward the viewer.
  const backFall=(u,v)=>{
    const z=(u-.5)*(.360+.082*Math.sin(v*Math.PI*.75))+.005*Math.sin(v*4.3+u*3.1)*v;
    const top=-.101-.124*Math.abs(u-.5)*2;
    const bottom=-.666+.028*Math.sin(u*6.4+.3)+.018*Math.cos(u*13.1);
    const x=.010+v*(.008+.011*Math.sin(u*15.4+v*.7)+.004*Math.sin(u*27-v*1.6));
    return [x,THREE.MathUtils.lerp(top,bottom,v),z];
  };
  const frontFall=side=>(u,v)=>{
    const opening=.007+.026*Math.sin(Math.PI*Math.min(1,v/.82));
    const inner=opening+(side<0 ? .020*Math.sin(Math.PI*v)-.022*v : .041*v+.007*Math.sin(Math.PI*v));
    const outer=side<0 ? .174+.058*Math.sin(Math.PI*v*.88) : .176+.060*Math.sin(Math.PI*v*.70)+.019*v;
    const z=side*THREE.MathUtils.lerp(inner,outer,u)+.006*Math.sin(v*5.2+side)*(v*v);
    const top=-.103-.123*Math.pow(u,.96);
    const bottom=side<0 ? -.495-.138*u+.021*Math.sin(u*7.0) : -.673-.078*u+.019*Math.sin(u*6.4);
    const y=THREE.MathUtils.lerp(top,bottom,v)+.006*Math.sin(u*9.2+v*3.5)*v*v;
    const fold=(.0015+.018*v)*Math.sin(u*10.0+Math.sin(v*3.5)*.65+side*.55)+.004*v*Math.sin(u*21.4-v*2.1);
    // Cloth rests over both sloping shoulders, then falls toward the viewer.
    // The hook and the centre of the lower pink bar remain visible in the gap.
    const x=-.008-.039*Math.sin(Math.PI*v*.85)*(.55+.45*u)+fold-.017*Math.sin(Math.PI*u)*v;
    return [x,y,z];
  };
  function cloth(name,fn,nu=44,nv=64,bordered=true) {
    const positions=[],uvs=[],indices=[];const geometry=new THREE.BufferGeometry();
    for(let row=0;row<=nv;row++)for(let col=0;col<=nu;col++) {
      const u=col/nu,v=row/nv,p=fn(u,v);positions.push(...p);
      uvs.push(u*1.7,v*3.2);
    }
    for(let row=0;row<nv;row++) {
      const first=indices.length;
      for(let col=0;col<nu;col++) {const a=row*(nu+1)+col,b=a+nu+1;indices.push(a,b,a+1,a+1,b,b+1);}
      const v=(row+.5)/nv;
      const materialIndex=bordered&&((v>.78&&v<.875)||v>.98)?1:0;
      const previous=geometry.groups[geometry.groups.length-1];
      if(previous&&previous.materialIndex===materialIndex)previous.count+=indices.length-first;
      else geometry.addGroup(first,indices.length-first,materialIndex);
    }
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();
    const object=mesh(name,geometry,[terry,woven]);
    // Flat cotton binding follows each edge; the fine seam adds thickness.
    if(bordered) {
      for(const fixed of [0,1]) {
        const bindingPositions=[],bindingUvs=[],bindingIndices=[];
        for(let i=0;i<=nv;i++)for(const offset of [0,.035]) {
          const p=fn(fixed===0?offset:1-offset,i/nv);
          bindingPositions.push(p[0]-.001,p[1],p[2]);bindingUvs.push(offset*12,i/nv*5);
        }
        for(let i=0;i<nv;i++){const a=i*2;bindingIndices.push(a,a+2,a+1,a+1,a+2,a+3);}
        const binding=new THREE.BufferGeometry();
        binding.setAttribute('position',new THREE.Float32BufferAttribute(bindingPositions,3));
        binding.setAttribute('uv',new THREE.Float32BufferAttribute(bindingUvs,2));
        binding.setIndex(bindingIndices);binding.computeVertexNormals();mesh(`${name} flat edge binding`,binding,woven);
        const points=[];for(let i=0;i<=36;i++){const p=fn(fixed,i/36);points.push([p[0]-.0012,p[1],p[2]]);}
        tube(`${name} side seam`,points,.0005,edgeMaterial);
      }
      const points=[];for(let i=0;i<=36;i++){const p=fn(i/36,1);points.push([p[0]-.0008,p[1],p[2]]);}
      tube(`${name} bottom hem`,points,.0013,edgeMaterial);
    }
    return object;
  }
  cloth('towel rear loose fall',backFall,48,68,false);
  cloth('towel left turned front panel',frontFall(-1));
  cloth('towel longer right front panel',frontFall(1));
  for(const side of [-1,1]) {
    const shoulder=(u,v)=>{
      const front=frontFall(side)(u,0);
      return [THREE.MathUtils.lerp(front[0],.010,v),front[1]+.006*Math.sin(Math.PI*v),front[2]];
    };
    cloth(`towel ${side<0?'left':'right'} rounded shoulder fold`,shoulder,44,8,false);
  }

  model.add(group);group.updateWorldMatrix(true,true);
  const bounds=new THREE.Box3().setFromObject(group);let meshCount=0;
  group.traverse(object=>{if(object.isMesh)meshCount++;});
  group.userData.meshCount=meshCount;
  group.userData.bounds={min:bounds.min.toArray(),max:bounds.max.toArray()};
  return group;
}
