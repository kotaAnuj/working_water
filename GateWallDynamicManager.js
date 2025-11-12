const GateWallDynamicManager = (() => {
  const STORAGE_KEY = "gatewall_dynamic_data";
  let gateWallData = {};
  let intervalHandle = null;
  const init = () => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    gateWallData = saved ? JSON.parse(saved) : {};
  };
  const save = () => window.localStorage.setItem(STORAGE_KEY, JSON.stringify(gateWallData));
  const register = (gateWallId) => {
    if (!gateWallData[gateWallId]) {
      gateWallData[gateWallId] = { current: {}, history: [] };
      save();
    }
  };
  const getLiveData = async (id, simulate = true) => {
    const dirs = ["left", "right", "straight", "none"];
    return {
      id, timestamp: new Date().toISOString(),
      flowDirection: dirs[Math.floor(Math.random() * dirs.length)],
      valveState: Math.random() > 0.5 ? "open" : "closed",
      pressure: +(10 + Math.random() * 40).toFixed(1),
      flowRate: +(Math.random() * 150).toFixed(1),
      batteryLevel: +(50 + Math.random() * 50).toFixed(0),
      signalStrength: +(50 + Math.random() * 50).toFixed(0),
      temperature: +(25 + Math.random() * 5).toFixed(1),
      mode: Math.random() > 0.5 ? "auto" : "manual",
      status: Math.random() > 0.1 ? "active" : "fault",
      lastCommand: Math.random() > 0.5 ? "Open" : "Close"
    };
  };
  const update = async (id, liveData = null) => {
    if (!gateWallData[id]) register(id);
    const data = liveData || await getLiveData(id, true);
    gateWallData[id].current = data;
    gateWallData[id].history.push(data);
    if (gateWallData[id].history.length > 200)
      gateWallData[id].history.splice(0, gateWallData[id].history.length - 200);
    save();
  };
  const getCurrent = (id) => gateWallData[id]?.current || null;
  const getHistory = (id) => gateWallData[id]?.history || [];
  const startAutoUpdate = (intervalMs = 300000) => {
    if (intervalHandle) clearInterval(intervalHandle);
    intervalHandle = setInterval(async () => {
      const list = GateWallStaticManager.getAll();
      for (const g of list) {
        await update(g.id);
      }
    }, intervalMs);
  };
  const stopAutoUpdate = () => {
    if (intervalHandle) clearInterval(intervalHandle);
    intervalHandle = null;
  };
  const clearAll = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    gateWallData = {};
  };
  return { init, register, update, getCurrent, getHistory, startAutoUpdate, stopAutoUpdate, clearAll };
})();