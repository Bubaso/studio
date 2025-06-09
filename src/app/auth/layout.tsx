
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <h1>Auth Layout (Ultra Basit)</h1>
      {children}
    </div>
  );
}
