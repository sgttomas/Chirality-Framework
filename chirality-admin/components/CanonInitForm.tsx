"use client";
import { useState, useEffect } from "react";

type InitStep = {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'paused' | 'error';
  data?: any;
  canPause?: boolean;
};

export default function FrameworkInitController({ defaultPack }: { defaultPack?: string }) {
  const [packPath, setPackPath] = useState(defaultPack || "");
  const [steps, setSteps] = useState<InitStep[]>([
    { id: 'load-pack', name: 'Load Domain Pack', description: 'Load and validate CF14 domain pack configuration', status: 'pending' },
    { id: 'init-stations', name: 'Initialize Stations', description: 'Create 10-station semantic valley structure in Neo4j', status: 'pending' },
    { id: 'setup-axioms', name: 'Setup Axiomatic Matrices', description: 'Load canonical matrices A, B, and J into Neo4j', status: 'pending' },
    { id: 'define-ontologies', name: 'Define Ontologies', description: 'Setup row/column families and semantic lenses', status: 'pending' },
    { id: 'create-canon', name: 'Generate Requirements Matrix', description: 'Generate Matrix C using A*B semantic multiplication', status: 'pending' },
    { id: 'validate-structure', name: 'Validate Structure', description: 'Verify structural integrity and completeness', status: 'pending' }
  ]);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [autoMode, setAutoMode] = useState(false);
  const [inspectData, setInspectData] = useState<any>(null);

  async function executeStep(stepId: string) {
    setCurrentStep(stepId);
    setSteps(prev => prev.map(s => 
      s.id === stepId ? { ...s, status: 'running' } : s
    ));

    try {
      const response = await fetch("/api/phase1/step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepId, packPath })
      });
      
      const result = await response.json();
      
      setSteps(prev => prev.map(s => 
        s.id === stepId ? { ...s, status: 'completed', data: result } : s
      ));

      if (autoMode) {
        const nextStep = steps.find(s => s.status === 'pending');
        if (nextStep) {
          setTimeout(() => executeStep(nextStep.id), 1000);
        }
      }
    } catch (error) {
      setSteps(prev => prev.map(s => 
        s.id === stepId ? { ...s, status: 'error', data: { error: String(error) } } : s
      ));
    }
    
    setCurrentStep(null);
  }

  function pauseExecution() {
    setAutoMode(false);
    if (currentStep) {
      setSteps(prev => prev.map(s => 
        s.id === currentStep ? { ...s, status: 'paused' } : s
      ));
    }
  }

  function resetAll() {
    setSteps(prev => prev.map(s => ({ ...s, status: 'pending', data: undefined })));
    setCurrentStep(null);
    setAutoMode(false);
    setInspectData(null);
  }

  function inspectStep(step: InitStep) {
    setInspectData(step);
  }

  const canRunAuto = steps.some(s => s.status === 'pending') && !currentStep;
  const isRunning = currentStep !== null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-purple-50 border border-purple-200 rounded p-4">
        <h2 className="font-semibold text-purple-800 mb-2">Framework Initialization Control Panel</h2>
        <p className="text-sm text-purple-700">
          Step-by-step framework setup with pause/resume and cell-level inspection.
          All structural data persisted to Neo4j for chirality-chat semantic operations.
        </p>
      </div>

      {/* Configuration */}
      <div className="bg-gray-50 border rounded p-4">
        <h3 className="font-semibold mb-3">Configuration</h3>
        <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
          <label className="text-sm font-medium">Pack path</label>
          <input 
            className="border p-2 rounded text-sm" 
            value={packPath} 
            onChange={e=>setPackPath(e.target.value)} 
            placeholder="/abs/path/to/cf14.core.pack.json"
            disabled={isRunning}
          />
        </div>
      </div>

      {/* Control Panel */}
      <div className="border rounded p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Execution Control</h3>
          <div className="flex gap-2">
            <button 
              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50" 
              onClick={() => { setAutoMode(true); executeStep(steps.find(s => s.status === 'pending')?.id || ''); }}
              disabled={!canRunAuto}
            >
              ▶ Auto Run
            </button>
            <button 
              className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700 disabled:opacity-50" 
              onClick={pauseExecution}
              disabled={!isRunning}
            >
              ⏸ Pause
            </button>
            <button 
              className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700" 
              onClick={resetAll}
            >
              🔄 Reset
            </button>
          </div>
        </div>

        <div className="text-xs text-gray-600 mb-3">
          <strong>Auto Mode:</strong> {autoMode ? "ON - will proceed to next step automatically" : "OFF - manual step execution"}
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step, idx) => (
          <div key={step.id} className={`border rounded p-4 ${
            step.status === 'completed' ? 'bg-green-50 border-green-200' :
            step.status === 'running' ? 'bg-blue-50 border-blue-200' :
            step.status === 'error' ? 'bg-red-50 border-red-200' :
            step.status === 'paused' ? 'bg-yellow-50 border-yellow-200' :
            'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  step.status === 'completed' ? 'bg-green-600 text-white' :
                  step.status === 'running' ? 'bg-blue-600 text-white' :
                  step.status === 'error' ? 'bg-red-600 text-white' :
                  step.status === 'paused' ? 'bg-yellow-600 text-white' :
                  'bg-gray-300 text-gray-600'
                }`}>
                  {step.status === 'completed' ? '✓' :
                   step.status === 'running' ? '⋯' :
                   step.status === 'error' ? '✗' :
                   step.status === 'paused' ? '⏸' :
                   idx + 1}
                </div>
                <div>
                  <h4 className="font-medium">{step.name}</h4>
                  <p className="text-sm text-gray-600">{step.description}</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                {step.data && (
                  <button 
                    className="text-xs px-2 py-1 border rounded hover:bg-gray-50"
                    onClick={() => inspectStep(step)}
                  >
                    🔍 Inspect
                  </button>
                )}
                {step.status === 'pending' && !isRunning && (
                  <button 
                    className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700"
                    onClick={() => executeStep(step.id)}
                  >
                    ▶ Run
                  </button>
                )}
                {step.status === 'paused' && (
                  <button 
                    className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                    onClick={() => executeStep(step.id)}
                  >
                    ▶ Resume
                  </button>
                )}
              </div>
            </div>

            {step.status === 'running' && (
              <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
                <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
                Executing...
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Inspection Panel */}
      {inspectData && (
        <div className="border rounded p-4 bg-blue-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Inspecting: {inspectData.name}</h3>
            <button 
              className="text-xs px-2 py-1 border rounded hover:bg-gray-50"
              onClick={() => setInspectData(null)}
            >
              ✗ Close
            </button>
          </div>
          <div className="bg-white border rounded p-3 overflow-auto text-sm h-64 font-mono">
            <pre>{JSON.stringify(inspectData.data, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}