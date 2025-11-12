const TankStaticManager = (() => {
  const STORAGE_KEY = "ohsr_static_data";
  let tanks = [];
  const init = () => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    tanks = saved ? JSON.parse(saved) : [];
  };
  const save = () => window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tanks));
  const create = (data) => {
    const required = ["id", "name", "latitude", "longitude"];
    for (let key of required) {
      if (!data[key]) throw new Error(`Missing required field: ${key}`);
    }
    if (tanks.find(t => t.id === data.id)) {
      throw new Error(`Tank with ID '${data.id}' already exists`);
    }
    const newTank = {
      id: data.id, name: data.name, type: data.type || "ohsr",
      capacity: data.capacity || 1000, country: data.country || "India",
      state: data.state || "", district: data.district || "",
      mandal: data.mandal || "", habitation: data.habitation || "",
      latitude: parseFloat(data.latitude), longitude: parseFloat(data.longitude),
      altitude: data.altitude || 0, connectedPipelines: data.connectedPipelines || [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    tanks.push(newTank);
    save();
    return newTank;
  };
  const getAll = () => tanks;
  const getById = (id) => tanks.find(t => t.id === id) || null;
  const update = (id, updates) => {
    const tank = getById(id);
    if (!tank) throw new Error(`Tank ID '${id}' not found`);
    const editable = ["name", "capacity", "country", "state", "district", "mandal", "habitation", "latitude", "longitude", "altitude", "connectedPipelines"];
    editable.forEach(f => {
      if (updates[f] !== undefined) tank[f] = updates[f];
    });
    tank.updatedAt = new Date().toISOString();
    save();
    return tank;
  };
  const remove = (id) => {
    const index = tanks.findIndex(t => t.id === id);
    if (index === -1) throw new Error(`Tank ID '${id}' not found`);
    const deleted = tanks.splice(index, 1)[0];
    save();
    return deleted;
  };
  const clearAll = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    tanks = [];
  };
  return { init, create, getAll, getById, update, remove, clearAll };
})();