import { useEffect, useRef } from "react";
import mermaid from "mermaid";

export default function ExpenseChart() {
  const chartRef = useRef(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
    });

    if (chartRef.current) {
      mermaid.run({
        nodes: [chartRef.current],
      });
    }
  }, []);

  return (
    <div className="bg-white p-6 rounded-lg shadow mt-8 w-full max-w-md">
      <h2 className="text-xl font-semibold text-gray-700 mb-4 text-center">
        Expense Breakdown
      </h2>

      <div ref={chartRef} className="mermaid flex justify-center">
        {`
pie title My Spending
    "Food" : 450
    "Transport" : 300
    "Internet" : 500
    "Others" : 150
`}
      </div>
    </div>
  );
}