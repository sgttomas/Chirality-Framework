import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html><body style={{ fontFamily: "ui-sans-serif, system-ui" }}>
      <div style={{ maxWidth: 1100, margin: "24px auto", padding: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Chirality Admin — Phase 1 Workbench</h1>
        {children}
      </div>
    </body></html>
  );
}