'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, Form, Select, Button, Space, Switch, InputNumber, Alert, List, Tag, Row, Col } from 'antd';
import { PlayCircleOutlined, StopOutlined, ClearOutlined } from '@ant-design/icons';

const { Option } = Select;

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
    if (event === 'stage_write') {
      if (stage === 'error') return 'red';
      if (stage === 'final_resolved') return 'green';
      return 'blue';
    }
    if (event === 'ufo_proposed') return 'purple';
    if (event === 'verify') return 'orange';
    if (event === 'job_error') return 'red';
    return 'default';
  };

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

  // Calculate stats from logs
  const stats = React.useMemo(() => {
    const stageWrites = logs.filter(l => l.event === 'stage_write');
    const errors = stageWrites.filter(l => l.stage === 'error');
    const deduped = stageWrites.filter(l => l.deduped);
    const totalLatency = stageWrites.reduce((sum, l) => sum + (l.latencyMs || 0), 0);
    const avgLatency = stageWrites.length > 0 ? Math.round(totalLatency / stageWrites.length) : 0;
    
    return {
      total: stageWrites.length,
      errors: errors.length,
      deduped: deduped.length,
      avgLatency,
      successRate: stageWrites.length > 0 
        ? Math.round(((stageWrites.length - errors.length) / stageWrites.length) * 100)
        : 0,
    };
  }, [logs]);

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
                <div>Total Writes: {stats.total}</div>
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
              </Space>
            }
            bodyStyle={{ height: 600, overflow: 'auto', padding: 8 }}
          >
            <List
              size="small"
              dataSource={logs}
              renderItem={(log) => (
                <List.Item key={log.id} style={{ padding: '4px 0' }}>
                  <Space>
                    <span style={{ fontSize: 11, color: '#666' }}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <Tag color={getLogColor(log.event, log.stage)}>
                      {log.event}
                    </Tag>
                    <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {formatLogEntry(log)}
                    </span>
                  </Space>
                </List.Item>
              )}
            />
            <div ref={logsEndRef} />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default PipelineConsole;