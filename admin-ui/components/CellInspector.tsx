'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Modal, Tabs, Timeline, Tag, Space, Button, Card, Descriptions, Alert, Tooltip, message, Form, Input, Select, InputNumber } from 'antd';
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

// Stage colors consistent with MatrixExplorer
const STAGE_COLORS: Record<string, string> = {
  axiom: '#52c41a',
  axiomatic_truncation: '#52c41a',
  context_loaded: '#1890ff',
  'product:k=0': '#722ed1',
  'product:k=1': '#722ed1',
  'product:k=2': '#722ed1',
  'product:k=3': '#722ed1',
  sum: '#fa8c16',
  element_wise: '#fa8c16',
  interpretation: '#13c2c2',
  final_resolved: '#52c41a',
  error: '#f5222d',
};

const CellInspector: React.FC<CellInspectorProps> = ({ station, matrix, row, col, onClose }) => {
  const [showUFOModal, setShowUFOModal] = useState(false);
  const [ufoForm] = Form.useForm();
  
  const { data, loading, refetch } = useQuery(CELL_INSPECTOR, {
    variables: { station, matrix, row, col },
    fetchPolicy: 'network-only', // Always fetch fresh data
    pollInterval: 0, // Disable polling, use manual refresh
  });
  
  const [proposeUFO] = useMutation(PROPOSE_UFO);

  const cell = data?.matrix?.cell;
  const valleyData = data?.valley;
  const stationData = data?.station;
  const matrixData = data?.matrix;
  const ontologies = data?.ontologies;

  // Generate valley summary with proper station bracketing
  const valleySummary = React.useMemo(() => {
    const STATIONS = [
      'Problem Statement', 'Decisions', 'Truncated Decisions', 
      'Requirements', 'Objectives', 'Solution Objectives'
    ];
    const names = STATIONS.map(s => s === station ? `[${s}]` : s);
    return `Semantic Valley: ${names.join(' → ')}`;
  }, [station]);

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

  const handleOpenUFOModal = () => {
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

    // Prefill the form with default values and cell context
    ufoForm.setFieldsValue({
      subjectId: `cell:${station}:${matrix}:${row}:${col}`,
      ufoCurie: config.curie,
      relation: config.relation,
      confidence: config.confidence,
      note: `Proposed via admin UI for ${station}/${matrix}[${row},${col}]\n\nCell Value: ${cell?.value || '(empty)'}`,
      evidenceKind: 'ADMIN_UI',
      evidenceSource: 'Manual proposal from Cell Inspector',
    });
    
    setShowUFOModal(true);
  };

  const handleSubmitUFO = async (values: any) => {
    try {
      await proposeUFO({
        variables: {
          input: {
            subjectId: values.subjectId,
            ufoCurie: values.ufoCurie,
            relation: values.relation,
            confidence: values.confidence,
            evidence: [{
              kind: values.evidenceKind,
              source: values.evidenceSource,
              payload: { value: cell?.value },
            }],
            note: values.note,
          },
        },
      });
      message.success('UFO claim proposed successfully');
      setShowUFOModal(false);
      ufoForm.resetFields();
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
        <Button key="ufo" icon={<RocketOutlined />} onClick={handleOpenUFOModal}>
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
                color={STAGE_COLORS[stage.name] || '#1890ff'}
              >
                <Card size="small" style={{ marginBottom: 8 }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Space>
                      <Tag color={STAGE_COLORS[stage.name] || 'default'}>{stage.name}</Tag>
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
                <Card key={anchor.id} size="small" style={{ marginBottom: 8 }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Space>
                      <Tag color="orange">{anchor.kind}</Tag>
                      <Button 
                        size="small" 
                        type="link"
                        onClick={() => copyToClipboard(anchor.text, 'Anchor text')}
                        icon={<CopyOutlined />}
                      >
                        Copy
                      </Button>
                      <Button 
                        size="small" 
                        type="link"
                        onClick={() => message.info('View in context feature coming soon')}
                      >
                        View in Context
                      </Button>
                    </Space>
                    <div style={{ fontSize: 13, color: '#666' }}>
                      {anchor.text}
                    </div>
                  </Space>
                </Card>
              ))}
            </Card>
          )}
        </Tabs.TabPane>
      </Tabs>

      {/* UFO Proposal Modal */}
      <Modal
        title="Propose UFO Claim"
        open={showUFOModal}
        onCancel={() => {
          setShowUFOModal(false);
          ufoForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={ufoForm}
          layout="vertical"
          onFinish={handleSubmitUFO}
        >
          <Form.Item
            name="subjectId"
            label="Subject ID"
            rules={[{ required: true, message: 'Subject ID is required' }]}
          >
            <Input placeholder="cell:station:matrix:row:col" />
          </Form.Item>

          <Form.Item
            name="ufoCurie"
            label="UFO CURIE"
            rules={[{ required: true, message: 'UFO CURIE is required' }]}
          >
            <Select placeholder="Select UFO entity">
              <Select.Option value="UFO:Requirement">UFO:Requirement</Select.Option>
              <Select.Option value="UFO:Objective">UFO:Objective</Select.Option>
              <Select.Option value="UFO:Recommendation">UFO:Recommendation</Select.Option>
              <Select.Option value="UFO:Constraint">UFO:Constraint</Select.Option>
              <Select.Option value="UFO:Process">UFO:Process</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="relation"
            label="Relation Type"
            rules={[{ required: true, message: 'Relation type is required' }]}
          >
            <Select placeholder="Select relation type">
              <Select.Option value="EXACT_MATCH">Exact Match</Select.Option>
              <Select.Option value="CLOSE_MATCH">Close Match</Select.Option>
              <Select.Option value="BROAD_MATCH">Broad Match</Select.Option>
              <Select.Option value="NARROW_MATCH">Narrow Match</Select.Option>
              <Select.Option value="RELATED_MATCH">Related Match</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="confidence"
            label="Confidence"
            rules={[{ required: true, message: 'Confidence is required' }]}
          >
            <InputNumber
              min={0}
              max={1}
              step={0.05}
              style={{ width: '100%' }}
              placeholder="0.75"
            />
          </Form.Item>

          <Form.Item
            name="evidenceKind"
            label="Evidence Kind"
            rules={[{ required: true, message: 'Evidence kind is required' }]}
          >
            <Select placeholder="Select evidence kind">
              <Select.Option value="ADMIN_UI">Admin UI</Select.Option>
              <Select.Option value="AUTOMATED">Automated</Select.Option>
              <Select.Option value="MANUAL_REVIEW">Manual Review</Select.Option>
              <Select.Option value="EXPERT_JUDGMENT">Expert Judgment</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="evidenceSource"
            label="Evidence Source"
            rules={[{ required: true, message: 'Evidence source is required' }]}
          >
            <Input placeholder="Manual proposal from Cell Inspector" />
          </Form.Item>

          <Form.Item
            name="note"
            label="Note"
          >
            <Input.TextArea 
              rows={4} 
              placeholder="Additional notes about this UFO claim..."
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<RocketOutlined />}>
                Submit UFO Claim
              </Button>
              <Button onClick={() => {
                setShowUFOModal(false);
                ufoForm.resetFields();
              }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Modal>
  );
};

export default CellInspector;