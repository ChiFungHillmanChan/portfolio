import * as THREE from 'three';

// Photo-matched, undraped chair. Local +X is the seated person's forward
// direction, +Y is up, and Z spans the chair from one arm to the other.
export function addChair(model, { width = 2, depth = 3.9 } = {}) {
  const group = new THREE.Group();
  group.name = 'Chair / clean black gaming chair';
  group.position.set(width / 2, 0, -Math.min(1.85, depth - .8));
  group.userData.proceduralChair = true;
  group.userData.frontDirection = '+X, toward the desk';
  const description = 'Black and charcoal gaming chair with a tall bucket back, head and lumbar cushions, adjustable arms and a five-star wheeled base. The seat upholstery is clean and there is no draped jacket.';

  let grain;
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const context = canvas.getContext('2d');
    const pixels = context.createImageData(128, 128);
    let seed = 1703;
    for (let i = 0; i < pixels.data.length; i += 4) {
      seed = (1664525 * seed + 1013904223) >>> 0;
      const v = 113 + (seed >>> 25);
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = v;
      pixels.data[i + 3] = 255;
    }
    context.putImageData(pixels, 0, 0);
    grain = new THREE.CanvasTexture(canvas);
    grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
    grain.repeat.set(4, 4);
  }
  const leather = new THREE.MeshStandardMaterial({ color: 0x171b1d, roughness: .58, metalness: .02, bumpMap: grain || null, bumpScale: .00015 });
  const grey = new THREE.MeshStandardMaterial({ color: 0x343b3d, roughness: .63, metalness: .01, bumpMap: grain || null, bumpScale: .00012 });
  const shell = new THREE.MeshStandardMaterial({ color: 0x161b1e, roughness: .73 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x22282b, roughness: .38, metalness: .5 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0x737a7d, roughness: .31, metalness: .83 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x101415, roughness: .91 });
  const thread = new THREE.MeshStandardMaterial({ color: 0x42494b, roughness: .86 });
  const darkThread = new THREE.MeshStandardMaterial({ color: 0x252b2d, roughness: .88 });

  function mesh(name, geometry, material, parent = group) {
    const object = new THREE.Mesh(geometry, material);
    object.name = `Chair / ${name}`;
    object.castShadow = object.receiveShadow = true;
    object.userData.proceduralChair = true;
    object.userData.display_name = 'Gaming chair';
    object.userData.description = description;
    parent.add(object);
    return object;
  }
  function cylinder(name, point, radius, height, material, radiusTop = radius, parent = group) {
    const object = mesh(name, new THREE.CylinderGeometry(radiusTop, radius, height, 24), material, parent);
    object.position.set(...point);
    return object;
  }
  function rod(name, start, end, radius, material, parent = group) {
    const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end);
    const object = cylinder(name, a.clone().add(b).multiplyScalar(.5).toArray(), radius, a.distanceTo(b), material, radius, parent);
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
    return object;
  }
  function roundedBox(name, point, size, radius, material, parent = group) {
    const [sx, sy, sz] = size;
    const r = Math.min(radius, sx / 3, sy / 3, sz / 3);
    const shape = new THREE.Shape();
    const x = sx / 2 - r, y = sy / 2 - r;
    shape.moveTo(-x, -y); shape.lineTo(x, -y); shape.lineTo(x, y); shape.lineTo(-x, y); shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: sz - 2 * r, bevelEnabled: true, bevelSize: r, bevelThickness: r, bevelSegments: 4, steps: 1 });
    geometry.translate(0, 0, -sz / 2 + r);
    const object = mesh(name, geometry, material, parent);
    object.position.set(...point);
    return object;
  }
  function seam(name, points, radius = .00115, material = darkThread, closed = false) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), closed, 'centripetal');
    return mesh(name, new THREE.TubeGeometry(curve, Math.max(20, points.length * 3), radius, 5, closed), material);
  }
  function cushion(name, point, size, material = leather) {
    // A thin superellipsoid keeps a padded rectangular outline without looking
    // like a sphere or a thick capsule. The front face has soft, continuous normals.
    const geometry = new THREE.SphereGeometry(1, 36, 24);
    const positions = geometry.attributes.position;
    const power = (v, exponent) => Math.sign(v) * Math.pow(Math.abs(v), exponent);
    for (let i = 0; i < positions.count; i++) positions.setXYZ(i,
      power(positions.getX(i), .55) * size[0] / 2,
      power(positions.getY(i), .55) * size[1] / 2,
      power(positions.getZ(i), .48) * size[2] / 2);
    geometry.computeVertexNormals();
    const object = mesh(name, geometry, material);
    object.position.set(...point);
    return object;
  }

  // Rounded head, slightly flared shoulder wings and a narrower lumbar waist.
  // Values are [height, half width]. A thin rear shell follows the same contour.
  const profile = [[.445,.195],[.50,.229],[.60,.226],[.71,.190],[.82,.192],[.93,.244],[1.00,.249],[1.055,.210],[1.14,.177],[1.20,.151],[1.235,.109],[1.249,.051],[1.252,.002]];
  function halfWidth(y) {
    let k = 0;
    while (k < profile.length - 2 && y > profile[k + 1][0]) k++;
    const a = profile[k], b = profile[k + 1], t = THREE.MathUtils.clamp((y - a[0]) / (b[0] - a[0]), 0, 1);
    const before = profile[Math.max(0,k - 1)], after = profile[Math.min(profile.length - 1,k + 2)];
    const d0 = (b[1] - before[1]) / (b[0] - before[0]);
    const d1 = (after[1] - a[1]) / (after[0] - a[0]);
    return Math.max(.002, (2*t*t*t-3*t*t+1)*a[1] + (t*t*t-2*t*t+t)*(b[0]-a[0])*d0 + (-2*t*t*t+3*t*t)*b[1] + (t*t*t-t*t)*(b[0]-a[0])*d1);
  }
  const centerX = y => -.242 - (y - .445) * .104;
  const edgeSupport = y => THREE.MathUtils.smoothstep(y,.45,.60) * (1-THREE.MathUtils.smoothstep(y,1.015,1.09));
  const frontX = (y,u) => centerX(y) + .029 + .010*(1-u*u) + .046*Math.pow(Math.abs(u),3)*edgeSupport(y);
  const bodyPositions=[], bodyColors=[], bodyUVs=[], bodyIndices=[];
  const rows=72, columns=32, blackColor=new THREE.Color(0x181c1e), accentColor=new THREE.Color(0x394042);
  for (let side=0;side<2;side++) {
    for (let row=0;row<=rows;row++) {
      const y=.445+(.807*row/rows), w=halfWidth(y);
      for (let col=0;col<=columns;col++) {
        const u=col/columns*2-1;
        bodyPositions.push(side===0?frontX(y,u):centerX(y)-.027-.003*(1-u*u),y,u*w);
        bodyUVs.push(col/columns,row/rows);
        const sideBand=THREE.MathUtils.smoothstep(Math.abs(u),.70,.86);
        const lowerPatch=THREE.MathUtils.smoothstep(y,.59,.62)*(1-THREE.MathUtils.smoothstep(y,.73,.76));
        const shoulderPatch=THREE.MathUtils.smoothstep(y,.865,.895)*(1-THREE.MathUtils.smoothstep(y,.98,1.005));
        const color=blackColor.clone().lerp(accentColor,side===0?sideBand*Math.max(lowerPatch,shoulderPatch):0);
        bodyColors.push(color.r,color.g,color.b);
      }
    }
  }
  const stride=columns+1, sheet=(rows+1)*stride;
  for(let row=0;row<rows;row++)for(let col=0;col<columns;col++) {
    const a=row*stride+col,b=a+stride;
    bodyIndices.push(a,b,a+1,a+1,b,b+1);
    bodyIndices.push(sheet+a,sheet+a+1,sheet+b,sheet+a+1,sheet+b+1,sheet+b);
  }
  for(let row=0;row<rows;row++)for(const col of [0,columns]) {
    const a=row*stride+col,b=a+stride;
    if(col===0)bodyIndices.push(a,sheet+a,b,b,sheet+a,sheet+b);
    else bodyIndices.push(a,b,sheet+a,b,sheet+b,sheet+a);
  }
  for(let col=0;col<columns;col++)for(const row of [0,rows]) {
    const a=row*stride+col,b=a+1;
    if(row===0)bodyIndices.push(a,b,sheet+a,b,sheet+b,sheet+a);
    else bodyIndices.push(a,sheet+a,b,b,sheet+a,sheet+b);
  }
  const backGeometry=new THREE.BufferGeometry();
  backGeometry.setAttribute('position',new THREE.Float32BufferAttribute(bodyPositions,3));
  backGeometry.setAttribute('color',new THREE.Float32BufferAttribute(bodyColors,3));
  backGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(bodyUVs,2));
  backGeometry.setIndex(bodyIndices);backGeometry.computeVertexNormals();
  const upholstery=leather.clone();upholstery.color.set(0xffffff);upholstery.vertexColors=true;
  mesh('contoured tapered bucket back',backGeometry,upholstery);
  for(const sign of [-1,1]) {
    const edge=[],inner=[];
    for(let i=0;i<=36;i++) {
      const y=.46+i/36*.774,u=sign*.965;
      edge.push([frontX(y,u)+.001,y,u*halfWidth(y)]);
    }
    for(let i=0;i<=20;i++) {
      const y=.50+i/20*.55,u=sign*.61;
      inner.push([frontX(y,u)+.001,y,u*halfWidth(y)]);
    }
    seam('fine outer back piping',edge,.00125,thread);
    seam('inner upholstery seam',inner,.0008,darkThread);
  }

  // A shoulder-height pillow and a lower lumbar pillow, with restrained grey
  // side inserts. Both sit in front of the back, not inside its thin shell.
  cushion('padded head cushion',[frontX(.978,0)+.035,.978,0],[.063,.135,.300]);
  cushion('lumbar cushion',[frontX(.592,0)+.043,.592,0],[.082,.133,.317]);
  for(const z of [-.131,.131]) {
    const insert=cushion('lumbar charcoal side insert',[frontX(.592,0)+.047,.593,z],[.078,.126,.035],grey);
    insert.rotation.x=z>0?.045:-.045;
  }
  for(const sign of [-1,1]) {
    seam('head cushion sewn edge',[[frontX(.978,0)+.060,.926,sign*.126],[frontX(.978,0)+.068,.976,sign*.141],[frontX(.978,0)+.060,1.031,sign*.129]],.0009,thread);
  }

  // Clean, nearly flat seat with a waterfall front edge and slim raised wings.
  roundedBox('molded seat underside',[.019,.411,0],[.516,.040,.482],.012,shell);
  roundedBox('plain black padded seat',[.026,.447,0],[.518,.046,.479],.014,leather);
  const seatEdge=[];
  for(let i=0;i<64;i++) {
    const a=i/64*Math.PI*2;
    const power=v=>Math.sign(v)*Math.pow(Math.abs(v),.40);
    seatEdge.push([.026+.247*power(Math.cos(a)),.471,.224*power(Math.sin(a))]);
  }
  seam('seat perimeter stitching',seatEdge,.0010,thread,true);
  for(const sign of [-1,1]) {
    const positions=[],indices=[],steps=28,sides=16;
    for(let row=0;row<=steps;row++) {
      const t=row/steps,shape=Math.pow(Math.sin(Math.PI*t),.47);
      const x=-.225+.502*t,cy=.485+.043*Math.pow(1-t,2);
      for(let col=0;col<=sides;col++) {
        const a=col/sides*Math.PI*2;
        positions.push(x,cy+.031*shape*Math.cos(a),sign*(.231+.034*shape*Math.sin(a)));
      }
    }
    for(let row=0;row<steps;row++)for(let col=0;col<sides;col++) {
      const a=row*(sides+1)+col,b=a+sides+1;
      if(sign>0)indices.push(a,a+1,b,a+1,b+1,b);else indices.push(a,b,a+1,a+1,b,b+1);
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
    mesh('slim seat side bolster',geometry,leather);
    const hinge=cylinder('back recline hinge',[-.211,.429,sign*.250],.042,.023,shell);
    hinge.rotation.x=Math.PI/2;
    cylinder('recline hinge inset',[-.211,.429,sign*.264],.018,.0025,steel).rotation.x=Math.PI/2;
    roundedBox('adjustable arm upright',[.068,.561,sign*.291],[.035,.231,.036],.005,shell);
    roundedBox('arm height adjustment collar',[.068,.508,sign*.291],[.043,.061,.043],.006,steel);
    roundedBox('arm adjustment button',[.081,.594,sign*.314],[.013,.021,.0035],.0015,grey);
    roundedBox('soft armrest pad',[.073,.691,sign*.291],[.300,.037,.073],.012,leather);
    roundedBox('under-seat arm bracket',[-.010,.411,sign*.201],[.164,.021,.188],.004,steel);
  }

  roundedBox('tilt mechanism',[-.016,.380,0],[.218,.058,.188],.010,steel);
  cylinder('gas lift chrome piston',[0,.296,0],.021,.167,chrome);
  cylinder('gas lift outer column',[0,.207,0],.032,.182,shell);
  for(const y of [.157,.184,.215])cylinder('telescoping boot ring',[0,y,0],.036,.020,rubber);
  cylinder('five-star hub',[0,.132,0],.064,.067,steel,.047);
  rod('seat height lever',[.007,.383,-.145],[.121,.350,-.230],.005,steel);
  roundedBox('seat height lever grip',[.130,.350,-.230],[.064,.020,.026],.006,rubber);

  // Five swept, flattened spokes with small twin casters. Wheel bottoms sit at
  // 2 mm above the floor; the full chair stays under 70 cm across either axis.
  for(let leg=0;leg<5;leg++) {
    const assembly=new THREE.Group();assembly.name=`Chair / caster assembly ${leg+1}`;
    assembly.rotation.y=leg*Math.PI*2/5+.20;group.add(assembly);
    const shape=new THREE.Shape();
    shape.moveTo(.044,.147);shape.lineTo(.102,.141);shape.lineTo(.315,.086);
    shape.quadraticCurveTo(.326,.080,.318,.067);shape.lineTo(.287,.066);
    shape.lineTo(.091,.108);shape.lineTo(.044,.108);shape.closePath();
    const geo=new THREE.ExtrudeGeometry(shape,{depth:.027,bevelEnabled:true,bevelThickness:.003,bevelSize:.003,bevelSegments:3,curveSegments:5,steps:1});
    geo.translate(0,0,-.0135);
    mesh('swept five-star spoke',geo,steel,assembly);
    cylinder('caster swivel stem',[.303,.073,0],.009,.046,chrome,.009,assembly);
    roundedBox('caster fork',[.304,.051,0],[.045,.035,.057],.007,shell,assembly);
    for(const side of [-1,1]) {
      const wheel=cylinder('rubber caster wheel',[.305,.031,side*.023],.029,.018,rubber,.029,assembly);
      wheel.rotation.x=Math.PI/2;
      const hub=cylinder('caster wheel inset hub',[.305,.031,side*.0325],.012,.0017,shell,.012,assembly);
      hub.rotation.x=Math.PI/2;
    }
  }

  group.userData.display_name='Gaming chair';group.userData.description=description;
  model.add(group);group.updateWorldMatrix(true,true);
  const bounds=new THREE.Box3().setFromObject(group),size=bounds.getSize(new THREE.Vector3());
  let meshCount=0;group.traverse(object=>{if(object.isMesh)meshCount++;});
  group.userData.chairDimensions={width:size.z,depth:size.x,height:size.y,seatHeight:.47};
  group.userData.meshCount=meshCount;
  return group;
}
