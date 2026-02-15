export default function DiagramSVG({ children, viewBox = '0 0 700 350' }) {
  return (
    <div className="diagram-container">
      <svg viewBox={viewBox} xmlns="http://www.w3.org/2000/svg">
        {children}
      </svg>
    </div>
  );
}
