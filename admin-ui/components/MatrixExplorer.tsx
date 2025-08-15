'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Table, Select, Space, Tag, Button, Tooltip, Card, Row, Col, message } from 'antd';
import { ReloadOutlined, WarningOutlined, CheckCircleOutlined, ClockCircleOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useApolloClient } from '@apollo/client';
import { CELL_PREVIEW } from '../lib/queries';
import CellInspector from './CellInspector';

const { Option } = Select;

const STATIONS = [
  { id: 'Problem Statement', name: 'Problem Statement', matrices: ['A'] },
  { id: 'Decisions', name: 'Decisions', matrices: ['B'] },
  { id: 'Truncated Decisions', name: 'Truncated Decisions', matrices: ['J'] },
  { id: 'Requirements', name: 'Requirements', matrices: ['C'] },
  { id: 'Objectives', name: 'Objectives', matrices: ['F'] },
  { id: 'Solution Objectives', name: 'Solution Objectives', matrices: ['D'] },
];

const STAGE_COLORS = {
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

interface CellData {
  row: number;
  col: number;
  stage: string;
  value: string;
  rowLabel: string;
  colLabel: string;
  createdAt?: string;
  modelId?: string;
}

const MatrixExplorer: React.FC = () => {
  const client = useApolloClient();
  const [station, setStation] = useState('Requirements');
  const [matrix, setMatrix] = useState('C');
  const [rows, setRows] = useState([0, 1, 2]);
  const [cols, setCols] = useState([0, 1, 2, 3]);
  const [cellData, setCellData] = useState<Record<string, CellData>>({});
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [loading, setLoading] = useState(false);

  // Generate valley summary with current station bracketed
  const generateValleySummary = (stationId: string) => {
    const names = STATIONS.map(s => s.name);
    const idx = STATIONS.findIndex(s => s.id === stationId);
    if (idx >= 0) names[idx] = `[${names[idx]}]`;
    return `Semantic Valley: ${names.join(' → ')}`;
  };

  // Fetch all cells in the range
  const fetchCells = async () => {
    setLoading(true);
    try {
      const results: Record<string, CellData> = {};
      await Promise.all(
        rows.flatMap(i => cols.map(async j => {
          try {
            const { data } = await client.query({
              query: CELL_PREVIEW,
              variables: { station, matrix, row: i, col: j },
              fetchPolicy: 'network-only',
            });
            
            const cell = data?.matrix?.cell;
            const matrixData = data?.matrix;
            const rowLabels = matrixData?.rowLabels ?? [];
            const colLabels = matrixData?.colLabels ?? [];
            
            const rowLabel = cell?.labels?.rowLabel ?? rowLabels[i] ?? '(unlabeled)';
            const colLabel = cell?.labels?.colLabel ?? colLabels[j] ?? '(unlabeled)';
            const stage = cell?.stage ?? '(none)';
            const value = cell?.value ?? '';
            
            // Extract trace metadata if available
            const createdAt = cell?.traces?.[0]?.createdAt;
            const modelId = cell?.traces?.[0]?.modelId;
            
            results[`${i},${j}`] = {
              row: i,
              col: j,
              rowLabel: String(rowLabel),
              colLabel: String(colLabel),
              stage,
              value,
              createdAt,
              modelId
            };
          } catch (error) {
            console.error(`Failed to fetch cell [${i},${j}]:`, error);
          }
        }))
      );
      setCellData(results);
    } catch (e: any) {
      console.error(e);
      message.error(e?.message || 'Failed to load cells');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCells(); }, [station, matrix, JSON.stringify(rows), JSON.stringify(cols)]);
  
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchCells, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh, station, matrix, JSON.stringify(rows), JSON.stringify(cols)]);

  const getStageIcon = (stage?: string | null) => {
    if (stage === 'final_resolved') return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    if (stage === 'error') return <WarningOutlined style={{ color: '#ff4d4f' }} />;
    if (stage?.startsWith('product:')) return <ClockCircleOutlined style={{ color: '#722ed1' }} />;
    return <ClockCircleOutlined style={{ color: '#8c8c8c' }} />;
  };

  const createStageTag = (stage: string, modelId?: string, createdAt?: string) => (
    <Tooltip title={
      <div>
        <div>Stage: {stage}</div>
        {modelId && <div>Model: {modelId}</div>}
        {createdAt && <div>At: {createdAt}</div>}
      </div>
    }>
      <Tag color={STAGE_COLORS[stage] || 'default'}>{stage}</Tag>
    </Tooltip>
  );

  const handleRetry = async (row: number, col: number) => {
    // Wire to orchestrator: POST /api/orchestrate/run
    message.loading({ content: `Rebuilding ${station}/${matrix}[${row},${col}]…`, key: 'rebuild' });
    setSelectedCell({ row, col });
    
    try {
      const response = await fetch('/api/orchestrate/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: 'generate-c', // This would be dynamic based on matrix
          station,
          matrix,
          row,
          col
        })
      });
      
      if (response.ok) {
        message.success({ content: 'Cell rebuild initiated', key: 'rebuild' });
        // Refresh this specific cell after a delay
        setTimeout(fetchCells, 1000);
      } else {
        message.error({ content: 'Failed to start rebuild', key: 'rebuild' });
      }
    } catch (error) {
      message.error({ content: 'Network error during rebuild', key: 'rebuild' });
    }
  };

  const columns = [
    {
      title: 'Cell',
      dataIndex: 'coord',
      key: 'coord',
      width: 100,
      render: (_: any, record: CellData) => (
        <Space>
          <code>[{record.row},{record.col}]</code>
        </Space>
      ),
    },
    {
      title: 'Labels',
      dataIndex: 'labels',
      key: 'labels',
      render: (_: any, record: CellData) => (
        <Space size="small">
          <Tag color="blue">{record.rowLabel || '(unlabeled)'}</Tag>
          <span>×</span>
          <Tag color="green">{record.colLabel || '(unlabeled)'}</Tag>
        </Space>
      ),
    },
    {
      title: 'Stage',
      dataIndex: 'stage',
      key: 'stage',
      width: 180,
      render: (_: any, record: CellData) => (
        <Space>
          {getStageIcon(record.stage)}
          {createStageTag(record.stage, record.modelId, record.createdAt)}
        </Space>
      ),
    },
    {
      title: 'Value Preview',
      dataIndex: 'value',
      key: 'value',
      ellipsis: true,
      render: (value: string) => (
        <Tooltip title={value || '(empty)'}>
          <span>{value ? `${value.slice(0, 100)}…` : '(empty)'}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_: any, record: CellData) => (
        <Space>
          <Button 
            type="link" 
            size="small"
            onClick={() => setSelectedCell({ row: record.row, col: record.col })}
          >
            Inspect
          </Button>
          <Button 
            type="link" 
            size="small" 
            icon={<ThunderboltOutlined />} 
            onClick={() => handleRetry(record.row, record.col)}
          >
            Rebuild
          </Button>
        </Space>
      ),
    },
  ];

  const dataSource = useMemo(() => Object.values(cellData), [cellData]);

  return (
    <div style={{ padding: 24 }}>
      {/* Valley Summary Banner */}
      <Card style={{ marginBottom: 16, background: '#f0f2f5' }}>
        <div style={{ fontSize: 16, fontWeight: 500, textAlign: 'center' }}>
          {generateValleySummary(station)}
        </div>
      </Card>

      {/* Controls */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col span={4}>
            <Select
              value={station}
              onChange={(value) => {
                setStation(value);
                const stationObj = STATIONS.find(s => s.id === value);
                if (stationObj && stationObj.matrices.length > 0) {
                  setMatrix(stationObj.matrices[0]);
                }
              }}
              style={{ width: '100%' }}
            >
              {STATIONS.map(s => (
                <Option key={s.id} value={s.id}>{s.name}</Option>
              ))}
            </Select>
          </Col>
          
          <Col span={3}>
            <Select
              value={matrix}
              style={{ width: '100%' }}
              onChange={setMatrix}
            >
              {STATIONS.find(s => s.id === station)?.matrices.map(m => (
                <Option key={m} value={m}>Matrix {m}</Option>
              ))}
            </Select>
          </Col>

          <Col span={5}>
            <Select
              mode="multiple"
              value={rows}
              onChange={setRows}
              placeholder="Rows"
              style={{ width: '100%' }}
            >
              {[0, 1, 2].map(i => (
                <Option key={i} value={i}>Row {i}</Option>
              ))}
            </Select>
          </Col>

          <Col span={5}>
            <Select
              mode="multiple"
              value={cols}
              onChange={setCols}
              placeholder="Cols"
              style={{ width: '100%' }}
            >
              {[0, 1, 2, 3].map(j => (
                <Option key={j} value={j}>Col {j}</Option>
              ))}
            </Select>
          </Col>

          <Col span={3}>
            <Button
              type={autoRefresh ? 'primary' : 'default'}
              icon={<ReloadOutlined spin={autoRefresh} />}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? 'Live' : 'Static'}
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Stage Legend */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <span style={{ fontWeight: 500 }}>Stage Legend:</span>
          {Object.entries(STAGE_COLORS).map(([stage, color]) => (
            <Tag key={stage} color={color}>{stage}</Tag>
          ))}
          <Tag color="#722ed1">product:k</Tag>
        </Space>
      </Card>

      {/* Matrix Grid */}
      <Table
        loading={loading}
        dataSource={dataSource}
        columns={columns as any}
        rowKey={(record) => `${record.row},${record.col}`}
        pagination={false}
        size="middle"
        scroll={{ y: 560 }}
      />

      {/* Cell Inspector Modal */}
      {selectedCell && (
        <CellInspector
          station={station}
          matrix={matrix}
          row={selectedCell.row}
          col={selectedCell.col}
          onClose={() => setSelectedCell(null)}
        />
      )}
    </div>
  );
};

export default MatrixExplorer;