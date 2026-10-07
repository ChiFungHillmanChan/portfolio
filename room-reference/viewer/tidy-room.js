// Keep the room's architecture and furniture, removing loose floor belongings.
export function tidyRoom(model) {
  const removed = [];
  model.traverse((object) => {
    if (!object.isMesh) return;
    const category = object.userData.layoutCategory;
    const name = object.name.toLowerCase().replace(/[\/_]+/g, ' ').replace(/\s+/g, ' ').trim();
    const doorWireHanger = /^door (lopsided pink wire coat hanger|pink hanger curved hook)/.test(name);
    if (category === 'laundry' || category === 'wardrobeAccessories' || category === 'chair' || category === 'radiator' || doorWireHanger) {
      object.visible = false;
      object.userData.layoutHidden = true;
      removed.push(object.name);
    }
  });
  model.userData.tidiedObjects = removed;
  return removed;
}
