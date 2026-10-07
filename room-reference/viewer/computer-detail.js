import * as THREE from 'three';

const GROUP_NAME = 'Computers / space-grey MacBook, Dell and Logitech Brio';
const normalize = name => String(name || '').toLowerCase().replace(/[\\/_]+/g,' ').replace(/\s+/g,' ').trim();

/** Device-only finish corrections. Call after applyLayout and refineDesk. */
export function refineComputers(model, { width = 2, depth = 3.9 } = {}) {
  const previous = model.getObjectByName(GROUP_NAME);
  if (previous) model.remove(previous);
  model.updateWorldMatrix(true,true);
  const inverse=model.matrixWorld.clone().invert(), entries=[];
  model.traverse(object=>{
    if(!object.isMesh)return;
    entries.push({object,name:normalize(object.name),matrix:new THREE.Matrix4().multiplyMatrices(inverse,object.matrixWorld),
      box:new THREE.Box3().setFromObject(object).applyMatrix4(inverse)});
  });
  const find=prefix=>entries.find(entry=>entry.name.startsWith(prefix));
  const group=new THREE.Group();group.name=GROUP_NAME;
  const hidden=[],modified=[];
  const material=(color,roughness=.5,metalness=0,extra={})=>new THREE.MeshStandardMaterial({color,roughness,metalness,...extra});
  // Both photographed devices share the same neutral graphite satin finish.
  const graphite=material(0x56585c,.44,.34), trackpadGraphite=material(0x56585c,.56,.24);
  const black=material(0x101214,.57), seam=material(0x282b2e,.55,.15);
  const rim=material(0x202326,.32,.38), shutter=material(0x686a6c,.58,.22);
  const mesh=(name,geometry,mat,position=[0,0,0],device='Space-grey MacBook')=>{
    const object=new THREE.Mesh(geometry,mat);object.name=`Computers / ${name}`;object.position.set(...position);
    object.castShadow=object.receiveShadow=true;object.userData.computerDetail=true;
    object.userData.display_name=device;
    object.userData.description=device==='Space-grey MacBook'?'Space-grey MacBook Air with low black chiclet keys, a full-height function row, Touch ID and a broad centred graphite trackpad.':device==='Dell monitor'?'Black Dell monitor on a space-grey stand matching the MacBook.':'Space-grey Logitech Brio webcam with a rounded horizontal body, a large concentric lens barrel, closed grey privacy shutter and black hinged clip.';
    group.add(object);return object;
  };
  const hide=entry=>{if(!entry)return;entry.object.visible=false;entry.object.userData.layoutHidden=true;entry.object.userData.computerDetailHidden=true;hidden.push(entry.object.name);};
  const finish=(entry,mat)=>{if(!entry)return;entry.object.material=mat;modified.push(entry.object.name);};
  // A fresh material on each selected device finish avoids recolouring shared
  // GLB materials on the desk or other furnishings.
  for(const entry of entries) {
    if(/^laptop (machined lower shell|open lid)$/.test(entry.name))finish(entry,graphite);
    const monitorStand = /^monitor (foot|vertical riser)(?:\.\d+)?$/.test(entry.name);
    const laptopStand = /^laptop stand (base|angled support|support cradle)(?:\.\d+)?$/.test(entry.name);
    if(monitorStand || laptopStand) {
      finish(entry,graphite);
      entry.object.userData.display_name=monitorStand?'Space-grey Dell monitor stand':'Space-grey MacBook holder';
      entry.object.userData.description='Satin space-grey finish matching the MacBook chassis.';
    }
    if(/^monitor vertical riser$/.test(entry.name)) {
      // The original front face protruded 0.3 mm through the display. Seat the
      // riser inside the rear housing so its grey finish cannot cover the image.
      const desired=new THREE.Matrix4().makeTranslation(.015,0,0).multiply(entry.matrix);
      const parentInverse=new THREE.Matrix4().multiplyMatrices(inverse,entry.object.parent.matrixWorld).invert();
      entry.object.matrix.multiplyMatrices(parentInverse,desired);
      entry.object.matrix.decompose(entry.object.position,entry.object.quaternion,entry.object.scale);
      entry.object.matrixWorldNeedsUpdate=true;
    }
    if(/^laptop (keyboard recess|eighty sculpted keys|black display surround|hinge)$/.test(entry.name))finish(entry,black);
    if(/^laptop /.test(entry.name)&&!/^laptop stand /.test(entry.name)) {
      entry.object.userData.display_name='Space-grey MacBook';
      entry.object.userData.description='Space-grey MacBook Air with low black chiclet keys, a full-height function row, Touch ID and a broad centred trackpad.';
    }
    if(/^monitor /.test(entry.name)&&!monitorStand)entry.object.userData.display_name='Dell monitor';
    if(/^webcam /.test(entry.name)) {
      entry.object.userData.display_name='Space-grey Logitech Brio webcam';
      entry.object.userData.description='Space-grey Logitech Brio with a rounded body, prominent circular lens barrel and grey privacy shutter.';
      hide(entry);
    }
  }
  const roundedGeometry=(sx,sy,sz,radius=.003)=>{
    const r=Math.min(radius,sx*.30,sy*.30,sz*.30), shape=new THREE.Shape();
    shape.moveTo(-sx/2+r,-sy/2+r);shape.lineTo(sx/2-r,-sy/2+r);shape.lineTo(sx/2-r,sy/2-r);shape.lineTo(-sx/2+r,sy/2-r);shape.closePath();
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:sz-2*r,bevelEnabled:true,bevelSize:r,bevelThickness:r,bevelSegments:3,curveSegments:6,steps:1});
    geometry.translate(0,0,-sz/2+r);geometry.computeVertexNormals();return geometry;
  };
  const box=(name,position,size,mat,r=.002,device)=>mesh(name,roundedGeometry(...size,r),mat,position,device);
  const textMap=(draw,w=512,h=128)=>{
    if(typeof document==='undefined')return null;
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    const context=canvas.getContext('2d');draw(context,w,h);
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;return map;
  };
  const decalMaterial=map=>new THREE.MeshStandardMaterial({map,transparent:true,alphaTest:.035,roughness:.58,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
  const label=(name,text,w,h,position,device,color='#ccd0d2')=>{
    const map=textMap((ctx,cw,ch)=>{ctx.fillStyle=color;ctx.font=`600 ${ch*.68}px Arial, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,cw/2,ch*.53);});
    if(!map)return null;
    const object=mesh(name,new THREE.PlaneGeometry(w,h),decalMaterial(map),position,device);
    object.rotation.y=-Math.PI/2;object.castShadow=false;return object;
  };
  const upward=(object)=>{object.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0,0,1),new THREE.Vector3(1,0,0),new THREE.Vector3(0,1,0)));return object;};
  const onLid=(object,entry,localPosition,back=false)=>{
    const transform=new THREE.Matrix4().makeRotationY(back?Math.PI/2:-Math.PI/2);transform.setPosition(...localPosition);
    object.matrix.multiplyMatrices(entry.matrix,transform);object.matrixAutoUpdate=false;object.matrixWorldNeedsUpdate=true;
  };

  // Keep the original laptop chassis, hinge, display and stand in exactly their
  // current positions. The larger trackpad fits within the existing palm rest.
  const shell=find('laptop machined lower shell'), oldPad=find('laptop touchpad');
  if(shell&&oldPad) {
    hide(oldPad);hide(find('laptop trackpad fine inset'));
    const center=oldPad.box.getCenter(new THREE.Vector3());
    const w=Math.min(.136,(shell.box.max.z-shell.box.min.z)*.47),d=.071;
    box('MacBook / fine trackpad inset',[center.x,shell.box.max.y+.00055,center.z],[d,.0008,w],seam,.0002);
    box('MacBook / broad graphite glass trackpad',[center.x,shell.box.max.y+.00110,center.z],[d-.0015,.00065,w-.0015],trackpadGraphite,.00018);
  }
  const keys=find('laptop eighty sculpted keys'), keyboard=find('laptop keyboard recess');
  if(keys&&keyboard) {
    hide(keys);
    const b=keyboard.box, span=b.max.z-b.min.z-.004, rowDepth=(b.max.x-b.min.x)/6;
    const z0=(b.min.z+b.max.z-span)/2, y=keys.box.max.y-.0010;
    const rows=[
      [['esc',1.4],...Array.from({length:12},(_,i)=>['F'+(i+1),1]),['',1]],
      [['`',1],...['1','2','3','4','5','6','7','8','9','0','−','='].map(t=>[t,1]),['delete',1.4]],
      [['tab',1.4],...['Q','W','E','R','T','Y','U','I','O','P','[',']','\\'].map(t=>[t,1])],
      [['caps lock',1.8],...['A','S','D','F','G','H','J','K','L',';',"'"].map(t=>[t,1]),['return',1.6]],
      [['shift',2.2],...['Z','X','C','V','B','N','M',',','.','/'].map(t=>[t,1]),['shift',2.2]],
      [['fn',1],['control',1],['option',1],['command',1.25],['',5.9],['command',1.25],['option',1],['←',1],['↑↓',1],['→',1]],
    ];
    const positions=[],normals=[],uvs=[],legends=[];let touchID;
    for(let row=0;row<rows.length;row++) {
      const units=rows[row].reduce((sum,key)=>sum+key[1],0);let cursor=0;
      for(let col=0;col<rows[row].length;col++) {
        const [text,unitsWide]=rows[row][col],w=span*unitsWide/units-.0017;
        const x=b.max.x-(row+.5)*rowDepth,z=z0+span*(cursor+unitsWide/2)/units;
        cursor+=unitsWide;
        if(text==='↑↓') {
          for(const sign of [-1,1]) {
            const g=roundedGeometry(rowDepth*.43,.00115,w,.00034);g.translate(x+sign*rowDepth*.235,y,z);
            positions.push(...g.attributes.position.array);normals.push(...g.attributes.normal.array);uvs.push(...g.attributes.uv.array);g.dispose();
            legends.push({text:sign>0?'↑':'↓',x:x+sign*rowDepth*.235,z,w,h:rowDepth*.43});
          }
        } else {
          const g=roundedGeometry(rowDepth-.0021,.00115,w,.00034);g.translate(x,y,z);
          positions.push(...g.attributes.position.array);normals.push(...g.attributes.normal.array);uvs.push(...g.attributes.uv.array);g.dispose();
          legends.push({text,x,z,w,h:rowDepth-.0021});
        }
        if(row===0&&col===rows[row].length-1)touchID={x,z,w};
      }
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
    mesh('MacBook / low chiclet keyboard with full-height function row',geometry,black);
    const keyMap=textMap((ctx,w,h)=>{
      ctx.fillStyle='#b7bec4';ctx.textAlign='center';ctx.textBaseline='middle';
      for(const key of legends) {
        ctx.font=`${key.text.length>3?13:19}px Arial, sans-serif`;
        const px=(key.z-z0)/span*w,py=(b.max.x-key.x)/(b.max.x-b.min.x)*h;
        ctx.fillText(key.text,px,py);
      }
    },1024,512);
    if(keyMap) {
      const object=mesh('MacBook / subtle keyboard legends',new THREE.PlaneGeometry(span,b.max.x-b.min.x),decalMaterial(keyMap),[(b.min.x+b.max.x)/2,y+.00076,(b.min.z+b.max.z)/2]);
      upward(object);object.castShadow=false;
    }
    if(touchID) {
      const ring=new THREE.TorusGeometry(.0050,.00028,6,28);ring.rotateX(-Math.PI/2);
      mesh('MacBook / Touch ID upper-right ring',ring,material(0x34373a,.40),[touchID.x,y+.00075,touchID.z]);
      mesh('MacBook / Touch ID black fingerprint surface',new THREE.CylinderGeometry(.0047,.0047,.00024,28),black,[touchID.x,y+.00065,touchID.z]);
    }
  }
  // The reference has no side speaker grilles and no lower-bezel wordmark.
  const lid=find('laptop open lid');
  if(lid) {
    const apple=textMap(ctx=>{
      ctx.fillStyle='#25272a';ctx.beginPath();ctx.moveTo(64,41);ctx.bezierCurveTo(44,27,25,39,26,66);ctx.bezierCurveTo(26,88,42,111,52,108);ctx.bezierCurveTo(62,104,67,104,77,109);ctx.bezierCurveTo(87,111,100,94,104,83);ctx.bezierCurveTo(84,75,84,56,102,48);ctx.bezierCurveTo(91,31,76,33,64,41);ctx.fill();ctx.beginPath();ctx.moveTo(65,35);ctx.bezierCurveTo(65,19,77,11,87,10);ctx.bezierCurveTo(88,23,78,34,65,35);ctx.fill();
    },128,128);
    if(apple) {
      lid.object.geometry.computeBoundingBox();const b=lid.object.geometry.boundingBox;
      const mark=mesh('MacBook / dark lid Apple mark',new THREE.PlaneGeometry(.036,.036),decalMaterial(apple));mark.castShadow=false;
      onLid(mark,lid,[b.max.x+.00025,0,0],true);
    }
  }

  // A small Dell mark replaces the generic silver dash on the existing bezel.
  const badge=find('monitor understated silver badge'),chin=find('monitor lower chin');
  if(badge)hide(badge);
  if(chin) {
    const center=chin.box.getCenter(new THREE.Vector3());
    label('Dell / lower bezel mark','DELL',.029,.0083,[chin.box.min.x-.00035,center.y,center.z],'Dell monitor');
  }

  // Photo-matched Brio: graphite cylindrical bar, oversized round lens barrel,
  // a closed rectangular shutter, and a black hinged monitor clip.
  const oldCamera=find('webcam body'),monitor=find('monitor rear housing');
  const ratio=Math.min(1,depth/3.9),gap=Math.max(0,depth-3.9);
  const cameraCenter=oldCamera?.box.getCenter(new THREE.Vector3())||new THREE.Vector3(width-.158,1.30,-(gap+1.59*ratio));
  const cameraTop=monitor?.box.max.y??1.276;
  const cx=cameraCenter.x,cy=cameraTop+.029,cz=cameraCenter.z,device='Space-grey Logitech Brio webcam';
  const bodyProfile=[[0,-.048],[.0143,-.048],[.0158,-.0468],[.0160,-.044],
    [.0160,.044],[.0158,.0468],[.0143,.048],[0,.048]];
  const body=mesh('Logitech Brio / graphite rounded horizontal body',new THREE.LatheGeometry(bodyProfile.map(p=>new THREE.Vector2(...p)),48),graphite,[cx,cy,cz],device);
  body.rotation.x=Math.PI/2;
  box('Logitech Brio / black monitor clip top',[cx+.006,cameraTop+.003,cz],[.048,.006,.036],black,.0015,device);
  box('Logitech Brio / black hinged clip rear',[cx+.027,cameraTop-.012,cz],[.006,.032,.034],black,.0015,device);
  box('Logitech Brio / black front clip lip',[cx-.018,cameraTop-.002,cz],[.006,.012,.034],black,.0015,device);
  const hinge=mesh('Logitech Brio / horizontal hinge',new THREE.CylinderGeometry(.004,.004,.032,24),black,[cx-.008,cameraTop+.009,cz],device);hinge.rotation.x=Math.PI/2;
  const disk=(name,x,y,z,radius,length,mat)=>{
    const object=mesh(name,new THREE.CylinderGeometry(radius,radius,length,48),mat,[x,y,z],device);object.rotation.z=Math.PI/2;return object;
  };
  disk('Logitech Brio / protruding round lens barrel',cx-.019,cy,cz,.0220,.016,black);
  disk('Logitech Brio / concentric outer lens rim',cx-.0272,cy,cz,.0215,.0012,rim);
  disk('Logitech Brio / dark lens well',cx-.0278,cy,cz,.0197,.0007,black);
  disk('Logitech Brio / dark glass lens',cx-.0284,cy,cz,.0047,.00015,material(0x10212b,.17,.36));
  // The photographed cover has two flat leaves that slide behind a fixed
  // rounded aperture. This face masks their travel inside the lens barrel.
  const faceShape=new THREE.Shape();faceShape.absarc(0,0,.0197,0,Math.PI*2,false);
  const aperture=new THREE.Path(),hw=.0086,hh=.0054,r=.0011;
  aperture.moveTo(-hw+r,-hh);aperture.lineTo(hw-r,-hh);aperture.quadraticCurveTo(hw,-hh,hw,-hh+r);
  aperture.lineTo(hw,hh-r);aperture.quadraticCurveTo(hw,hh,hw-r,hh);
  aperture.lineTo(-hw+r,hh);aperture.quadraticCurveTo(-hw,hh,-hw,hh-r);
  aperture.lineTo(-hw,-hh+r);aperture.quadraticCurveTo(-hw,-hh,-hw+r,-hh);aperture.closePath();
  faceShape.holes.push(aperture);
  const face=mesh('Logitech Brio / recessed lens face',new THREE.ShapeGeometry(faceShape,32),black,[cx-.0291,cy,cz],device);
  face.rotation.y=-Math.PI/2;
  for(const radius of [.0192,.0178,.0164,.0150,.0136,.0122,.0108]) {
    const ring=mesh('Logitech Brio / fine concentric lens ring',new THREE.TorusGeometry(radius,.00020,5,64),rim,[cx-.0293,cy,cz],device);ring.rotation.y=Math.PI/2;
  }
  for(const [side,direction] of [['upper',1],['lower',-1]]) {
    const leaf=box(`Logitech Brio / privacy shutter ${side} leaf`,[cx-.02885,cy+direction*.0027,cz],[.00025,.0054,.018],shutter,.00004,device);
    leaf.userData.privacySlideDirection=direction;leaf.userData.privacySlideTravel=.0037;
    const edge=box(`Logitech Brio / ${side} shutter seam edge`,[0,0,0],[.00005,.000035,.0178],seam,.000005,device);
    leaf.add(edge);edge.position.set(-.00016,-direction*(.0027-.0000175),0);
  }
  for(const sign of [-1,1])box('Logitech Brio / vertical microphone slot',[cx-.01615,cy,cz+sign*.0385],[.0006,.0070,.00145],black,.00018,device);
  label('Logitech Brio / subtle logi mark','logi',.013,.0061,[cx-.0164,cy-.0005,cz-.028],device,'#383a3c');
  box('Logitech Brio / horizontal status slot',[cx-.0162,cy,cz+.028],[.0007,.00145,.0065],black,.0002,device);
  const ringText=textMap((ctx,w,h)=>{
    ctx.fillStyle='#676b6e';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='17px Arial, sans-serif';
    const arc=(text,radius,startAngle,endAngle)=>{for(let i=0;i<text.length;i++) {
      const angle=startAngle+(endAngle-startAngle)*(i+.5)/text.length;
      ctx.save();ctx.translate(w/2+Math.cos(angle)*radius,h/2+Math.sin(angle)*radius);ctx.rotate(angle+Math.PI/2);ctx.fillText(text[i],0,0);ctx.restore();
    }};
    arc('ULTRA-WIDE 4K',106,Math.PI*1.22,Math.PI*1.78);
    ctx.font='15px Arial, sans-serif';ctx.fillText('8.5MP SENSOR',w/2,h*.83);
  },256,256);
  if(ringText) {
    const mark=mesh('Logitech Brio / lens rim lettering',new THREE.PlaneGeometry(.039,.039),decalMaterial(ringText),[cx-.02955,cy,cz],device);mark.rotation.y=-Math.PI/2;mark.castShadow=false;
  }

  // Keep the webcam separate from the monitor for picking, close-up framing,
  // and the privacy-cover animation. Coordinates remain in the same space.
  const webcam=new THREE.Group();webcam.name='Computers / Logitech Brio webcam';
  webcam.userData.display_name=device;
  webcam.userData.description='Click the webcam to open or close its grey privacy cover.';
  webcam.userData.monitorTop=cameraTop;
  for(const object of [...group.children])if(object.name.startsWith('Computers / Logitech Brio /'))webcam.add(object);
  group.add(webcam);

  group.userData.hiddenOriginals=hidden;group.userData.modifiedOriginals=modified;
  model.add(group);group.updateWorldMatrix(true,true);
  const bounds=new THREE.Box3().setFromObject(group);let meshCount=0;
  group.traverse(object=>{if(object.isMesh)meshCount++;});
  group.userData.meshCount=meshCount;group.userData.bounds={min:bounds.min.toArray(),max:bounds.max.toArray()};
  group.userData.cameraAnchor=cameraCenter.toArray();
  group.userData.sharedDeviceFinish='Space-grey graphite satin, #56585c';
  return group;
}
