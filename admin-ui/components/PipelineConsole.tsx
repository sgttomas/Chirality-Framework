'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Card, Form, Select, Button, Space, Switch, InputNumber, Alert, List, Tag, Row, Col, Checkbox, Progress } from 'antd';
import { PlayCircleOutlined, StopOutlined, ClearOutlined, FilterOutlined } from '@ant-design/icons';

const { Option } = Select;

// Stage colors consistent with MatrixExplorer and CellInspector
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

// Command presets for common workflows
const COMMAND_PRESETS = {
  'Test Single Cell': { rows: [0], cols: [0] },
  'Test Row 0': { rows: [0], cols: [0, 1, 2, 3] },
  'Test Requirements': { rows: [0, 1, 2], cols: [0, 1, 2, 3] },
  'Single Column': { rows: [0, 1, 2], cols: [0] },
  'Quick Test': { rows: [0, 1], cols: [0, 1] },
};

interface LogEntry {
  id: string;
  timestamp: string;
  event: string;
  station?: string;
  matrix?: string;
  i?: number;
  j?: number;
  stage?: string;
  version?: number;
  deduped?: boolean;
  latencyMs?: number;
  modelId?: string;
  message?: string;
}

const PipelineConsole: React.FC = () => {
  const [form] = Form.useForm();
  const [running, setRunning] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logFilters, setLogFilters] = useState<string[]>(['stage_write', 'ufo_proposed', 'verify', 'job_error', 'job_complete']);
  const [showFilters, setShowFilters] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const startPipeline = async (values: any) => {
    try {
      // Build args from form values
      const args: any = {
        api_base: process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:8080',
      };
      
      if (values.rows) args.rows = values.rows.join(',');
      if (values.cols) args.cols = values.cols.join(',');
      if (values.ufo_propose) args.ufo_propose = true;
      if (values.dry_run) args.dry_run = true;
      if (values.stop_on_error) args.stop_on_error = true;
      if (values.log_json) args.log_json = true;
      if (values.spec) args.spec = values.spec;
      
      const response = await fetch('/api/orchestrate/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cmd: values.command,
          args,
        }),
      });
      
      const data = await response.json();
      setJobId(data.jobId);
      setRunning(true);
      
      // Start SSE connection for logs
      const eventSource = new EventSource(`/api/orchestrate/logs/${data.jobId}`);
      eventSourceRef.current = eventSource;
      
      eventSource.onmessage = (event) => {
        try {
          const logData = JSON.parse(event.data);
          const entry: LogEntry = {
            id: `${Date.now()}-${Math.random()}`,
            timestamp: new Date().toISOString(),
            ...logData,
          };
          setLogs(prev => [...prev, entry]);
          
          // Check if job completed
          if (logData.event === 'job_complete' || logData.event === 'job_error') {
            setRunning(false);
            eventSource.close();
          }
        } catch (error) {
          console.error('Failed to parse log:', error);
        }
      };
      
      eventSource.onerror = () => {
        setRunning(false);
        eventSource.close();
      };
      
    } catch (error) {
      console.error('Failed to start pipeline:', error);
      setRunning(false);
    }
  };

  const stopPipeline = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setRunning(false);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const getLogColor = (event: string, stage?: string) => {
    if (event === 'stage_write' && stage) {
      return STAGE_COLORS[stage] || '#1890ff';
    }
    if (event === 'ufo_proposed') return '#722ed1';
    if (event === 'verify') return '#fa8c16';
    if (event === 'job_error') return '#f5222d';
    if (event === 'job_complete') return '#52c41a';
    return 'default';
  };

  const applyPreset = (presetName: string) => {
    const preset = COMMAND_PRESETS[presetName];
    if (preset) {
      form.setFieldsValue({
        rows: preset.rows,
        cols: preset.cols,
      });
    }
  };

  // Filtered logs based on selected filters
  const filteredLogs = useMemo(() => {
    return logs.filter(log => logFilters.includes(log.event));
  }, [logs, logFilters]);

  const formatLogEntry = (log: LogEntry) => {
    if (log.event === 'stage_write') {
      const dedup = log.deduped ? ' (deduped)' : '';
      const latency = log.latencyMs ? ` ${log.latencyMs}ms` : '';
      return `${log.station}/${log.matrix}[${log.i},${log.j}] ${log.stage} → v${log.version}${dedup}${latency}`;
    }
    if (log.event === 'ufo_proposed') {
      return `UFO proposed for ${log.station}/${log.matrix}[${log.i},${log.j}]`;
    }
    if (log.message) {
      return log.message;
    }
    return JSON.stringify(log);
  };

  // Calculate stats and progress from logs
  const stats = React.useMemo(() => {
    const stageWrites = logs.filter(l => l.event === 'stage_write');
    const errors = stageWrites.filter(l => l.stage === 'error');
    const deduped = stageWrites.filter(l => l.deduped);
    const completed = stageWrites.filter(l => l.stage === 'final_resolved');
    const totalLatency = stageWrites.reduce((sum, l) => sum + (l.latencyMs || 0), 0);
    const avgLatency = stageWrites.length > 0 ? Math.round(totalLatency / stageWrites.length) : 0;
    
    // Calculate expected cells based on current form values
    const formValues = form.getFieldsValue();
    const expectedCells = (formValues.rows?.length || 0) * (formValues.cols?.length || 0);
    const progressPercent = expectedCells > 0 ? Math.round((completed.length / expectedCells) * 100) : 0;
    
    return {
      total: stageWrites.length,
      errors: errors.length,
      deduped: deduped.length,
      completed: completed.length,
      expectedCells,
      progressPercent,
      avgLatency,
      successRate: stageWrites.length > 0 
        ? Math.round(((stageWrites.length - errors.length) / stageWrites.length) * 100)
        : 0,
    };
  }, [logs, form]);

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={16}>
        {/* Controls */}
        <Col span={8}>
          <Card title="Pipeline Controls">
            <Form
              form={form}
              layout="vertical"
              onFinish={startPipeline}
              initialValues={{
                command: 'generate-c',
                rows: [0, 1, 2],
                cols: [0, 1, 2, 3],
                spec: 'NORMATIVE_Chirality_Framework_14.2.1.1.txt',
              }}
            >
              <Form.Item name="command" label="Command">
                <Select disabled={running}>
                  <Option value="push-axioms">Push Axioms (A, B, J)</Option>
                  <Option value="generate-c">Generate C (Requirements)</Option>
                  <Option value="generate-f">Generate F (Objectives)</Option>
                  <Option value="generate-d">Generate D (Solution Objectives)</Option>
                  <Option value="verify-stages">Verify Stages</Option>
                </Select>
              </Form.Item>

              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) => 
                  prevValues.command !== currentValues.command
                }
              >
                {({ getFieldValue }) => 
                  getFieldValue('command') === 'push-axioms' ? (
                    <Form.Item name="spec" label="Spec File">
                      <Select disabled={running}>
                        <Option value="NORMATIVE_Chirality_Framework_14.2.1.1.txt">
                          NORMATIVE_Chirality_Framework_14.2.1.1.txt
                        </Option>
                      </Select>
                    </Form.Item>
                  ) : null
                }
              </Form.Item>

              {/* Slice Presets */}
              <Form.Item label="Quick Presets">
                <Select 
                  placeholder="Select a preset..."
                  disabled={running}
                  onChange={applyPreset}
                  value={undefined}
                >
                  {Object.keys(COMMAND_PRESETS).map(preset => (
                    <Option key={preset} value={preset}>{preset}</Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item name="rows" label="Rows">
                <Select mode="multiple" disabled={running}>
                  {[0, 1, 2].map(i => (
                    <Option key={i} value={i}>Row {i}</Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item name="cols" label="Columns">
                <Select mode="multiple" disabled={running}>
                  {[0, 1, 2, 3].map(j => (
                    <Option key={j} value={j}>Col {j}</Option>
                  ))}
                </Select>
              </Form.Item>

              <Space direction="vertical" style={{ width: '100%' }}>
                <Form.Item name="ufo_propose" valuePropName="checked" style={{ marginBottom: 8 }}>
                  <Switch disabled={running} /> Propose UFO Claims
                </Form.Item>
                
                <Form.Item name="dry_run" valuePropName="checked" style={{ marginBottom: 8 }}>
                  <Switch disabled={running} /> Dry Run
                </Form.Item>
                
                <Form.Item name="stop_on_error" valuePropName="checked" style={{ marginBottom: 8 }}>
                  <Switch disabled={running} /> Stop on Error
                </Form.Item>
                
                <Form.Item name="log_json" valuePropName="checked" style={{ marginBottom: 8 }}>
                  <Switch disabled={running} /> JSON Logs
                </Form.Item>
              </Space>

              <Form.Item>
                <Space>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    icon={<PlayCircleOutlined />}
                    disabled={running}
                    loading={running}
                  >
                    {running ? 'Running...' : 'Start Pipeline'}
                  </Button>
                  
                  {running && (
                    <Button 
                      danger 
                      icon={<StopOutlined />}
                      onClick={stopPipeline}
                    >
                      Stop
                    </Button>
                  )}
                  
                  <Button 
                    icon={<ClearOutlined />}
                    onClick={clearLogs}
                    disabled={running}
                  >
                    Clear Logs
                  </Button>
                </Space>
              </Form.Item>
            </Form>

            {/* Stats */}
            <Card size="small" title="Statistics" style={{ marginTop: 16 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                {running && stats.expectedCells > 0 && (
                  <>
                    <div>Progress: {stats.completed}/{stats.expectedCells} cells</div>
                    <Progress 
                      percent={stats.progressPercent} 
                      size="small" 
                      status={stats.errors > 0 ? 'exception' : 'active'}
                    />
                  </>
                )}
                <div>Total Writes: {stats.total}</div>
                <div>Completed: <Tag color="green">{stats.completed}</Tag></div>
                <div>Errors: <Tag color="red">{stats.errors}</Tag></div>
                <div>Deduped: <Tag color="orange">{stats.deduped}</Tag></div>
                <div>Success Rate: <Tag color="green">{stats.successRate}%</Tag></div>
                <div>Avg Latency: {stats.avgLatency}ms</div>
              </Space>
            </Card>
          </Card>
        </Col>

        {/* Log Stream */}
        <Col span={16}>
          <Card 
            title={
              <Space>
                <span>Log Stream</span>
                {jobId && <Tag>Job: {jobId.substring(0, 8)}...</Tag>}
                {running && <Tag color="green">LIVE</Tag>}
                <Button 
                  type="text" 
                  size="small" 
                  icon={<FilterOutlined />}
                  onClick={() => setShowFilters(!showFilters)}
                >
                  Filters ({logFilters.length})
                </Button>
              </Space>
            }
            extra={
              <Space>
                <Tag>Showing: {filteredLogs.length}/{logs.length}</Tag>
              </Space>
            }
          >
            {/* Log Filters */}
            {showFilters && (
              <Card size="small" style={{ marginBottom: 8, background: '#fafafa' }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <span style={{ fontWeight: 500 }}>Filter Events:</span>
                  <Checkbox.Group
                    value={logFilters}
                    onChange={setLogFilters}
                    style={{ width: '100%' }}
                  >
                    <Row>
                      <Col span={8}>
                        <Checkbox value="stage_write">Stage Writes</Checkbox>
                      </Col>
                      <Col span={8}>
                        <Checkbox value="ufo_proposed">UFO Proposals</Checkbox>
                      </Col>
                      <Col span={8}>
                        <Checkbox value="verify">Verifications</Checkbox>
                      </Col>
                    </Row>
                    <Row>
                      <Col span={8}>
                        <Checkbox value="job_error">Job Errors</Checkbox>
                      </Col>
                      <Col span={8}>
                        <Checkbox value="job_complete">Job Complete</Checkbox>
                      </Col>
                      <Col span={8}>
                        <Checkbox value="debug">Debug Info</Checkbox>
                      </Col>
                    </Row>
                  </Checkbox.Group>
                </Space>
              </Card>
            )}

            <div style={{ height: showFilters ? 520 : 600, overflow: 'auto', padding: 8 }}>
              <List
                size="small"
                dataSource={filteredLogs}
                renderItem={(log) => (
                  <List.Item key={log.id} style={{ padding: '4px 0' }}>
                    <Space>
                      <span style={{ fontSize: 11, color: '#666' }}>
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <Tag color={getLogColor(log.event, log.stage)}>
                        {log.event}
                      </Tag>
                      {log.event === 'stage_write' && log.stage && (
                        <Tag color={STAGE_COLORS[log.stage] || 'default'} style={{ fontSize: 10 }}>
                          {log.stage}
                        </Tag>
                      )}
                      <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
                        {formatLogEntry(log)}
                      </span>
                    </Space>
                  </List.Item>
                )}
              />
              <div ref={logsEndRef} />
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default PipelineConsole;