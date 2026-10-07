import * as THREE from 'three';

const originals=new WeakMap();
const STOP_NAME='Entrance / fixed inner door stops';
const normalize=name=>String(name||'').toLowerCase().replace(/[\\/_]+/g,' ').replace(/\s+/g,' ').trim();
const isLeafPart=name=>/^(oak entrance door|door |lever handle)/.test(name);
const isFrame=name=>/^entrance (frame|top frame)/.test(name);
const isHangingDecoration=name=>/^door /.test(name)&&/welcome|hanger|sign|printed.*outline|hanging.*loop/.test(name);

/** Close the existing oak leaf and remove its hanging decorations after layout. */
export function closeEntranceDoor(model) {
  if(!model?.isObject3D)throw new TypeError('closeEntranceDoor expects the loaded room model.');
  model.updateWorldMatrix(true,true);
  const inverseModel=model.matrixWorld.clone().invert();
  let state=originals.get(model);
  if(!state) {
    const records=[];
    model.traverse(object=>{
      if(!object.isMesh)return;
      const name=normalize(object.name);
      if(!isLeafPart(name)&&!isFrame(name))return;
      records.push({object,name,frame:isFrame(name),original:new THREE.Matrix4().multiplyMatrices(inverseModel,object.matrixWorld)});
    });
    const leaf=records.find(record=>/^oak entrance door/.test(record.name));
    if(!leaf)throw new Error('The oak entrance leaf was not found in the room model.');
    leaf.object.geometry.computeBoundingBox();
    const bounds=leaf.object.geometry.boundingBox;
    const along=new THREE.Vector3(1,0,0).transformDirection(leaf.original);
    const center=bounds.getCenter(new THREE.Vector3()).applyMatrix4(leaf.original);
    const leafWidth=(bounds.max.x-bounds.min.x)*new THREE.Vector3().setFromMatrixColumn(leaf.original,0).length();
    const hinge=center.clone().addScaledVector(along,-leafWidth/2);hinge.y=0;
    const openAngle=Math.atan2(-along.z,along.x);
    state={records,leaf,hinge,leafWidth,openAngle};originals.set(model,state);
  }
  const {records,leaf,hinge,leafWidth,openAngle}=state;
  const frameBounds=record=>{
    record.object.geometry.computeBoundingBox();
    return record.object.geometry.boundingBox.clone().applyMatrix4(record.original);
  };
  const jambs=records.filter(record=>/^entrance frame/.test(record.name)).map(record=>({record,box:frameBounds(record)}))
    .sort((a,b)=>a.box.getCenter(new THREE.Vector3()).z-b.box.getCenter(new THREE.Vector3()).z);
  const header=records.find(record=>/^entrance top frame/.test(record.name));
  const openingFront=jambs.length>1?-jambs[jambs.length-1].box.min.z:.0825;
  const openingBack=jambs.length>1?-jambs[0].box.max.z:.9175;
  const closedFront=(openingFront+openingBack-leafWidth)/2;
  const targetHinge=new THREE.Vector3(hinge.x,hinge.y,-closedFront);
  const closing=new THREE.Matrix4().makeTranslation(...targetHinge.toArray())
    .multiply(new THREE.Matrix4().makeRotationY(Math.PI/2-openAngle))
    .multiply(new THREE.Matrix4().makeTranslation(-hinge.x,-hinge.y,-hinge.z));
  const rotated=[],hidden=[];
  for(const record of records) {
    const {object,name,frame}=record;
    object.userData.layoutCategory='door';object.userData.closedEntranceDoor=true;
    object.userData.wall_side='left';
    if(!frame) {
      const desired=new THREE.Matrix4().multiplyMatrices(closing,record.original);
      if(object.parent) {
        object.parent.updateWorldMatrix(true,false);
        const parentInModel=new THREE.Matrix4().multiplyMatrices(inverseModel,object.parent.matrixWorld).invert();
        object.matrix.multiplyMatrices(parentInModel,desired);
      } else object.matrix.copy(desired);
      object.matrixAutoUpdate=false;
      object.matrix.decompose(object.position,object.quaternion,object.scale);
      object.matrixWorldNeedsUpdate=true;rotated.push(object.name);
      object.userData.display_name='Closed oak entrance door';
      object.userData.description='The oak entrance door is closed in the left-wall opening, facing the wardrobe.';
    }
    if(isHangingDecoration(name)) {
      object.visible=false;object.userData.layoutHidden=true;
      object.userData.entranceDecorationRemoved=true;hidden.push(object.name);
    } else object.visible=!object.userData.layoutHidden;
  }
  model.updateWorldMatrix(true,true);
  // The veneer is exported with its open-angle coordinates baked into vertices.
  // Measure transformed vertices, not its old axis-aligned bounding box.
  const boxInModel=object=>{
    const bounds=new THREE.Box3(),point=new THREE.Vector3();
    const matrix=new THREE.Matrix4().multiplyMatrices(inverseModel,object.matrixWorld);
    const positions=object.geometry.getAttribute('position');
    for(let i=0;i<positions.count;i++)bounds.expandByPoint(point.fromBufferAttribute(positions,i).applyMatrix4(matrix));
    return bounds;
  };
  const leafBox=boxInModel(leaf.object),panelBox=leafBox.clone();
  for(const {object,name,frame}of records)if(!frame&&!object.userData.layoutHidden&&/oak|panel/.test(name))panelBox.union(boxInModel(object));

  // The exported casing is higher/wider than its leaf. Fixed narrow rebates
  // behind the closed leaf conceal those gaps, without moving the frame or
  // intersecting the door's oak veneer. Reuse the original casing material.
  const previous=model.getObjectByName(STOP_NAME);
  if(previous){previous.traverse(object=>object.geometry?.dispose());model.remove(previous);}
  const stops=new THREE.Group();stops.name=STOP_NAME;
  const frameMaterial=jambs[0]?.record.object.material||new THREE.MeshStandardMaterial({color:0xd5d2ca,roughness:.7});
  const stopDepth=.016,stopFrontX=panelBox.min.x-.002,stopX=stopFrontX-stopDepth/2;
  const headerBottom=header?frameBounds(header).min.y:2.1475;
  const addStop=(name,minY,maxY,minDepth,maxDepth)=>{
    if(maxY<=minY||maxDepth<=minDepth)return;
    const object=new THREE.Mesh(new THREE.BoxGeometry(stopDepth,maxY-minY,maxDepth-minDepth),frameMaterial);
    object.name=`Entrance / fixed ${name} rebate`;
    object.position.set(stopX,(minY+maxY)/2,-(minDepth+maxDepth)/2);
    object.castShadow=object.receiveShadow=true;
    object.userData={layoutCategory:'door',closedEntranceDoor:true,wall_side:'left',display_name:'Entrance frame',description:'Fixed inner door stop behind the closed oak leaf.'};
    stops.add(object);
  };
  addStop('hinge-side',leafBox.min.y,headerBottom,openingFront-.002,closedFront+.008);
  addStop('latch-side',leafBox.min.y,headerBottom,closedFront+leafWidth-.008,openingBack+.002);
  addStop('head',leafBox.max.y-.008,headerBottom+.004,openingFront-.002,openingBack+.002);
  model.add(stops);model.updateWorldMatrix(true,true);
  const assemblyBox=new THREE.Box3();
  for(const {object,frame}of records)if(!frame&&object.visible)assemblyBox.union(boxInModel(object));
  const summary=box=>({min:box.min.toArray(),max:box.max.toArray()});
  const result={closed:true,rotationDegrees:(Math.PI/2-openAngle)*180/Math.PI,
    hinge:targetHinge.toArray(),rotatedNames:rotated,hiddenNames:hidden,
    unchangedFrameNames:records.filter(record=>record.frame).map(record=>record.object.name),
    leafBounds:summary(leafBox),oakPanelBounds:summary(panelBox),visibleAssemblyBounds:summary(assemblyBox),
    roomDepth:{front:closedFront,back:closedFront+leafWidth},height:leafBox.max.y-leafBox.min.y,
    fixedRebates:stops.children.length,rebateClearance:panelBox.min.x-stopFrontX};
  model.userData.closedEntranceDoor=result;return result;
}
