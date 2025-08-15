'use client';

import React from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Modal, Tabs, Timeline, Tag, Space, Button, Card, Descriptions, Alert, Tooltip, message } from 'antd';
import { CopyOutlined, ReloadOutlined, ThunderboltOutlined, RocketOutlined } from '@ant-design/icons';
import { CELL_INSPECTOR, PROPOSE_UFO } from '../lib/queries';

interface CellInspectorProps {
  station: string;
  matrix: string;
  row: number;
  col: number;
  onClose: () => void;
}

interface StageTrace {
  phase: string;
  promptHash: string;
  modelId: string;
  latencyMs: number;
  createdAt: string;
}

const CellInspector: React.FC<CellInspectorProps> = ({ station, matrix, row, col, onClose }) => {
  const { data, loading, refetch } = useQuery(CELL_INSPECTOR, {
    variables: { station, matrix, row, col },
  });
  
  const [proposeUFO] = useMutation(PROPOSE_UFO);

  const cell = data?.matrix?.cell;
  const valleyData = data?.valley;
  const stationData = data?.station;
  const matrixData = data?.matrix;
  const ontologies = data?.ontologies;

  // Generate valley summary
  const valleySummary = React.useMemo(() => {
    if (!valleyData?.stations) return '';
    const names = valleyData.stations.map((s: any, i: number) => 
      i === stationData?.index ? `[${s.name}]` : s.name
    );
    return `Semantic Valley: ${names.join(' → ')}`;
  }, [valleyData, stationData]);

  // Parse stage history from traces
  const stageHistory = React.useMemo(() => {
    if (!cell?.traces) return [];
    
    // Group traces by stage name
    const stages: Record<string, StageTrace[]> = {};
    cell.traces.forEach((trace: StageTrace) => {
      const stageName = trace.phase;
      if (!stages[stageName]) stages[stageName] = [];
      stages[stageName].push(trace);
    });
    
    // Order stages logically
    const stageOrder = [
      'context_loaded',
      'product:k=0', 'product:k=1', 'product:k=2', 'product:k=3',
      'sum', 'element_wise',
      'interpretation',
      'final_resolved',
      'error'
    ];
    
    return stageOrder
      .filter(stage => stages[stage])
      .map(stage => ({
        name: stage,
        traces: stages[stage],
        latest: stages[stage][stages[stage].length - 1],
      }));
  }, [cell]);

  const handleRetryStage = async (stage: string) => {
    try {
      const response = await fetch('/api/orchestrate/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          station,
          matrix,
          row,
          col,
          stage,
        }),
      });
      
      if (response.ok) {
        message.success(`Retrying stage: ${stage}`);
        setTimeout(() => refetch(), 2000);
      } else {
        message.error('Failed to retry stage');
      }
    } catch (error) {
      message.error('Failed to connect to orchestrator');
    }
  };

  const handleRebuildCell = async () => {
    try {
      const cmd = matrix === 'C' ? 'generate-c' : matrix === 'F' ? 'generate-f' : 'generate-d';
      const response = await fetch('/api/orchestrate/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cmd,
          args: {
            rows: `${row}`,
            cols: `${col}`,
            api_base: process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:8080',
          },
        }),
      });
      
      if (response.ok) {
        message.success('Rebuild initiated');
        setTimeout(() => refetch(), 3000);
      } else {
        message.error('Failed to rebuild cell');
      }
    } catch (error) {
      message.error('Failed to connect to orchestrator');
    }
  };

  const handleProposeUFO = async () => {
    // Default UFO mappings from CLI
    const UFO_DEFAULTS: Record<string, any> = {
      'Requirements_C': { curie: 'UFO:Requirement', relation: 'CLOSE_MATCH', confidence: 0.75 },
      'Objectives_F': { curie: 'UFO:Objective', relation: 'CLOSE_MATCH', confidence: 0.70 },
      'Solution Objectives_D': { curie: 'UFO:Recommendation', relation: 'CLOSE_MATCH', confidence: 0.70 },
    };
    
    const config = UFO_DEFAULTS[`${station}_${matrix}`];
    if (!config) {
      message.warning('No default UFO mapping for this matrix');
      return;
    }

    try {
      await proposeUFO({
        variables: {
          input: {
            subjectId: `cell:${station}:${matrix}:${row}:${col}`,
            ufoCurie: config.curie,
            relation: config.relation,
            confidence: config.confidence,
            evidence: [{
              kind: 'ADMIN_UI',
              source: 'Manual proposal from Cell Inspector',
              payload: { value: cell?.value },
            }],
            note: `Proposed via admin UI for ${station}/${matrix}[${row},${col}]`,
          },
        },
      });
      message.success('UFO claim proposed');
    } catch (error) {
      message.error('Failed to propose UFO claim');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    message.success(`${label} copied`);
  };

  return (
    <Modal
      title={
        <Space direction="vertical" size="small">
          <div>{`Cell Inspector: ${station} / Matrix ${matrix} [${row},${col}]`}</div>
          <div style={{ fontSize: 14, fontWeight: 'normal', color: '#666' }}>
            {cell?.labels?.rowLabel} × {cell?.labels?.colLabel}
          </div>
        </Space>
      }
      open={true}
      onCancel={onClose}
      width={900}
      footer={[
        <Button key="refresh" icon={<ReloadOutlined />} onClick={() => refetch()}>
          Refresh
        </Button>,
        <Button key="rebuild" icon={<ThunderboltOutlined />} onClick={handleRebuildCell}>
          Rebuild Cell
        </Button>,
        <Button key="ufo" icon={<RocketOutlined />} onClick={handleProposeUFO}>
          Propose UFO
        </Button>,
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
      ]}
    >
      {/* Valley Summary */}
      <Alert 
        message={valleySummary} 
        type="info" 
        style={{ marginBottom: 16 }}
      />

      <Tabs defaultActiveKey="timeline">
        {/* Timeline Tab */}
        <Tabs.TabPane tab="Timeline" key="timeline">
          <Timeline mode="left">
            {stageHistory.map((stage) => (
              <Timeline.Item 
                key={stage.name}
                color={stage.name === 'error' ? 'red' : stage.name === 'final_resolved' ? 'green' : 'blue'}
              >
                <Card size="small" style={{ marginBottom: 8 }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Space>
                      <Tag color={stage.name === 'error' ? 'red' : 'blue'}>{stage.name}</Tag>
                      <Button size="small" onClick={() => handleRetryStage(stage.name)}>
                        Retry
                      </Button>
                    </Space>
                    
                    {stage.latest && (
                      <Descriptions size="small" column={2}>
                        <Descriptions.Item label="Model">
                          {stage.latest.modelId}
                        </Descriptions.Item>
                        <Descriptions.Item label="Latency">
                          {stage.latest.latencyMs}ms
                        </Descriptions.Item>
                        <Descriptions.Item label="Prompt Hash" span={2}>
                          <Space>
                            <code style={{ fontSize: 11 }}>
                              {stage.latest.promptHash?.substring(0, 12)}...
                            </code>
                            <Tooltip title="Copy full hash">
                              <Button 
                                size="small" 
                                icon={<CopyOutlined />}
                                onClick={() => copyToClipboard(stage.latest.promptHash, 'Prompt hash')}
                              />
                            </Tooltip>
                          </Space>
                        </Descriptions.Item>
                        <Descriptions.Item label="Created" span={2}>
                          {new Date(stage.latest.createdAt).toLocaleString()}
                        </Descriptions.Item>
                      </Descriptions>
                    )}
                  </Space>
                </Card>
              </Timeline.Item>
            ))}
          </Timeline>
          
          {/* Current Value */}
          {cell?.value && (
            <Card title="Current Value" size="small">
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>
                {cell.value}
              </div>
            </Card>
          )}
        </Tabs.TabPane>

        {/* Ontology Tab */}
        <Tabs.TabPane tab="Ontology" key="ontology">
          <Space direction="vertical" style={{ width: '100%' }}>
            {/* Station Ontology */}
            {stationData?.ontology && (
              <Card title="Station Ontology" size="small">
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="CURIE">
                    <Tag color="blue">{stationData.ontology.curie}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Label">
                    {stationData.ontology.label}
                  </Descriptions.Item>
                  <Descriptions.Item label="Definition">
                    {stationData.ontology.definition}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            )}

            {/* Matrix Ontology */}
            {matrixData?.ontology && (
              <Card title="Matrix Ontology" size="small">
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="CURIE">
                    <Tag color="green">{matrixData.ontology.curie}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Label">
                    {matrixData.ontology.label}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            )}

            {/* Cell Ontology */}
            {cell?.ontology && (
              <Card title="Cell Ontology" size="small">
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="CURIE">
                    <Tag color="purple">{cell.ontology.curie}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Label">
                    {cell.ontology.label}
                  </Descriptions.Item>
                  <Descriptions.Item label="Definition">
                    {cell.ontology.definition}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            )}

            {/* JSON-LD Context */}
            {ontologies?.jsonldContext && (
              <Card title="JSON-LD Context" size="small">
                <pre style={{ fontSize: 11, overflow: 'auto', maxHeight: 200 }}>
                  {JSON.stringify(ontologies.jsonldContext, null, 2)}
                </pre>
              </Card>
            )}
          </Space>
        </Tabs.TabPane>

        {/* Meta Tab */}
        <Tabs.TabPane tab="Metadata" key="meta">
          <Descriptions column={2} size="small">
            <Descriptions.Item label="Station ID">{station}</Descriptions.Item>
            <Descriptions.Item label="Matrix ID">{matrix}</Descriptions.Item>
            <Descriptions.Item label="Row">{row}</Descriptions.Item>
            <Descriptions.Item label="Col">{col}</Descriptions.Item>
            <Descriptions.Item label="Stage">{cell?.stage}</Descriptions.Item>
            <Descriptions.Item label="Version">{cell?.version}</Descriptions.Item>
            <Descriptions.Item label="Row Label">{cell?.labels?.rowLabel}</Descriptions.Item>
            <Descriptions.Item label="Col Label">{cell?.labels?.colLabel}</Descriptions.Item>
          </Descriptions>
          
          {/* Anchors */}
          {cell?.anchors && cell.anchors.length > 0 && (
            <Card title="Anchors" size="small" style={{ marginTop: 16 }}>
              {cell.anchors.map((anchor: any) => (
                <div key={anchor.id}>
                  <Tag>{anchor.kind}</Tag>: {anchor.text}
                </div>
              ))}
            </Card>
          )}
        </Tabs.TabPane>
      </Tabs>
    </Modal>
  );
};

export default CellInspector;