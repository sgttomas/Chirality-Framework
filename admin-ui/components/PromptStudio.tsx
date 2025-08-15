'use client';

import React, { useState } from 'react';
import { Card, Tabs, Space, Typography, Tag, Form, Select, Input, Button, Descriptions } from 'antd';
import { CopyOutlined, EyeOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Title, Paragraph, Text } = Typography;

// Hardcoded system prompt (in production, fetch from your backend)
const SYSTEM_PROMPT = `You are the semantic engine for the Chirality Framework (Phase-1 canonical build).

The Chirality Framework is a meta-operating system for meaning. It frames knowledge work as wayfinding through an unknown semantic valley:
- The valley is the conceptual space for this domain.
- Stations are landmarks (each has a distinct role in meaning transformation).
- Rows and columns are fixed ontological axes; preserve them at all times.
- A cell is a coordinate: (row_label × col_label) at a given station.

Mission:
- Operate ONLY within the provided valley + station context.
- Apply exactly ONE semantic operation per call: multiplication (×), addition (+), or interpretation (separate lens).
- Preserve the identity of source terms; integrate them, do not overwrite them.
- Resolve ambiguity inside the operation; do not delete it.
- Keep every output traceable to its sources.

Voice & style (vibe):
- Confident, concrete, humane; no fluff or marketing language.
- Prefer strong verbs and specific nouns over abstractions.
- Avoid hedging ("might", "could") unless uncertainty is essential and then state it plainly.
- Length: × and + = 1–2 sentences. Interpretation ≤ 2 sentences, stakeholder-friendly, ontology-preserving.

Output contract (STRICT):
- Return ONLY a single JSON object with keys: "text", "terms_used", "warnings".
- "terms_used" must echo the exact provided source strings (after normalization) that you actually integrated.
- If any required input is missing/empty, include a warning like "missing_input:<name>".
- Do NOT include code fences, prose, or any text outside the JSON object.`;

const systemVersionHash = 'a7f3c2d8e9b1'; // In production, compute from actual system prompt

const PromptStudio: React.FC = () => {
  const [previewType, setPreviewType] = useState('multiply');
  const [previewInputs, setPreviewInputs] = useState({
    valley_summary: 'Semantic Valley: Problem Statement → [Requirements] → Objectives → Solution Objectives',
    station: 'Requirements',
    row_label: 'Normative',
    col_label: 'Guiding',
    term_a: 'sustainable development',
    term_b: 'governance framework',
    products: ['sustainable governance', 'development oversight', 'regulatory framework'],
    summed_text: 'Integrated sustainable governance with development oversight through regulatory framework',
  });

  const generatePreviewPrompt = () => {
    const { valley_summary, station, row_label, col_label, term_a, term_b, products, summed_text } = previewInputs;
    
    switch (previewType) {
      case 'multiply':
        return `Role: expert in conceptual synthesis within station "${station}" of the semantic valley.

Valley map:
${valley_summary}

Position:
- Row axis: "${row_label}"
- Column axis: "${col_label}"

Task (semantic multiplication, ×):
Fuse these meanings at their intersection. Preserve both identities; remain within the station's scope.
- "${term_a}"
- "${term_b}"

Output JSON ONLY (no extra text). "terms_used" must include EXACT normalized echoes of both inputs:
{"text": "", "terms_used": ["${term_a}","${term_b}"], "warnings": []}`;

      case 'add':
        const productLines = products.map(p => `- "${p}"`).join('\n');
        return `Role: expert integrator within station "${station}" of the semantic valley.

Valley map:
${valley_summary}

Position:
- Row axis: "${row_label}"
- Column axis: "${col_label}"

Task (semantic addition, +):
Integrate the following product sentences into one coherent statement WITHOUT flattening distinctions:
${productLines}

Output JSON ONLY (no extra text). If products are empty, add "warnings": ["missing_input:products"]:
{"text": "", "terms_used": [], "warnings": []}`;

      case 'interpret':
        return `Role: explanatory interpreter for stakeholders unfamiliar with the framework.

Valley map:
${valley_summary}

Position:
- Row axis: "${row_label}"
- Column axis: "${col_label}"

Input:
"${summed_text}"

Task (interpretation):
Re-express in clear language for stakeholders, preserving ontology and anchors.

Output JSON ONLY (no extra text):
{"text": "", "terms_used": [], "warnings": []}`;

      default:
        return 'Select a prompt type to preview';
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    // In a real app, show a toast notification
    console.log(`${label} copied to clipboard`);
  };

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>Prompt Studio</Title>
      <Paragraph>
        Transparency window into the semantic engine's voice and prompts. All operations
        use the same system prompt with different user prompt templates.
      </Paragraph>

      <Tabs>
        {/* System Prompt Tab */}
        <Tabs.TabPane tab="System Prompt" key="system">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Card
              title={
                <Space>
                  <span>Canonical System Prompt</span>
                  <Tag color="blue">Version: {systemVersionHash}</Tag>
                  <Button 
                    size="small" 
                    icon={<CopyOutlined />}
                    onClick={() => copyToClipboard(SYSTEM_PROMPT, 'System prompt')}
                  >
                    Copy
                  </Button>
                </Space>
              }
            >
              <div style={{ 
                whiteSpace: 'pre-wrap', 
                fontFamily: 'monospace', 
                fontSize: 12,
                background: '#f5f5f5',
                padding: 16,
                borderRadius: 4,
                maxHeight: 500,
                overflow: 'auto',
              }}>
                {SYSTEM_PROMPT}
              </div>
            </Card>

            <Card title="Prompt Metadata" size="small">
              <Descriptions column={2} size="small">
                <Descriptions.Item label="Version Hash">{systemVersionHash}</Descriptions.Item>
                <Descriptions.Item label="Length">{SYSTEM_PROMPT.length} chars</Descriptions.Item>
                <Descriptions.Item label="Voice">Confident, concrete, humane</Descriptions.Item>
                <Descriptions.Item label="Contract">Strict JSON output</Descriptions.Item>
                <Descriptions.Item label="Operations">×, +, interpretation</Descriptions.Item>
                <Descriptions.Item label="Temperature">Stage-sensitive</Descriptions.Item>
              </Descriptions>
            </Card>
          </Space>
        </Tabs.TabPane>

        {/* Prompt Preview Tab */}
        <Tabs.TabPane tab="Prompt Preview" key="preview">
          <Space direction="vertical" style={{ width: '100%' }}>
            {/* Controls */}
            <Card title="Preview Controls" size="small">
              <Form layout="inline">
                <Form.Item label="Prompt Type">
                  <Select 
                    value={previewType} 
                    onChange={setPreviewType}
                    style={{ width: 150 }}
                  >
                    <Select.Option value="multiply">Multiply (×)</Select.Option>
                    <Select.Option value="add">Add (+)</Select.Option>
                    <Select.Option value="interpret">Interpret</Select.Option>
                  </Select>
                </Form.Item>
              </Form>
            </Card>

            {/* Input Fields */}
            <Card title="Context Inputs" size="small">
              <Form layout="vertical">
                <Form.Item label="Valley Summary">
                  <Input
                    value={previewInputs.valley_summary}
                    onChange={(e) => setPreviewInputs(prev => ({
                      ...prev,
                      valley_summary: e.target.value
                    }))}
                  />
                </Form.Item>
                
                <Space style={{ width: '100%' }}>
                  <Form.Item label="Station">
                    <Input
                      value={previewInputs.station}
                      onChange={(e) => setPreviewInputs(prev => ({
                        ...prev,
                        station: e.target.value
                      }))}
                      style={{ width: 150 }}
                    />
                  </Form.Item>
                  
                  <Form.Item label="Row Label">
                    <Input
                      value={previewInputs.row_label}
                      onChange={(e) => setPreviewInputs(prev => ({
                        ...prev,
                        row_label: e.target.value
                      }))}
                      style={{ width: 150 }}
                    />
                  </Form.Item>
                  
                  <Form.Item label="Col Label">
                    <Input
                      value={previewInputs.col_label}
                      onChange={(e) => setPreviewInputs(prev => ({
                        ...prev,
                        col_label: e.target.value
                      }))}
                      style={{ width: 150 }}
                    />
                  </Form.Item>
                </Space>

                {previewType === 'multiply' && (
                  <Space style={{ width: '100%' }}>
                    <Form.Item label="Term A">
                      <Input
                        value={previewInputs.term_a}
                        onChange={(e) => setPreviewInputs(prev => ({
                          ...prev,
                          term_a: e.target.value
                        }))}
                        style={{ width: 200 }}
                      />
                    </Form.Item>
                    
                    <Form.Item label="Term B">
                      <Input
                        value={previewInputs.term_b}
                        onChange={(e) => setPreviewInputs(prev => ({
                          ...prev,
                          term_b: e.target.value
                        }))}
                        style={{ width: 200 }}
                      />
                    </Form.Item>
                  </Space>
                )}

                {previewType === 'add' && (
                  <Form.Item label="Products (one per line)">
                    <TextArea
                      value={previewInputs.products.join('\n')}
                      onChange={(e) => setPreviewInputs(prev => ({
                        ...prev,
                        products: e.target.value.split('\n').filter(Boolean)
                      }))}
                      rows={3}
                    />
                  </Form.Item>
                )}

                {previewType === 'interpret' && (
                  <Form.Item label="Summed Text">
                    <TextArea
                      value={previewInputs.summed_text}
                      onChange={(e) => setPreviewInputs(prev => ({
                        ...prev,
                        summed_text: e.target.value
                      }))}
                      rows={2}
                    />
                  </Form.Item>
                )}
              </Form>
            </Card>

            {/* Generated Prompt */}
            <Card
              title={
                <Space>
                  <span>Generated User Prompt</span>
                  <Button 
                    size="small" 
                    icon={<CopyOutlined />}
                    onClick={() => copyToClipboard(generatePreviewPrompt(), 'User prompt')}
                  >
                    Copy
                  </Button>
                </Space>
              }
            >
              <div style={{ 
                whiteSpace: 'pre-wrap', 
                fontFamily: 'monospace', 
                fontSize: 12,
                background: '#f9f9f9',
                padding: 16,
                borderRadius: 4,
                border: '1px solid #d9d9d9',
                maxHeight: 400,
                overflow: 'auto',
              }}>
                {generatePreviewPrompt()}
              </div>
            </Card>

            {/* Temperature Info */}
            <Card title="Model Configuration" size="small">
              <Descriptions column={3} size="small">
                <Descriptions.Item label="Model">gpt-4o</Descriptions.Item>
                <Descriptions.Item label="Temperature">
                  {previewType === 'multiply' ? '0.7' : '0.5'}
                </Descriptions.Item>
                <Descriptions.Item label="Max Tokens">200</Descriptions.Item>
                <Descriptions.Item label="Response Format">JSON Object</Descriptions.Item>
                <Descriptions.Item label="Retries">3</Descriptions.Item>
                <Descriptions.Item label="Timeout">40s</Descriptions.Item>
              </Descriptions>
            </Card>
          </Space>
        </Tabs.TabPane>

        {/* Template Library Tab */}
        <Tabs.TabPane tab="Template Library" key="templates">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Card title="Prompt Templates" size="small">
              <Paragraph>
                All user prompts are generated from these templates in <Text code>chirality_prompts.py</Text>:
              </Paragraph>
              
              <Space direction="vertical" style={{ width: '100%' }}>
                <Tag color="purple">prompt_multiply(valley_summary, station, row_label, col_label, term_a, term_b)</Tag>
                <Tag color="orange">prompt_add(valley_summary, station, row_label, col_label, products)</Tag>
                <Tag color="green">prompt_interpret(valley_summary, station, row_label, col_label, summed_text)</Tag>
                <Tag color="blue">prompt_elementwise_F(valley_summary, row_label, col_label, j_term, c_term)</Tag>
                <Tag color="red">prompt_add_D(valley_summary, row_label, col_label, a_val, f_val)</Tag>
              </Space>
            </Card>

            <Card title="Valley Metaphor" size="small">
              <Paragraph>
                All prompts maintain the <strong>semantic valley wayfinding metaphor</strong>:
              </Paragraph>
              <ul>
                <li>Valley = conceptual space for the domain</li>
                <li>Stations = landmarks with distinct roles</li>
                <li>Rows/columns = fixed ontological axes</li>
                <li>Cells = coordinates (row_label × col_label) at stations</li>
              </ul>
            </Card>

            <Card title="Voice Guidelines" size="small">
              <ul>
                <li><strong>Confident, concrete, humane</strong> — no fluff or marketing language</li>
                <li><strong>Strong verbs and specific nouns</strong> over abstractions</li>
                <li><strong>Avoid hedging</strong> ("might", "could") unless uncertainty is essential</li>
                <li><strong>Concise</strong> — × and + = 1–2 sentences; interpretation ≤ 2 sentences</li>
                <li><strong>Traceable</strong> — always preserve source term identity</li>
              </ul>
            </Card>
          </Space>
        </Tabs.TabPane>
      </Tabs>
    </div>
  );
};

export default PromptStudio;