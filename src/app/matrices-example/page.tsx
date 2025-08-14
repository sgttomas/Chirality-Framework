'use client';
import { useQuery } from '@apollo/client';
import { apolloClient } from '@/lib/apollo';
import { LatestVerificationDoc } from '@/graphql/queries/matrix';
import { ApolloProvider } from '@apollo/client';

function Matrices() {
  const { data, loading, error } = useQuery(LatestVerificationDoc);
  if (loading) return <p>Loading…</p>;
  if (error) return <pre>{String(error)}</pre>;

  const c = data?.latestComponentByStation;
  if (!c) return <p>No verification matrix found.</p>;

  return (
    <div>
      <h2>{c.name}</h2>
      <table>
        <thead>
          <tr>
            <th />
            {c.colLabels.map((h: string) => <th key={h}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: c.shape[0] }).map((_, r) => (
            <tr key={r}>
              <th>{c.rowLabels[r]}</th>
              {c.cells
                .filter((cell: any) => cell.row === r)
                .sort((a: any, b: any) => a.col - b.col)
                .map((cell: any) => <td key={`${cell.row}-${cell.col}`}>{cell.resolved}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Page() {
  return (
    <ApolloProvider client={apolloClient}>
      <Matrices />
    </ApolloProvider>
  );
}