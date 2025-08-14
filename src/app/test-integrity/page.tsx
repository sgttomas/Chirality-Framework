'use client';

import { useState } from 'react';
import { 
  testSemanticIntegrityById, 
  testSemanticIntegrityByStation, 
  runFullSemanticIntegrityTest,
  type SemanticIntegrityReport,
  type SemanticIntegrityTestResults
} from '@/lib/semantic-integrity-test';

export default function TestIntegrityPage() {
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [testType, setTestType] = useState<'component' | 'station' | 'full'>('station');
  const [inputValue, setInputValue] = useState('Requirements');

  const runTest = async () => {
    setLoading(true);
    setTestResults(null);
    
    try {
      let results;
      
      if (testType === 'component') {
        results = await testSemanticIntegrityById(inputValue);
      } else if (testType === 'station') {
        results = await testSemanticIntegrityByStation(inputValue);
      } else {
        results = await runFullSemanticIntegrityTest();
      }
      
      setTestResults(results);
    } catch (error) {
      console.error('Test failed:', error);
      setTestResults({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const renderComponentReport = (report: SemanticIntegrityReport) => (
    <div key={report.componentId} className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">{report.componentName}</h4>
        <span className="text-xs text-gray-500">ID: {report.componentId}</span>
      </div>
      
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <div className="font-medium">Resolved Content</div>
          <div className="text-lg font-bold text-blue-600">
            {report.resolvedIntegrity.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500">
            {report.cellsWithResolved}/{report.totalCells} cells
          </div>
        </div>
        
        <div>
          <div className="font-medium">Raw Terms</div>
          <div className="text-lg font-bold text-green-600">
            {report.rawTermsIntegrity.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500">
            {report.cellsWithRawTerms}/{report.totalCells} cells
          </div>
        </div>
        
        <div>
          <div className="font-medium">Intermediate</div>
          <div className="text-lg font-bold text-purple-600">
            {report.intermediateIntegrity.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500">
            {report.cellsWithIntermediate}/{report.totalCells} cells
          </div>
        </div>
      </div>

      {report.issues.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded p-3">
          <div className="font-medium text-red-800 mb-2">Issues Found:</div>
          <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
            {report.issues.map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {report.sampleCells.length > 0 && (
        <details className="border rounded p-2">
          <summary className="cursor-pointer font-medium">Sample Cells</summary>
          <div className="mt-2 space-y-2">
            {report.sampleCells.map((cell, i) => (
              <div key={i} className="bg-gray-50 p-2 rounded text-xs">
                <div className="font-medium">{cell.position}</div>
                {cell.resolved && <div><strong>Resolved:</strong> {cell.resolved}</div>}
                {cell.rawTerms && <div><strong>Raw Terms:</strong> {cell.rawTerms.join(', ')}</div>}
                {cell.intermediate && <div><strong>Intermediate:</strong> {JSON.stringify(cell.intermediate).slice(0, 100)}...</div>}
                <div className={`mt-1 text-xs ${cell.hasAllFields ? 'text-green-600' : 'text-orange-600'}`}>
                  {cell.hasAllFields ? '✓ All fields present' : '⚠ Missing some fields'}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );

  const renderStationResults = (results: SemanticIntegrityTestResults) => (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {results.summary.avgResolvedIntegrity.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">Avg Resolved</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {results.summary.avgRawTermsIntegrity.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">Avg Raw Terms</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {results.summary.avgIntermediateIntegrity.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">Avg Intermediate</div>
        </div>
      </div>
      
      <div className="text-sm text-gray-600">
        {results.totalComponents} components analyzed, {results.componentsWithIssues} with issues
      </div>
      
      <div className="space-y-3">
        {results.reports.map(renderComponentReport)}
      </div>
    </div>
  );

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Semantic Integrity Test</h1>
        <p className="text-gray-600">
          Test that resolved, rawTerms, and intermediate fields are preserved correctly
        </p>
      </header>

      <div className="border rounded-lg p-4 space-y-4">
        <div className="flex gap-4 items-center">
          <label className="font-medium">Test Type:</label>
          <select 
            value={testType} 
            onChange={(e) => setTestType(e.target.value as any)}
            className="border rounded px-3 py-1"
          >
            <option value="component">Single Component</option>
            <option value="station">All Components at Station</option>
            <option value="full">Full Test (All Stations)</option>
          </select>
          
          {testType !== 'full' && (
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={testType === 'component' ? 'Component ID' : 'Station Name'}
              className="border rounded px-3 py-1 flex-1"
            />
          )}
          
          <button
            onClick={runTest}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Run Test'}
          </button>
        </div>
        
        <div className="text-sm text-gray-600">
          Current API: {process.env.NEXT_PUBLIC_USE_GRAPHQL === 'true' ? 'GraphQL' : 'REST'}
        </div>
      </div>

      {testResults && (
        <div className="space-y-6">
          {testResults.error ? (
            <div className="bg-red-50 border border-red-200 rounded p-4">
              <div className="font-medium text-red-800">Error:</div>
              <div className="text-red-700">{testResults.error}</div>
            </div>
          ) : testType === 'component' ? (
            testResults && renderComponentReport(testResults)
          ) : testType === 'station' ? (
            renderStationResults(testResults)
          ) : (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <h3 className="font-bold text-blue-800 mb-2">Overall Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="font-medium">Total Components</div>
                    <div className="text-lg font-bold">{testResults.overallSummary.totalComponents}</div>
                  </div>
                  <div>
                    <div className="font-medium">With Issues</div>
                    <div className="text-lg font-bold text-red-600">{testResults.overallSummary.componentsWithIssues}</div>
                  </div>
                  <div>
                    <div className="font-medium">Avg Integrity</div>
                    <div className="text-lg font-bold text-green-600">{testResults.overallSummary.avgIntegrity.toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="font-medium">Critical Issues</div>
                    <div className="text-lg font-bold text-orange-600">{testResults.overallSummary.criticalIssues.length}</div>
                  </div>
                </div>
                
                {testResults.overallSummary.criticalIssues.length > 0 && (
                  <details className="mt-3">
                    <summary className="cursor-pointer font-medium text-red-800">Critical Issues</summary>
                    <ul className="mt-2 list-disc list-inside text-sm text-red-700">
                      {testResults.overallSummary.criticalIssues.map((issue: string, i: number) => (
                        <li key={i}>{issue}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
              
              {Object.entries(testResults.stationResults).map(([station, results]) => (
                <div key={station} className="border rounded-lg p-4">
                  <h3 className="text-lg font-medium mb-3">Station: {station}</h3>
                  {renderStationResults(results as SemanticIntegrityTestResults)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}