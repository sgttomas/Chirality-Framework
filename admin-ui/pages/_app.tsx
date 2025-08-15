import { AppProps } from 'next/app';
import { ApolloProvider } from '@apollo/client';
import { ConfigProvider } from 'antd';
import { apolloClient } from '../lib/apollo-client';
import 'antd/dist/reset.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1890ff',
        },
      }}
    >
      <ApolloProvider client={apolloClient}>
        <Component {...pageProps} />
      </ApolloProvider>
    </ConfigProvider>
  );
}