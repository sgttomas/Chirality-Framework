import { useState } from 'react';
import { Layout, Menu, Typography, Space } from 'antd';
import { 
  TableOutlined, 
  MonitorOutlined, 
  BugOutlined, 
  ControlOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import MatrixExplorer from '../components/MatrixExplorer';
import PipelineConsole from '../components/PipelineConsole';
import PromptStudio from '../components/PromptStudio';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

type PageKey = 'matrix' | 'console' | 'ufo' | 'prompt' | 'health';

export default function Home() {
  const [currentPage, setCurrentPage] = useState<PageKey>('matrix');

  const renderContent = () => {
    switch (currentPage) {
      case 'matrix':
        return <MatrixExplorer />;
      case 'console':
        return <PipelineConsole />;
      case 'ufo':
        return (
          <div style={{ padding: 24 }}>
            <Title level={3}>UFO Claims Desk</Title>
            <p>Coming soon...</p>
          </div>
        );
      case 'prompt':
        return <PromptStudio />;
      case 'health':
        return (
          <div style={{ padding: 24 }}>
            <Title level={3}>Health Monitor</Title>
            <p>Coming soon...</p>
          </div>
        );
      default:
        return <MatrixExplorer />;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
          Chirality Framework - Admin UI
        </div>
      </Header>
      
      <Layout>
        <Sider width={250} theme="light">
          <Menu
            mode="inline"
            selectedKeys={[currentPage]}
            onClick={(e) => setCurrentPage(e.key as PageKey)}
            style={{ height: '100%', borderRight: 0 }}
          >
            <Menu.Item key="matrix" icon={<TableOutlined />}>
              Matrix Explorer
            </Menu.Item>
            <Menu.Item key="console" icon={<MonitorOutlined />}>
              Pipeline Console
            </Menu.Item>
            <Menu.Item key="ufo" icon={<BugOutlined />}>
              UFO Claims Desk
            </Menu.Item>
            <Menu.Item key="prompt" icon={<FileTextOutlined />}>
              Prompt Studio
            </Menu.Item>
            <Menu.Item key="health" icon={<ControlOutlined />}>
              Health Monitor
            </Menu.Item>
          </Menu>
        </Sider>
        
        <Layout style={{ padding: 0 }}>
          <Content style={{ margin: 0, overflow: 'initial' }}>
            {renderContent()}
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
}