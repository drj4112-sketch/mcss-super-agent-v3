export const metadata = {
  title: "MCSS Super Agent v3",
  description: "Professional AI Trading System — Multi-Agent",
};
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#030810" }}>{children}</body>
    </html>
  );
}
