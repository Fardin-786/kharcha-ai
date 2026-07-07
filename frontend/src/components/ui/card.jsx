export function Card({ children, className = "" }) {
  return (
    <div className={`bg-white rounded-lg shadow border ${className}`}>
      {children}
    </div>
  );
}

export function CardContent({ children, className = "" }) {
  return <div className={className}>{children}</div>;
}