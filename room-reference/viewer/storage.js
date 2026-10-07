import * as THREE from 'three';

// Coordinates are physical metres in the viewer: Y is up, -Z goes to the bed.
// This shelf is generated locally and does not request any external assets.
export function addStorage(model, { width, depth = 4 }) {
  const group = new THREE.Group();
  const ratio = Math.min(1, depth / 3.9);
  const bedLength = 1.2 * ratio;
  const shelfLength = .3 * ratio;
  group.name = 'Storage • 30 cm fabric drawers';
  group.position.set(width - .27, 0, -(depth - bedLength - shelfLength / 2));
  group.scale.z = ratio;
  group.userData.description = 'Narrow five-drawer fabric storage between the bed and desk';
  group.userData.storageWidth = shelfLength;
  group.userData.proceduralStorage = true;

  let seed = 29047;
  const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const context = canvas.getContext('2d');
  const pixels = context.createImageData(256, 256);
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const thread = ((x + y) % 4 < 2 ? 6 : -6) + (x % 3 === 0 ? 4 : 0);
      const value = 193 + thread + (random() - .5) * 23;
      const i = (y * 256 + x) * 4;
      pixels.data[i] = value; pixels.data[i + 1] = value;
      pixels.data[i + 2] = value; pixels.data[i + 3] = 255;
    }
  }
  context.putImageData(pixels, 0, 0);
  const clothMap = new THREE.CanvasTexture(canvas);
  clothMap.colorSpace = THREE.SRGBColorSpace;
  clothMap.wrapS = clothMap.wrapT = THREE.RepeatWrapping;
  clothMap.repeat.set(2.4, 2.4); clothMap.anisotropy = 4;
  const clothBump = clothMap.clone(); clothBump.colorSpace = THREE.NoColorSpace;
  clothBump.needsUpdate = true;
  const standard = (color, roughness = .7, metalness = 0, extra = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
  const fabric = standard(0x8c867b, .98, 0, { map: clothMap, bumpMap: clothBump, bumpScale: .00034 });
  const inside = standard(0x514e46, .98, 0, { map: clothMap, bumpMap: clothBump, bumpScale: .00028 });
  const edging = standard(0x34352f, .94, 0, { map: clothMap });
  const frame = standard(0x191c1a, .47, .48);
  const rubber = standard(0x171a18, .9);
  const silver = standard(0xb7b8af, .25, .85);
  const white = standard(0xe6e5dc, .32);
  const black = standard(0x161b1b, .53);
  const red = standard(0x9e1325, .59);
  const lidRed = standard(0xb1182b, .49);

  let activeItem = null;
  const place = (name, geometry, material, x, y, z, parent = activeItem || group) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name; mesh.position.set(x, y, z);
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.userData.storagePart = true;
    parent.add(mesh); return mesh;
  };
  const box = (name, x, y, z, sx, sy, sz, material) =>
    place(name, new THREE.BoxGeometry(sx, sy, sz), material, x, y, z);
  // Rounded extrusion gives small manufactured accessories soft edge highlights.
  const rounded = (name, x, y, z, sx, sy, sz, r, material) => {
    r = Math.min(r, sx / 3, sy / 3, sz / 3);
    const shape = new THREE.Shape();
    const a = sx / 2 - r, b = sy / 2 - r;
    shape.moveTo(-a, -b); shape.lineTo(a, -b); shape.lineTo(a, b);
    shape.lineTo(-a, b); shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: sz - 2 * r, steps: 1, bevelEnabled: true,
      bevelSize: r, bevelThickness: r, bevelSegments: 3, curveSegments: 4,
    });
    geo.translate(0, 0, -sz / 2 + r);
    return place(name, geo, material, x, y, z);
  };
  // These soft plastic cases need smooth elliptical corner fillets, unlike the
  // sharper cardboard-box bevels used elsewhere. Project a subdivided box onto
  // its inset core plus an ellipsoidal radius, with analytic smooth normals.
  const softCase = (name, x, y, z, sx, sy, sz, radii, material) => {
    const geometry = new THREE.BoxGeometry(sx, sy, sz, 24, 20, 24);
    const position = geometry.attributes.position, normal = geometry.attributes.normal;
    const half = [sx / 2, sy / 2, sz / 2];
    const radius = radii.map((r, i) => Math.min(r, half[i] - .0001));
    const core = half.map((v, i) => v - radius[i]);
    for (let i = 0; i < position.count; i++) {
      const p = [position.getX(i), position.getY(i), position.getZ(i)];
      const nearest = p.map((v, axis) => Math.max(-core[axis], Math.min(core[axis], v)));
      const direction = p.map((v, axis) => (v - nearest[axis]) / radius[axis]);
      const length = Math.hypot(...direction);
      const u = direction.map((v) => v / length);
      position.setXYZ(i, ...u.map((v, axis) => nearest[axis] + radius[axis] * v));
      const n = u.map((v, axis) => v / radius[axis]);
      const normalLength = Math.hypot(...n);
      normal.setXYZ(i, ...n.map((v) => v / normalLength));
    }
    position.needsUpdate = normal.needsUpdate = true;
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    return place(name, geometry, material, x, y, z);
  };
  const caseSeam = (name, center, size, radius, localY, span, thickness, material) => {
    const core = size.map((v, i) => v / 2 - radius[i]);
    const points = [];
    for (let i = 0; i <= 60; i++) {
      const localZ = (i / 60 - .5) * span;
      const qy = Math.sign(localY) * Math.max(Math.abs(localY) - core[1], 0) / radius[1];
      const qz = Math.sign(localZ) * Math.max(Math.abs(localZ) - core[2], 0) / radius[2];
      const qx = -Math.sqrt(Math.max(0, 1 - qy * qy - qz * qz));
      const normal = new THREE.Vector3(qx / radius[0], qy / radius[1], qz / radius[2]).normalize();
      points.push(new THREE.Vector3(center[0] - core[0] + radius[0] * qx,
        center[1] + localY, center[2] + localZ).addScaledVector(normal, thickness * .35));
    }
    return place(name, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 96, thickness, 6, false),
      material, 0, 0, 0);
  };
  const cylinder = (name, x, y, z, radius, height, material, segments = 24) =>
    place(name, new THREE.CylinderGeometry(radius, radius, height, segments), material, x, y, z);
  const ball = (name, x, y, z, sx, sy, sz, material) => {
    const mesh = place(name, new THREE.SphereGeometry(1, 20, 12), material, x, y, z);
    mesh.scale.set(sx, sy, sz); return mesh;
  };
  const rod = (name, a, b, radius, material) => {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const mesh = cylinder(name, 0, 0, 0, radius, start.distanceTo(end), material, 12);
    mesh.position.copy(start).add(end).multiplyScalar(.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize());
    return mesh;
  };
  const torus = (name, x, y, z, major, minor, material, faceFront = false) => {
    const mesh = place(name, new THREE.TorusGeometry(major, minor, 8, 32), material, x, y, z);
    if (faceFront) mesh.rotation.y = Math.PI / 2;
    else mesh.rotation.x = Math.PI / 2;
    return mesh;
  };

  // Slender powder-coated frame remains visible between the fabric bins.
  for (const x of [-.240, .230]) {
    for (const z of [-.139, .139]) {
      box('Storage / square steel upright', x, .519, z, .016, 1.006, .016, frame);
      rounded('Storage / plastic foot cap', x, .017, z, .021, .028, .021, .003, rubber);
    }
  }
  for (let level = 0; level < 6; level++) {
    const y = .041 + level * .185;
    for (const z of [-.136, .136])
      box('Storage / open side drawer runner', -.002, y, z, .466, .012, .012, frame);
  }
  for (const y of [.041, 1.007])
    box('Storage / rear cross rail', .230, y, 0, .014, .014, .285, frame);

  // A complete bin is one moving part: fabric, binding and eyelet stay together.
  for (let row = 0; row < 5; row++) {
    const drawer = new THREE.Group();
    drawer.name = `Storage / fabric drawer ${row + 1}`;
    drawer.userData.fabricDrawer = row + 1;
    group.add(drawer); activeItem = drawer;
    const y = .131 + row * .185;
    const open = 0;
    const x = -.005 - open;
    const frontX = -.239 - open;
    box(`Storage / drawer ${row + 1} fabric floor`, x, y - .078, 0, .452, .007, .261, inside);
    box(`Storage / drawer ${row + 1} rear wall`, x + .223, y, 0, .006, .158, .262, inside);
    for (const z of [-.129, .129])
      box(`Storage / drawer ${row + 1} cloth side`, x, y, z, .451, .158, .006, fabric);
    rounded(`Storage / drawer ${row + 1} soft front`, frontX, y, 0, .010, .160, .269, .003, fabric);
    for (const yy of [y - .078, y + .078])
      box('Storage / stitched horizontal binding', frontX - .0055, yy, 0, .002, .004, .266, edging);
    for (const z of [-.132, .132])
      box('Storage / stitched vertical binding', frontX - .0055, y, z, .002, .153, .004, edging);
    const hole = cylinder('Storage / dark inset pull opening', frontX - .008, y + .010, 0, .0122, .003, rubber);
    hole.rotation.z = Math.PI / 2;
    torus('Storage / round brushed silver eyelet', frontX - .010, y + .010, 0, .0146, .0022, silver, true);
    if (open) {
      box('Storage / folded dark item in open drawer', x + .03, y - .035, -.050, .15, .068, .089, black);
      rounded('Storage / pale item in open drawer', x - .060, y - .027, .054, .112, .083, .064, .006, white);
    }
  }
  activeItem = null;

  // Fabric-covered lid doubles as a tray, including its raised sewn rim.
  rounded('Storage / padded tray base', -.004, 1.010, 0, .503, .019, .296, .005, fabric);
  for (const x of [-.253, .245])
    box('Storage / tray short fabric lip', x, 1.031, 0, .009, .034, .296, fabric);
  for (const z of [-.145, .145])
    box('Storage / tray long fabric lip', -.004, 1.031, z, .493, .034, .009, fabric);
  for (const z of [-.146, .146])
    box('Storage / tray sewn upper edge', -.004, 1.049, z, .495, .004, .006, edging);

  // The latest close photo replaces the earlier jar, yellow toy, remote and watches.
  const item = (name, description) => {
    const o = new THREE.Group(); o.name = 'Storage / ' + name;
    o.userData.inspectionTarget = true; o.userData.display_name = name;
    o.userData.description = description; o.userData.storagePart = true;
    group.add(o); activeItem = o; return o;
  };
  const texture = (w, h, draw) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4; return t;
  };
  const label = (name, x, y, z, across, along, map, color = 0xffffff) => {
    const o = place(name, new THREE.PlaneGeometry(across, along),
      standard(color, .65, 0, { map, transparent: true, alphaTest: .02, depthWrite: false }), x, y, z);
    // The label's top points toward the wall; text reads from the shelf front.
    o.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(
      new THREE.Vector3(0,0,1), new THREE.Vector3(1,0,0), new THREE.Vector3(0,1,0)));
    return o;
  };
  const cylinderX = (name, x, y, z, radius, length, m, segments = 28) => {
    const o = cylinder(name, x, y, z, radius, length, m, segments);
    o.rotation.z = Math.PI / 2; return o;
  };
  const tube = (name, points, radius, m, parent = activeItem) => {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    return place(name, new THREE.TubeGeometry(curve, 40, radius, 6, false), m, 0,0,0,parent);
  };
  const hugo = texture(768, 256, (c,w,h) => {
    c.clearRect(0,0,w,h); c.fillStyle='#161616';c.font='900 155px Arial, sans-serif';
    c.textAlign='center';c.textBaseline='middle';c.fillText('HUGO',w/2,h*.52);
  });
  item('Stacked red HUGO eyewear boxes', 'Two red eyewear cases stacked at the back-right, with the black HUGO lid lettering seen in the latest photograph.');
  for (let i=0;i<2;i++) {
    const x=.163-i*.002, y=1.043+i*.048, z=.068-i*.002;
    rounded('Storage / red HUGO case base',x,y,z,.086,.041,.149,.003,red);
    rounded('Storage / red HUGO hinged lid',x,y+.021,z,.090,.008,.153,.0018,lidRed);
    box('Storage / case closing seam',x-.044,y+.013,z,.001,.0016,.143,standard(0x610c19,.7));
    if(i===1) label('Storage / black HUGO lettering',x,y+.0252,z,.134,.054,hugo);
  }

  item('Frosted grey glasses case', 'The long translucent grey glasses case lies lengthwise on the right side of the shelf.');
  const frosted = new THREE.MeshPhysicalMaterial({color:0xbcbdb2,roughness:.65,metalness:0,
    transmission:.12,thickness:.005,transparent:true,opacity:.90,clearcoat:.2,clearcoatRoughness:.5});
  softCase('Storage / glasses case lower shell',.018,1.036,.107,.173,.030,.059,[.024,.012,.023],standard(0xa5a79e,.55));
  softCase('Storage / frosted case rounded lid',.018,1.049,.107,.171,.025,.058,[.024,.0105,.023],frosted);
  caseSeam('Storage / fine glasses case opening seam',[.018,1.036,.107],[.173,.030,.059],
    [.024,.012,.023],.006,.052,.00021,standard(0x8c8f85,.7));
  const glassesLogo=texture(256,64,(c,w,h)=>{c.clearRect(0,0,w,h);c.fillStyle='rgba(230,232,222,.62)';c.font='19px Arial';c.textAlign='center';c.fillText('EYEWEAR',w/2,40);});
  label('Storage / subtle case lid mark',.053,1.062,.107,.028,.070,glassesLogo);

  item('White AirPods Pro case', 'A white rounded AirPods Pro charging case sits by itself at the front-right edge.');
  softCase('Storage / AirPods Pro charging case',-.160,1.039,.085,.045,.033,.065,[.016,.013,.023],white);
  caseSeam('Storage / AirPods lid seam',[-.160,1.039,.085],[.045,.033,.065],
    [.016,.013,.023],.004,.060,.00024,standard(0xbfc2b6,.6));
  box('Storage / AirPods metal hinge',-.1372,1.041,.085,.001,.004,.025,silver);
  ball('Storage / AirPods tiny front status LED',-.1833,1.036,.085,.00045,.0006,.0006,standard(0x729575,.4));

  item('White cube packaging', 'The small white cube box behind the watch is recreated from the shelf photograph.');
  rounded('Storage / small white cube package',.153,1.048,-.096,.052,.052,.049,.0014,standard(0xe8e4d9,.85));
  const cartonPrint=texture(256,256,(c,w,h)=>{c.fillStyle='#eee9dc';c.fillRect(0,0,w,h);c.fillStyle='#b69964';c.textAlign='center';c.font='20px serif';c.fillText('CARE',w/2,85);c.font='16px serif';c.fillText('COLLECTION',w/2,113);c.beginPath();c.arc(128,173,24,0,Math.PI*2);c.strokeStyle='#b69964';c.lineWidth=5;c.stroke();c.font='bold 25px serif';c.fillText('H',128,182);});
  label('Storage / gold cube-package print',.153,1.0742,-.096,.047,.049,cartonPrint);

  const watchItem=item('Black G-Shock watch', 'A chunky black G-Shock rests on its lower lugs with a thick, ribbed resin strap curling naturally behind it. The protected round dial has three subdials beneath a clear crystal.');
  const resin=standard(0x202320,.66), bezelResin=standard(0x151815,.46), bandResin=standard(0x222522,.82);
  const gunmetal=standard(0x4c534d,.33,.66);
  const watchFrame=new THREE.Group();
  watchFrame.position.set(.058,1.056,-.077);watchFrame.rotation.z=.95;
  watchItem.add(watchFrame);activeItem=watchFrame;
  // Canonical face normal is +Y. Its 12 o'clock axis is +X, so the engraved
  // lettering points upward when the complete watch is tilted toward the room.
  cylinder('Storage / G-Shock solid resin housing',0,-.001,0,.0265,.018,resin,64);
  cylinder('Storage / G-Shock recessed case back',0,-.0104,0,.023,.0014,gunmetal,48);
  cylinder('Storage / G-Shock stepped bezel',0,.0092,0,.0256,.0048,bezelResin,64);
  torus('Storage / G-Shock rounded bezel shoulder',0,.0100,0,.0252,.00145,resin);
  torus('Storage / G-Shock fine inner chapter ring',0,.0125,0,.0202,.00040,gunmetal);
  // Four broad lugs physically join the case to the straps; the lower pair
  // touches the fabric tray, supporting the tilted case instead of floating.
  for(const end of [-1,1]){
    for(const z of [-.0100,.0100]){
      rounded('Storage / G-Shock integrated resin lug',end*.0305,-.003,z,.014,.012,.007,.0015,resin);
    }
    rod('Storage / G-Shock recessed spring bar',[end*.0325,-.004,-.012],[end*.0325,-.004,.012],.0014,gunmetal);
  }
  for(const side of [-1,1]){
    for(const x of [-.011,.011]){
      rounded('Storage / G-Shock button guard',x,-.001,side*.0259,.011,.013,.005,.0012,resin);
      const button=cylinder('Storage / G-Shock metal side pusher',x,-.001,side*.0293,.0031,.0042,gunmetal,20);
      button.rotation.x=Math.PI/2;
    }
  }
  for(const a of [Math.PI/4,Math.PI*3/4,Math.PI*5/4,Math.PI*7/4]){
    cylinder('Storage / G-Shock bezel fixing screw',Math.cos(a)*.0239,.0121,Math.sin(a)*.0239,.00105,.00065,gunmetal,12);
  }
  const dialMap=texture(1024,1024,(c,w,h)=>{
    const m=w/2;c.clearRect(0,0,w,h);
    c.fillStyle='#191d19';c.beginPath();c.arc(m,m,509,0,Math.PI*2);c.fill();
    c.strokeStyle='#343b32';c.lineWidth=6;c.beginPath();c.arc(m,m,491,0,Math.PI*2);c.stroke();
    c.fillStyle='#101512';c.beginPath();c.arc(m,m,411,0,Math.PI*2);c.fill();
    for(let r=120;r<408;r+=12){c.strokeStyle=r%24?'#181e19':'#1c231d';c.lineWidth=1;c.beginPath();c.arc(m,m,r,0,Math.PI*2);c.stroke();}
    for(let i=0;i<60;i++){
      const a=i*Math.PI/30-Math.PI/2,major=i%5===0;
      c.strokeStyle=major?'#a5ad9a':'#606a5c';c.lineWidth=major?10:3;
      c.beginPath();c.moveTo(m+Math.cos(a)*(major?356:378),m+Math.sin(a)*(major?356:378));
      c.lineTo(m+Math.cos(a)*399,m+Math.sin(a)*399);c.stroke();
      if(major){c.strokeStyle='#d4d6c3';c.lineWidth=5;c.beginPath();c.moveTo(m+Math.cos(a)*360,m+Math.sin(a)*360);c.lineTo(m+Math.cos(a)*389,m+Math.sin(a)*389);c.stroke();}
    }
    for(const [x,y,r] of [[356,521,107],[639,444,103],[555,690,91]]){
      c.fillStyle='#151b17';c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();
      c.strokeStyle='#63715e';c.lineWidth=3;c.stroke();
      c.strokeStyle='#87917c';c.lineWidth=2;
      for(let j=0;j<12;j++){const a=j*Math.PI/6;c.beginPath();c.moveTo(x+Math.cos(a)*(r-12),y+Math.sin(a)*(r-12));c.lineTo(x+Math.cos(a)*(r-3),y+Math.sin(a)*(r-3));c.stroke();}
      c.fillStyle='#98a48b';c.font='15px Arial';c.textAlign='center';c.fillText('60',x,y-r+25);c.fillText('30',x,y+r-13);
      c.strokeStyle='#c2c8b3';c.lineWidth=4;c.beginPath();c.moveTo(x,y);c.lineTo(x+r*.44,y-r*.65);c.stroke();
      c.fillStyle='#b6c0ab';c.beginPath();c.arc(x,y,5,0,Math.PI*2);c.fill();
    }
    c.textAlign='center';c.fillStyle='#bcc4ae';c.font='bold 47px Arial';c.fillText('G-SHOCK',m,84);
    c.font='bold 29px Arial';c.fillText('PROTECTION',m,977);
    c.fillStyle='#aab69b';c.font='bold 22px Arial';c.fillText('CASIO',m,270);
    c.font='13px Arial';c.fillText('TOUGH SOLAR',m,294);
    c.fillStyle='#080e0b';c.fillRect(778,493,63,42);c.strokeStyle='#5b6856';c.lineWidth=2;c.strokeRect(778,493,63,42);
    c.fillStyle='#c0c9b2';c.font='24px Arial';c.fillText('18',809,523);
    const hand=(angle,length,width,color)=>{
      c.save();c.translate(m,m);c.rotate(angle);c.fillStyle=color;c.beginPath();c.moveTo(-width*.45,32);c.lineTo(-width*.55,-length*.73);c.lineTo(0,-length);c.lineTo(width*.55,-length*.73);c.lineTo(width*.45,32);c.closePath();c.fill();
      c.fillStyle='#e1e4d2';c.beginPath();c.moveTo(-width*.14,-35);c.lineTo(0,-length*.84);c.lineTo(width*.16,-35);c.closePath();c.fill();c.restore();
    };
    hand(-.52,243,27,'#899883');hand(.76,320,18,'#aab5a0');
    c.save();c.translate(m,m);c.rotate(2.48);c.strokeStyle='#b0b8a2';c.lineWidth=3;c.beginPath();c.moveTo(0,70);c.lineTo(0,-333);c.stroke();c.restore();
    c.fillStyle='#505f4b';c.beginPath();c.arc(m,m,17,0,Math.PI*2);c.fill();c.fillStyle='#bcc8ac';c.beginPath();c.arc(m,m,7,0,Math.PI*2);c.fill();
  });
  const faceBasis=new THREE.Matrix4().makeBasis(new THREE.Vector3(0,0,1),new THREE.Vector3(1,0,0),new THREE.Vector3(0,1,0));
  const dialFace=place('Storage / G-Shock detailed upright multi-dial face',new THREE.CircleGeometry(.0247,80),
    standard(0xffffff,.48,.04,{map:dialMap}),0,.01205,0);
  dialFace.quaternion.setFromRotationMatrix(faceBasis);
  const crystal=place('Storage / G-Shock clear inset crystal',new THREE.CircleGeometry(.01975,80),
    new THREE.MeshPhysicalMaterial({color:0xd7e0d7,transparent:true,opacity:.085,roughness:.08,metalness:0,clearcoat:1,clearcoatRoughness:.06,depthWrite:false}),0,.01265,0);
  crystal.quaternion.setFromRotationMatrix(faceBasis);
  activeItem=watchItem;

  // Each open band is a closed, thick rounded-rectangle sweep, including its
  // edge walls and capped end. Both descend onto the tray with no raised spikes.
  const casePoint=(x,y,z)=>new THREE.Vector3(x,y,z).applyEuler(watchFrame.rotation).add(watchFrame.position).toArray();
  const strapFrames=[];
  const solidBand=(name,points,width=.023,thickness=.0032)=>{
    const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),steps=56,section=16;
    const vertices=[],indices=[],uvs=[],frames=[];
    for(let i=0;i<=steps;i++){
      const t=i/steps,p=path.getPoint(t),tangent=path.getTangent(t).normalize();
      const across=new THREE.Vector3(-tangent.z,0,tangent.x).normalize();
      if(across.z<0)across.negate();
      const side=new THREE.Vector3(0,0,1).lerp(across,THREE.MathUtils.smoothstep(t,0,.22)).normalize();
      const up=new THREE.Vector3().crossVectors(side,tangent).normalize();
      const halfWidth=width*.5*(1-.17*t),halfHeight=thickness*.5,round=.00060;
      frames.push({p,side,up,tangent,halfWidth,halfHeight});
      for(let corner=0;corner<4;corner++){
        const angle0=corner*Math.PI/2,signX=corner===0||corner===3?1:-1,signY=corner<2?1:-1;
        for(let k=0;k<4;k++){
          const a=angle0+k*Math.PI/6,dx=signX*(halfWidth-round)+Math.cos(a)*round,dy=signY*(halfHeight-round)+Math.sin(a)*round;
          const v=p.clone().addScaledVector(side,dx).addScaledVector(up,dy);vertices.push(v.x,v.y,v.z);uvs.push(corner/4+k/12,t);
        }
      }
      if(i<steps){for(let j=0;j<section;j++){const a=i*section+j,b=i*section+(j+1)%section,c=a+section,d=b+section;indices.push(a,c,b,b,c,d);}}
    }
    // End faces are proper solids, not single-sided ribbons.
    for(const end of [0,steps]){const start=end*section;for(let j=1;j<section-1;j++){if(end===0)indices.push(start,start+j,start+j+1);else indices.push(start,start+j+1,start+j);}}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeVertexNormals();
    place(name,geo,bandResin,0,0,0);strapFrames.push(frames);return frames;
  };
  const shortFrames=solidBand('Storage / G-Shock solid curved buckle strap',[
    casePoint(-.033,-.004,0),[.049,1.024,-.101],[.077,1.0220,-.121],[.095,1.0220,-.125],[.109,1.0230,-.121],
  ],.024,.0034);
  const longFrames=solidBand('Storage / G-Shock solid curved adjustment strap',[
    casePoint(.033,-.004,0),[.089,1.061,-.056],[.104,1.037,-.043],[.132,1.0225,-.043],[.164,1.0225,-.043],
  ],.023,.0033);
  const framedBox=(name,f,across,height,along,m,offset=0)=>{
    const p=f.p.clone().addScaledVector(f.up,f.halfHeight+offset);
    const object=box(name,p.x,p.y,p.z,across,height,along,m);
    object.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(f.side,f.up,f.tangent.clone().negate()));return object;
  };
  for(const frames of strapFrames){
    for(let i=5;i<frames.length-5;i+=4){
      const f=frames[i];framedBox('Storage / G-Shock molded resin strap rib',f,f.halfWidth*1.87,.00075,.0016,resin,.00025);
    }
  }
  for(let i=30;i<54;i+=5){
    const f=longFrames[i];framedBox('Storage / G-Shock recessed adjustment hole',f,.0045,.00015,.0022,standard(0x080b08,.95),.0002);
  }
  const buckle=shortFrames[shortFrames.length-1],buckleCenter=buckle.p.clone().addScaledVector(buckle.tangent,.005).addScaledVector(buckle.up,.0019);
  const bp=(across,along)=>buckleCenter.clone().addScaledVector(buckle.side,across).addScaledVector(buckle.tangent,along).toArray();
  for(const across of [-.011,.011])rod('Storage / G-Shock dark metal buckle frame',bp(across,-.007),bp(across,.007),.0012,gunmetal);
  for(const along of [-.007,.007])rod('Storage / G-Shock dark metal buckle crossbar',bp(-.011,along),bp(.011,along),.0012,gunmetal);
  rod('Storage / G-Shock buckle tongue',bp(0,-.007),bp(0,.006),.00065,gunmetal);
  const keeper=shortFrames[39];framedBox('Storage / G-Shock resin strap keeper',keeper,keeper.halfWidth*2+.002,.0020,.006,bezelResin,.0010);

  item('Black hair tie', 'The black elastic hair tie lies flat between the watch and the small lip-care items.');
  const elastic=torus('Storage / black fabric hair tie',.013,1.025,-.022,.019,.0018,standard(0x151714,.95));elastic.scale.set(1.12,1,1);
  torus('Storage / small loop beside hair tie',-.015,1.025,-.039,.007,.0014,black);

  item('Peach lip-care tube', 'A peach cylindrical lip-care tube lies beside the blue and white balm.');
  const peach=standard(0xe4a26a,.42);
  cylinderX('Storage / peach cylindrical lip-care body',.012,1.029,-.001,.0078,.073,peach);
  torus('Storage / peach tube silver join',.010,1.029,-.001,.0077,.0005,silver,true);
  cylinderX('Storage / peach tube end label',-.025,1.029,-.001,.0056,.0005,standard(0x514f48,.66));
  item('Blue and white lip balm', 'The small blue lip-balm tube has white caps at both ends.');
  const navy=standard(0x242255,.44);
  cylinderX('Storage / blue balm tube',.035,1.028,.019,.0060,.041,navy);
  for(const x of [.010,.060])cylinderX('Storage / white lip-balm cap',x,1.028,.019,.0063,.011,white);
  const balmText=texture(256,64,(c,w,h)=>{c.clearRect(0,0,w,h);c.fillStyle='#ebeadd';c.font='bold 23px Arial';c.textAlign='center';c.fillText('LIP BALM',w/2,39);});
  label('Storage / lip balm small white lettering',.035,1.0342,.019,.009,.033,balmText);

  item('Black pen', 'A black pen with a small blue clip lies lengthwise in the middle-right row.');
  cylinderX('Storage / black pen barrel',-.010,1.027,.039,.0041,.090,black);
  cylinderX('Storage / black pen cap',.037,1.027,.039,.0047,.027,black);
  rod('Storage / pen blue clip',[-.040,1.032,.039],[.018,1.032,.039],.0009,navy);
  const nib=place('Storage / black pen tip',new THREE.ConeGeometry(.0023,.010,12),black,-.059,1.027,.039);nib.rotation.z=Math.PI/2;
  item('Silver nail clipper', 'A small silver nail clipper lies alongside the pen, with its raised lever and hinge visible.');
  rounded('Storage / nail clipper base',-.022,1.025,.061,.060,.0045,.012,.0013,silver);
  const lever=rounded('Storage / nail clipper upper lever',-.023,1.029,.061,.054,.0020,.010,.0006,silver);lever.rotation.z=-.027;
  rod('Storage / nail clipper hinge pin',[-.046,1.030,.056],[-.046,1.030,.066],.0015,silver);
  box('Storage / clipper cutting jaw',-.051,1.026,.061,.003,.006,.013,silver);

  const bear=item('Teddy — HUGS FOR YOU', 'The small grey-brown teddy lies at the front-left in its blue HUGS FOR YOU shirt, beside its bracelet and clear jersey keychain.');
  const fur=standard(0xa69987,.98,0,{bumpMap:clothBump,bumpScale:.0011});
  const muzzle=standard(0xd9cdb5,1);
  const blueShirt=standard(0x479bb4,.98,0,{map:clothMap,bumpMap:clothBump,bumpScale:.0003});
  const parts=[[-.066,1.054,-.080,.034,.026,.036,155],[-.044,1.056,-.111,.012,.011,.014,22],[-.044,1.056,-.049,.012,.011,.014,22],
    [-.182,1.040,-.099,.033,.018,.018,48],[-.182,1.040,-.061,.033,.018,.018,48],[-.218,1.041,-.100,.020,.018,.019,36],[-.218,1.041,-.060,.020,.018,.019,36],
    [-.132,1.042,-.130,.024,.017,.017,34],[-.132,1.042,-.030,.024,.017,.017,34]];
  for(const [x,y,z,sx,sy,sz] of parts)ball('Storage / teddy soft fur shape',x,y,z,sx,sy,sz,fur);
  ball('Storage / teddy blue shirt body',-.131,1.045,-.080,.044,.025,.035,blueShirt);
  for(const z of [-.113,-.047])ball('Storage / teddy blue short sleeve',-.118,1.045,z,.023,.021,.022,blueShirt);
  ball('Storage / teddy cream muzzle',-.078,1.078,-.080,.017,.0055,.021,muzzle);
  for(const z of [-.096,-.064])ball('Storage / teddy black eye',-.055,1.078,z,.0028,.0019,.0025,black);
  ball('Storage / teddy stitched nose',-.078,1.084,-.080,.0035,.0015,.003,standard(0x47392c,.96));
  tube('Storage / teddy embroidered mouth',[[-.081,1.084,-.080],[-.087,1.083,-.080],[-.091,1.082,-.087]],.00065,standard(0x534638,.95));
  tube('Storage / teddy smile second side',[[-.087,1.083,-.080],[-.091,1.082,-.073]],.00065,standard(0x534638,.95));
  const furCount=parts.reduce((sum,p)=>sum+p[6],0),tufts=new THREE.InstancedMesh(new THREE.SphereGeometry(1,6,4),fur,furCount);
  tufts.name='Storage / teddy curly plush pile';tufts.castShadow=true;tufts.receiveShadow=true;
  const tuftMatrix=new THREE.Matrix4(),tuftQuaternion=new THREE.Quaternion();let tuft=0;
  for(const [x,y,z,sx,sy,sz,count] of parts){for(let i=0;i<count;i++){const u=random()*2-1,a=random()*Math.PI*2,r=Math.sqrt(1-u*u);const p=new THREE.Vector3(x+sx*r*Math.cos(a),y+sy*u,z+sz*r*Math.sin(a));const size=.0018+random()*.0010;
    tuftMatrix.compose(p,tuftQuaternion,new THREE.Vector3(size,size*.8,size));tufts.setMatrixAt(tuft,tuftMatrix);tufts.setColorAt(tuft,new THREE.Color().setRGB(.84+random()*.14,.81+random()*.14,.76+random()*.15));tuft++;}}
  bear.add(tufts);
  const shirtPrint=texture(512,512,(c,w,h)=>{c.clearRect(0,0,w,h);c.fillStyle='#17272b';c.textAlign='center';c.font='900 126px Arial';c.fillText('HUGS',w/2,206);c.font='900 87px Arial';c.fillText('FOR YOU',w/2,313);});
  label('Storage / HUGS FOR YOU shirt print',-.129,1.0707,-.080,.055,.055,shirtPrint);

  item('Bead bracelet', 'A small bracelet with blue, cream, amber and silvery beads is tucked just behind the teddy.');
  const beadColors=[0x63879a,0xc7bd9b,0xceac5b,0xd4d9d2,0x537887];
  for(let i=0;i<28;i++){const a=i/28*Math.PI*2;
    ball('Storage / bracelet bead',-.012+Math.cos(a)*.028,1.026+Math.sin(a*3)*.001,-.088+Math.sin(a)*.041,.0032,.0032,.0032,standard(beadColors[i%5],.34,i%5===3?.55:0));}
  for(const [x,z] of [[-.017,-.127],[.002,-.125]]){for(let j=0;j<5;j++){const a=j*Math.PI*2/5;ball('Storage / bracelet tiny flower petal',x+Math.cos(a)*.0034,1.030,z+Math.sin(a)*.0034,.0022,.0013,.0022,white);}ball('Storage / bracelet flower center',x,1.031,z,.0016,.0011,.0016,standard(0xd8a324,.6));}

  item('Clear HILLMAN 79 jersey keychain', 'A clear acrylic jersey keychain carries the white HILLMAN 79 lettering beside the teddy.');
  const jersey=new THREE.Shape();jersey.moveTo(-.012,.031);jersey.lineTo(-.023,.025);jersey.lineTo(-.031,.010);jersey.lineTo(-.021,.004);jersey.lineTo(-.017,.011);jersey.lineTo(-.017,-.026);jersey.lineTo(.017,-.026);jersey.lineTo(.017,.011);jersey.lineTo(.021,.004);jersey.lineTo(.031,.010);jersey.lineTo(.023,.025);jersey.lineTo(.012,.031);jersey.quadraticCurveTo(0,.022,-.012,.031);
  const acrylic=new THREE.MeshPhysicalMaterial({color:0xe0d7d4,roughness:.21,metalness:0,transparent:true,opacity:.45,transmission:.35,thickness:.002,depthWrite:false});
  const keyGeometry=new THREE.ExtrudeGeometry(jersey,{depth:.002,bevelEnabled:true,bevelSize:.00055,bevelThickness:.00055,bevelSegments:2,curveSegments:12});
  const key=place('Storage / clear acrylic jersey outline',keyGeometry,acrylic,-.136,1.022,.002);
  key.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0,0,1),new THREE.Vector3(1,0,0),new THREE.Vector3(0,1,0)));
  const jerseyText=texture(384,512,(c,w,h)=>{c.clearRect(0,0,w,h);c.fillStyle='#f6eee0';c.textAlign='center';c.font='bold 50px Arial';c.fillText('HILLMAN',w/2,137);c.font='bold 206px Arial';c.fillText('79',w/2,363);});
  label('Storage / HILLMAN 79 jersey print',-.136,1.0248,.002,.029,.042,jerseyText);
  torus('Storage / keychain silver split ring',-.096,1.024,-.011,.010,.0009,silver);
  torus('Storage / keychain connector ring',-.102,1.024,-.004,.0037,.0007,silver);
  activeItem=null;

  model.add(group);
  return group;
}

// Existing baked storage is replaced by this narrower photo-matched group.
// Match prefixes because Blender suffixes repeated names with .001, .002, etc.
export const legacyStoragePrefixes = ['Drawer cabinet /', 'Drawer /', 'Cabinet /'];
