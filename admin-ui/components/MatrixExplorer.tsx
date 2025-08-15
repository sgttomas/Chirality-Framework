'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { Table, Select, Space, Tag, Button, Tooltip, Badge, Card, Row, Col } from 'antd';
import { ReloadOutlined, WarningOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
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
}

const MatrixExplorer: React.FC = () => {
  const [station, setStation] = useState('Requirements');
  const [matrix, setMatrix] = useState('C');
  const [rows, setRows] = useState([0, 1, 2]);
  const [cols, setCols] = useState([0, 1, 2, 3]);
  const [cellData, setCellData] = useState<Record<string, CellData>>({});
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [valleySummary, setValleySummary] = useState('');

  // Generate valley summary with current station bracketed
  const generateValleySummary = (stations: any[], currentIndex: number) => {
    const names = stations.map((s, i) => 
      i === currentIndex ? `[${s.name}]` : s.name
    );
    return `Semantic Valley: ${names.join(' → ')}`;
  };

  // Fetch all cells in the range
  useEffect(() => {
    const fetchCells = async () => {
      const newCellData: Record<string, CellData> = {};
      
      for (const i of rows) {
        for (const j of cols) {
          try {
            const { data } = await apolloClient.query({
              query: CELL_PREVIEW,
              variables: { station, matrix, row: i, col: j },
              fetchPolicy: 'network-only',
            });
            
            const cell = data?.matrix?.cell;
            if (cell) {
              newCellData[`${i},${j}`] = {
                row: i,
                col: j,
                stage: cell.stage || 'pending',
                value: cell.value || '',
                rowLabel: cell.labels?.rowLabel || `Row ${i}`,
                colLabel: cell.labels?.colLabel || `Col ${j}`,
              };
            }
            
            // Update valley summary from first successful query
            if (data?.valley && Object.keys(newCellData).length === 1) {
              const currentStation = STATIONS.findIndex(s => s.id === station);
              setValleySummary(generateValleySummary(data.valley.stations || STATIONS, currentStation));
            }
          } catch (error) {
            console.error(`Failed to fetch cell [${i},${j}]:`, error);
          }
        }
      }
      
      setCellData(newCellData);
    };

    fetchCells();
    
    if (autoRefresh) {
      const interval = setInterval(fetchCells, 5000);
      return () => clearInterval(interval);
    }
  }, [station, matrix, rows, cols, autoRefresh]);

  const getStageIcon = (stage: string) => {
    if (stage === 'final_resolved') return <CheckCircleOutlined style={{ color: STAGE_COLORS[stage] }} />;
    if (stage === 'error') return <WarningOutlined style={{ color: STAGE_COLORS[stage] }} />;
    if (stage?.startsWith('product:')) return <ClockCircleOutlined style={{ color: '#722ed1' }} />;
    return <ClockCircleOutlined style={{ color: STAGE_COLORS[stage] || '#666' }} />;
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
        <Space direction="vertical" size="small">
          <Tag color="blue">{record.rowLabel}</Tag>
          <span>×</span>
          <Tag color="green">{record.colLabel}</Tag>
        </Space>
      ),
    },
    {
      title: 'Stage',
      dataIndex: 'stage',
      key: 'stage',
      width: 180,
      render: (stage: string) => (
        <Space>
          {getStageIcon(stage)}
          <Tag color={STAGE_COLORS[stage] || 'default'}>{stage}</Tag>
        </Space>
      ),
    },
    {
      title: 'Value Preview',
      dataIndex: 'value',
      key: 'value',
      ellipsis: true,
      render: (value: string) => (
        <Tooltip title={value}>
          <span>{value ? value.substring(0, 100) + '...' : '(empty)'}</span>
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
        </Space>
      ),
    },
  ];

  const dataSource = Object.values(cellData);

  return (
    <div style={{ padding: 24 }}>
      {/* Valley Summary Banner */}
      <Card style={{ marginBottom: 16, background: '#f0f2f5' }}>
        <div style={{ fontSize: 16, fontWeight: 500, textAlign: 'center' }}>
          {valleySummary || 'Semantic Valley: Problem Statement → Requirements → Objectives → Solution Objectives'}
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

          <Col span={4}>
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

          <Col span={4}>
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
        </Space>
      </Card>

      {/* Matrix Grid */}
      <Table
        dataSource={dataSource}
        columns={columns}
        rowKey={(record) => `${record.row},${record.col}`}
        pagination={false}
        size="middle"
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