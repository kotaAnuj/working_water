const TankDynamicManager = (() => {
  const STORAGE_KEY = "ohsr_dynamic_data";
  let tankData = {};
  let intervalHandle = null;
  const init = () => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    tankData = saved ? JSON.parse(saved) : {};
  };
  const save = () => window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tankData));
  const registerTank = (tankId) => {
    if (!tankData[tankId]) {
      tankData[tankId] = { current: {}, history: [] };
      save();
    }
  };
  const generateLiveData = (tankId) => ({
    tankId,
    timestamp: new Date().toISOString(),
    waterLevel: +(Math.random() * 10).toFixed(2),
    pressure: +(Math.random() * 50).toFixed(1),
    flowRate: +(Math.random() * 150).toFixed(1),
    phLevel: +(6.5 + Math.random()).toFixed(2),
    temperature: +(20 + Math.random() * 10).toFixed(1),
    status: Math.random() > 0.1 ? "active" : "inactive"
  });
  const updateTankData = async (tankId, liveData = null) => {
    if (!tankData[tankId]) registerTank(tankId);
    const data = liveData || generateLiveData(tankId);
    tankData[tankId].current = data;
    tankData[tankId].history.push(data);
    if (tankData[tankId].history.length > 100) tankData[tankId].history.shift();
    save();
  };
  const getCurrent = (tankId) => tankData[tankId]?.current || null;
  const getHistory = (tankId) => tankData[tankId]?.history || [];
  const startAutoUpdate = (intervalMs = 300000) => {
    if (intervalHandle) clearInterval(intervalHandle);
    intervalHandle = setInterval(() => {
      const tanks = TankStaticManager.getAll();
      tanks.forEach(t => updateTankData(t.id));
    }, intervalMs);
  };
  const stopAutoUpdate = () => {
    if (intervalHandle) clearInterval(intervalHandle);
    intervalHandle = null;
  };
  const clearAll = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    tankData = {};
  };
  return { init, registerTank, updateTankData, getCurrent, getHistory, startAutoUpdate, stopAutoUpdate, clearAll };
})();
