const PipelineDynamicManager = (() => {
  const STORAGE_KEY = "pipeline_dynamic_data";
  let pipelineData = {};
  let intervalHandle = null;
  
  const init = () => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    pipelineData = saved ? JSON.parse(saved) : {};
  };
  
  const save = () => window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pipelineData));
  
  const register = (id) => {
    if (!pipelineData[id]) {
      pipelineData[id] = { 
        current: {
          flowSegments: [],
          overallFlow: false
        }, 
        history: [] 
      };
      save();
    }
  };
  
  /**
   * Calculate flow through a pipeline based on connected gate walls
   * Returns array of segments with flow status
   * IMPORTANT: Flow is directional - from start to end of pipeline
   */
  const calculatePipelineFlow = (pipeline, allGateWalls) => {
    if (!pipeline || !pipeline.points || pipeline.points.length < 2) {
      return {
        flowSegments: [{ start: 0, end: 1, hasFlow: false }],
        overallFlow: false
      };
    }
    
    // Get connected gate walls for this pipeline
    const connectedGates = (pipeline.connectedGateWalls || [])
      .map(gwId => {
        const gw = allGateWalls.find(g => g.id === gwId);
        if (!gw) return null;
        
        // Get dynamic data for gate
        const dynamic = GateWallDynamicManager?.getCurrent(gwId);
        if (!dynamic) return null;
        
        // Calculate position along pipeline (0 to 1)
        const position = calculateGatePositionOnPipeline(pipeline, gw);
        
        return {
          id: gwId,
          position: position,
          isOpen: dynamic.flowDirection !== 'none' && dynamic.status === 'active',
          flowDirection: dynamic.flowDirection,
          gateWall: gw
        };
      })
      .filter(g => g !== null)
      .sort((a, b) => a.position - b.position);
    
    // Calculate flow segments - DIRECTIONAL FLOW FROM START TO END
    const segments = [];
    
    if (connectedGates.length === 0) {
      // No gates - check if pipeline has source (water flows from start)
      const hasSource = checkPipelineHasSource(pipeline);
      segments.push({ 
        start: 0, 
        end: 1, 
        hasFlow: hasSource,
        startPoint: pipeline.points[0],
        endPoint: pipeline.points[pipeline.points.length - 1]
      });
    } else {
      // Has gates - calculate flow between gates
      // Flow starts from source (beginning of pipeline)
      let currentFlow = checkPipelineHasSource(pipeline);
      let prevPos = 0;
      
      connectedGates.forEach((gate, index) => {
        // Segment BEFORE gate (water approaching the gate)
        if (gate.position > prevPos) {
          const startIdx = Math.floor(prevPos * (pipeline.points.length - 1));
          const endIdx = Math.floor(gate.position * (pipeline.points.length - 1));
          
          segments.push({
            start: prevPos,
            end: gate.position,
            hasFlow: currentFlow, // Water flows UP TO this gate
            startPoint: pipeline.points[startIdx],
            endPoint: pipeline.points[endIdx],
            beforeGate: gate.id
          });
        }
        
        // CRITICAL: Gate controls flow AFTER it (downstream)
        // If gate is CLOSED, water STOPS here - no flow beyond this gate
        // If gate is OPEN, water continues flowing
        if (!gate.isOpen) {
          currentFlow = false; // Gate blocks flow - everything downstream is dry
        }
        // If gate is open, currentFlow stays as is (continues)
        
        prevPos = gate.position;
      });
      
      // Final segment AFTER last gate
      if (prevPos < 1) {
        const startIdx = Math.floor(prevPos * (pipeline.points.length - 1));
        segments.push({
          start: prevPos,
          end: 1,
          hasFlow: currentFlow, // Flow status after passing through all gates
          startPoint: pipeline.points[startIdx],
          endPoint: pipeline.points[pipeline.points.length - 1],
          afterGate: connectedGates[connectedGates.length - 1].id
        });
      }
    }
    
    // Calculate overall flow status
    const overallFlow = segments.some(seg => seg.hasFlow);
    
    return { flowSegments: segments, overallFlow };
  };
  
  /**
   * Calculate gate position along pipeline (0 to 1)
   */
  const calculateGatePositionOnPipeline = (pipeline, gateWall) => {
    if (!pipeline.points || pipeline.points.length < 2) return 0;
    
    // Find closest point on pipeline to gate
    let minDist = Infinity;
    let closestSegment = 0;
    let segmentT = 0;
    
    for (let i = 0; i < pipeline.points.length - 1; i++) {
      const p1 = pipeline.points[i];
      const p2 = pipeline.points[i + 1];
      
      const result = pointToLineSegmentDistance(
        [gateWall.latitude, gateWall.longitude],
        p1,
        p2
      );
      
      if (result.distance < minDist) {
        minDist = result.distance;
        closestSegment = i;
        segmentT = result.t;
      }
    }
    
    // Calculate position as ratio along entire pipeline
    const segmentLength = 1 / (pipeline.points.length - 1);
    return (closestSegment * segmentLength) + (segmentT * segmentLength);
  };
  
  /**
   * Calculate distance from point to line segment
   */
  const pointToLineSegmentDistance = (point, lineStart, lineEnd) => {
    const dx = lineEnd[1] - lineStart[1]; // longitude
    const dy = lineEnd[0] - lineStart[0]; // latitude
    const lenSq = dx * dx + dy * dy;
    
    if (lenSq === 0) return { distance: Infinity, t: 0 };
    
    let t = ((point[1] - lineStart[1]) * dx + (point[0] - lineStart[0]) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    
    const closestLat = lineStart[0] + t * dy;
    const closestLng = lineStart[1] + t * dx;
    
    const distLat = point[0] - closestLat;
    const distLng = point[1] - closestLng;
    const distance = Math.sqrt(distLat * distLat + distLng * distLng);
    
    return { distance, t };
  };
  
  /**
   * Check if pipeline has a water source (connected device)
   */
  const checkPipelineHasSource = (pipeline) => {
    if (!pipeline.connectedDevices || pipeline.connectedDevices.length === 0) {
      return true; // Default to having flow if no devices connected
    }
    
    // Check if any connected device is active
    for (const deviceId of pipeline.connectedDevices) {
      const dynamic = TankDynamicManager?.getCurrent(deviceId);
      if (dynamic && dynamic.status === 'active' && dynamic.waterLevel > 0) {
        return true;
      }
    }
    
    return false;
  };
  
  /**
   * Update pipeline with flow calculation
   */
  const update = async (id, liveData = null, pipeline = null, allGateWalls = []) => {
    if (!pipelineData[id]) register(id);
    
    let data;
    
    if (liveData) {
      data = liveData;
    } else if (pipeline) {
      // Calculate flow based on gate walls
      const flowCalc = calculatePipelineFlow(pipeline, allGateWalls);
      
      // Calculate average flow rate and pressure
      const flowingSegments = flowCalc.flowSegments.filter(s => s.hasFlow);
      const flowRatio = flowingSegments.length / Math.max(1, flowCalc.flowSegments.length);
      
      data = {
        id,
        timestamp: new Date().toISOString(),
        flowActive: flowCalc.overallFlow,
        flowSegments: flowCalc.flowSegments,
        flowRate: flowCalc.overallFlow ? +(Math.random() * 200 * flowRatio).toFixed(1) : 0,
        pressure: flowCalc.overallFlow ? +(Math.random() * 60 * flowRatio).toFixed(1) : 0,
        status: flowCalc.overallFlow ? "active" : "inactive",
        color: flowCalc.overallFlow ? "#2196F3" : "#F44336",
        flowRatio: flowRatio
      };
    } else {
      // Fallback: simulate data
      const active = Math.random() > 0.2;
      data = {
        id,
        timestamp: new Date().toISOString(),
        flowActive: active,
        flowSegments: [{ start: 0, end: 1, hasFlow: active }],
        flowRate: active ? +(Math.random() * 200).toFixed(1) : 0,
        pressure: active ? +(Math.random() * 60).toFixed(1) : 0,
        status: active ? "active" : "inactive",
        color: active ? "#2196F3" : "#F44336",
        flowRatio: active ? 1 : 0
      };
    }
    
    pipelineData[id].current = data;
    pipelineData[id].history.push(data);
    
    // Keep history limited
    if (pipelineData[id].history.length > 200) {
      pipelineData[id].history.splice(0, pipelineData[id].history.length - 200);
    }
    
    save();
    return data;
  };
  
  const getCurrent = (id) => pipelineData[id]?.current || null;
  
  const getHistory = (id) => pipelineData[id]?.history || [];
  
  /**
   * Update all pipelines based on current gate wall states
   */
  const updateAllPipelines = (allPipelines, allGateWalls) => {
    if (!allPipelines || !Array.isArray(allPipelines)) return;
    
    allPipelines.forEach(pipeline => {
      update(pipeline.id, null, pipeline, allGateWalls);
    });
  };
  
  const startAutoUpdate = (intervalMs = 300000) => {
    if (intervalHandle) clearInterval(intervalHandle);
    intervalHandle = setInterval(async () => {
      const list = PipelineStaticManager?.getAll() || [];
      const gates = GateWallStaticManager?.getAll() || [];
      updateAllPipelines(list, gates);
    }, intervalMs);
  };
  
  const stopAutoUpdate = () => {
    if (intervalHandle) clearInterval(intervalHandle);
    intervalHandle = null;
  };
  
  const clearAll = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    pipelineData = {};
  };
  
  return { 
    init, 
    register, 
    update, 
    getCurrent, 
    getHistory, 
    updateAllPipelines,
    calculatePipelineFlow,
    startAutoUpdate, 
    stopAutoUpdate, 
    clearAll 
  };
})();