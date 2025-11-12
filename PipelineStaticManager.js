const PipelineStaticManager = (() => {
  const STORAGE_KEY = "pipeline_static_data";
  let pipelines = [];
  const init = () => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    pipelines = saved ? JSON.parse(saved) : [];
  };
  const save = () => window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pipelines));
  const validate = (data) => {
    if (!data.id || !data.name) throw new Error("Missing required id or name");
    if (!Array.isArray(data.points) || data.points.length < 2)
      throw new Error("'points' must be an array with at least 2 coordinate pairs");
  };
  const create = (data) => {
    validate(data);
    if (pipelines.find(p => p.id === data.id))
      throw new Error(`Pipeline with ID '${data.id}' already exists`);
    const pipeline = {
      id: data.id, name: data.name,
      points: data.points.map(pt => [parseFloat(pt[0]), parseFloat(pt[1])]),
      connectedGateWalls: data.connectedGateWalls || [],
      connectedDevices: data.connectedDevices || [],
      material: data.material || "PVC",
      diameter: parseFloat(data.diameter || 100),
      length: parseFloat(data.length || 0),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    pipelines.push(pipeline);
    save();
    return pipeline;
  };
  const getAll = () => pipelines;
  const getById = (id) => pipelines.find(p => p.id === id) || null;
  const update = (id, updates) => {
    const pipeline = getById(id);
    if (!pipeline) throw new Error(`Pipeline ID '${id}' not found`);
    const editable = ["name", "points", "connectedGateWalls", "connectedDevices", "material", "diameter", "length"];
    editable.forEach(key => {
      if (updates[key] !== undefined) {
        if (key === "points") {
          if (!Array.isArray(updates.points) || updates.points.length < 2)
            throw new Error("'points' must have at least 2 coordinates");
          pipeline.points = updates.points.map(pt => [parseFloat(pt[0]), parseFloat(pt[1])]);
        } else {
          pipeline[key] = updates[key];
        }
      }
    });
    pipeline.updatedAt = new Date().toISOString();
    save();
    return pipeline;
  };
  const remove = (id) => {
    const index = pipelines.findIndex(p => p.id === id);
    if (index === -1) throw new Error(`Pipeline ID '${id}' not found`);
    const deleted = pipelines.splice(index, 1)[0];
    save();
    return deleted;
  };
  const clearAll = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    pipelines = [];
  };
  return { init, create, getAll, getById, update, remove, clearAll };
})();