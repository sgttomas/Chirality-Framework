import { fetchMatrixById, fetchAllByStation, type MatrixComponent } from './matrix-api';

export interface SemanticIntegrityReport {
  componentId: string;
  componentName: string;
  station?: string;
  totalCells: number;
  cellsWithResolved: number;
  cellsWithRawTerms: number;
  cellsWithIntermediate: number;
  resolvedIntegrity: number;
  rawTermsIntegrity: number;
  intermediateIntegrity: number;
  sampleCells: Array<{
    position: string;
    resolved?: string;
    rawTerms?: string[];
    intermediate?: any[];
    hasAllFields: boolean;
  }>;
  issues: string[];
}

export interface SemanticIntegrityTestResults {
  totalComponents: number;
  componentsWithIssues: number;
  overallIntegrity: number;
  reports: SemanticIntegrityReport[];
  summary: {
    avgResolvedIntegrity: number;
    avgRawTermsIntegrity: number;
    avgIntermediateIntegrity: number;
  };
}

function analyzeCellSemanticIntegrity(cell: any): {
  hasResolved: boolean;
  hasRawTerms: boolean;
  hasIntermediate: boolean;
  resolved?: string;
  rawTerms?: string[];
  intermediate?: any[];
} {
  if (!cell) {
    return { hasResolved: false, hasRawTerms: false, hasIntermediate: false };
  }

  // Handle different cell formats
  let resolved: string | undefined;
  let rawTerms: string[] | undefined;
  let intermediate: any[] | undefined;

  if (typeof cell === 'string') {
    resolved = cell;
  } else if (typeof cell === 'object') {
    resolved = cell.resolved || cell.value;
    rawTerms = cell.raw_terms || cell.rawTerms;
    intermediate = cell.intermediate;
  }

  return {
    hasResolved: Boolean(resolved),
    hasRawTerms: Boolean(rawTerms && rawTerms.length > 0),
    hasIntermediate: Boolean(intermediate && intermediate.length > 0),
    resolved,
    rawTerms,
    intermediate
  };
}

function analyzeComponentIntegrity(component: MatrixComponent): SemanticIntegrityReport {
  const issues: string[] = [];
  const sampleCells: SemanticIntegrityReport['sampleCells'] = [];
  
  let totalCells = 0;
  let cellsWithResolved = 0;
  let cellsWithRawTerms = 0;
  let cellsWithIntermediate = 0;

  // Analyze matrix data
  for (let row = 0; row < component.data.length; row++) {
    for (let col = 0; col < component.data[row].length; col++) {
      const cell = component.data[row][col];
      totalCells++;

      const analysis = analyzeCellSemanticIntegrity(cell);
      
      if (analysis.hasResolved) cellsWithResolved++;
      if (analysis.hasRawTerms) cellsWithRawTerms++;
      if (analysis.hasIntermediate) cellsWithIntermediate++;

      // Collect sample cells (first 5 non-empty cells)
      if (sampleCells.length < 5 && (analysis.hasResolved || analysis.hasRawTerms || analysis.hasIntermediate)) {
        sampleCells.push({
          position: `[${row},${col}]`,
          resolved: analysis.resolved,
          rawTerms: analysis.rawTerms,
          intermediate: analysis.intermediate,
          hasAllFields: analysis.hasResolved && analysis.hasRawTerms && analysis.hasIntermediate
        });
      }
    }
  }

  // Calculate integrity percentages
  const resolvedIntegrity = totalCells > 0 ? (cellsWithResolved / totalCells) * 100 : 0;
  const rawTermsIntegrity = totalCells > 0 ? (cellsWithRawTerms / totalCells) * 100 : 0;
  const intermediateIntegrity = totalCells > 0 ? (cellsWithIntermediate / totalCells) * 100 : 0;

  // Identify potential issues
  if (cellsWithResolved === 0) {
    issues.push('No cells have resolved content');
  }
  if (cellsWithRawTerms === 0) {
    issues.push('No cells have raw terms (provenance missing)');
  }
  if (cellsWithIntermediate === 0) {
    issues.push('No cells have intermediate data (semantic processing steps missing)');
  }
  if (resolvedIntegrity < 50) {
    issues.push(`Low resolved content coverage: ${resolvedIntegrity.toFixed(1)}%`);
  }

  return {
    componentId: component.id,
    componentName: component.name,
    station: component.station,
    totalCells,
    cellsWithResolved,
    cellsWithRawTerms,
    cellsWithIntermediate,
    resolvedIntegrity,
    rawTermsIntegrity,
    intermediateIntegrity,
    sampleCells,
    issues
  };
}

export async function testSemanticIntegrityById(componentId: string): Promise<SemanticIntegrityReport | null> {
  try {
    const component = await fetchMatrixById(componentId);
    if (!component) {
      return null;
    }
    return analyzeComponentIntegrity(component);
  } catch (error) {
    console.error('Error testing semantic integrity for component:', componentId, error);
    return null;
  }
}

export async function testSemanticIntegrityByStation(station: string): Promise<SemanticIntegrityTestResults> {
  try {
    const components = await fetchAllByStation(station);
    const reports: SemanticIntegrityReport[] = [];
    
    for (const component of components) {
      const report = analyzeComponentIntegrity(component);
      reports.push(report);
    }

    const totalComponents = reports.length;
    const componentsWithIssues = reports.filter(r => r.issues.length > 0).length;
    
    const avgResolvedIntegrity = reports.reduce((sum, r) => sum + r.resolvedIntegrity, 0) / totalComponents;
    const avgRawTermsIntegrity = reports.reduce((sum, r) => sum + r.rawTermsIntegrity, 0) / totalComponents;
    const avgIntermediateIntegrity = reports.reduce((sum, r) => sum + r.intermediateIntegrity, 0) / totalComponents;
    
    const overallIntegrity = (avgResolvedIntegrity + avgRawTermsIntegrity + avgIntermediateIntegrity) / 3;

    return {
      totalComponents,
      componentsWithIssues,
      overallIntegrity,
      reports,
      summary: {
        avgResolvedIntegrity,
        avgRawTermsIntegrity,
        avgIntermediateIntegrity
      }
    };
  } catch (error) {
    console.error('Error testing semantic integrity for station:', station, error);
    return {
      totalComponents: 0,
      componentsWithIssues: 0,
      overallIntegrity: 0,
      reports: [],
      summary: {
        avgResolvedIntegrity: 0,
        avgRawTermsIntegrity: 0,
        avgIntermediateIntegrity: 0
      }
    };
  }
}

export async function runFullSemanticIntegrityTest(): Promise<{
  stationResults: Record<string, SemanticIntegrityTestResults>;
  overallSummary: {
    totalComponents: number;
    componentsWithIssues: number;
    avgIntegrity: number;
    criticalIssues: string[];
  };
}> {
  const stations = ['Problem Statement', 'Requirements', 'Objectives'];
  const stationResults: Record<string, SemanticIntegrityTestResults> = {};
  
  let totalComponents = 0;
  let totalComponentsWithIssues = 0;
  let totalIntegrity = 0;
  const criticalIssues: string[] = [];

  for (const station of stations) {
    console.log(`Testing semantic integrity for station: ${station}`);
    const result = await testSemanticIntegrityByStation(station);
    stationResults[station] = result;
    
    totalComponents += result.totalComponents;
    totalComponentsWithIssues += result.componentsWithIssues;
    totalIntegrity += result.overallIntegrity * result.totalComponents;

    // Collect critical issues
    result.reports.forEach(report => {
      if (report.resolvedIntegrity === 0) {
        criticalIssues.push(`${station}/${report.componentName}: No resolved content`);
      }
      if (report.rawTermsIntegrity === 0) {
        criticalIssues.push(`${station}/${report.componentName}: No provenance data`);
      }
    });
  }

  const avgIntegrity = totalComponents > 0 ? totalIntegrity / totalComponents : 0;

  return {
    stationResults,
    overallSummary: {
      totalComponents,
      componentsWithIssues: totalComponentsWithIssues,
      avgIntegrity,
      criticalIssues
    }
  };
}