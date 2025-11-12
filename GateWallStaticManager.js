const GateWallStaticManager = (() => {
  const STORAGE_KEY = "gatewall_static_data";
  let gateWalls = [];
  const init = () => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    gateWalls = saved ? JSON.parse(saved) : [];
  };
  const save = () => window.localStorage.setItem(STORAGE_KEY, JSON.stringify(gateWalls));
  const validate = (data) => {
    const required = ["id", "name", "latitude", "longitude"];
    for (let field of required) {
      if (!data[field] && data[field] !== 0) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
  };
  const create = (data) => {
    validate(data);
    if (gateWalls.find(g => g.id === data.id))
      throw new Error(`Gate wall with ID '${data.id}' already exists`);
    const gw = {
      id: data.id, name: data.name, type: data.type || "straight",
      country: data.country || "India", state: data.state || "",
      district: data.district || "", mandal: data.mandal || "",
      habitation: data.habitation || "",
      latitude: parseFloat(data.latitude), longitude: parseFloat(data.longitude),
      altitude: parseFloat(data.altitude || 0), connectedPipelines: data.connectedPipelines || [],
      installationDate: data.installationDate || new Date().toISOString(),
      firmwareVersion: data.firmwareVersion || "v1.0.0", controllerId: data.controllerId || "",
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    gateWalls.push(gw);
    save();
    return gw;
  };
  const getAll = () => gateWalls;
  const getById = (id) => gateWalls.find(g => g.id === id) || null;
  const update = (id, updates) => {
    const gw = getById(id);
    if (!gw) throw new Error(`Gate wall ID '${id}' not found`);
    const editable = ["name", "type", "state", "district", "mandal", "habitation", "latitude", "longitude", "altitude", "connectedPipelines", "firmwareVersion", "controllerId", "installationDate"];
    editable.forEach(key => {
      if (updates[key] !== undefined) gw[key] = updates[key];
    });
    gw.updatedAt = new Date().toISOString();
    save();
    return gw;
  };
  const remove = (id) => {
    const index = gateWalls.findIndex(g => g.id === id);
    if (index === -1) throw new Error(`Gate wall ID '${id}' not found`);
    const deleted = gateWalls.splice(index, 1)[0];
    save();
    return deleted;
  };
  const clearAll = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    gateWalls = [];
  };
  return { init, create, getAll, getById, update, remove, clearAll };
})();