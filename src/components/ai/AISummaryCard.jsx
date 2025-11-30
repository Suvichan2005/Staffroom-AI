export default function AISummaryCard({ insights = [], className = "" }) {
  const defaultInsights = insights.length
    ? insights
    : [
        {
          title: "Attendance dip",
          detail: "6A attendance dropped 10% on Thu – consider a recap session."
        },
        {
          title: "Progress highlight",
          detail: "Landforms chapter is halfway complete across sections."
        },
        {
          title: "Upcoming focus",
          detail: "History 8B needs revision before the mid-term on 26 Nov."
        }
      ];

  return (
    <div className={`sc-card ${className}`.trim()}>
      <h3 className="sc-heading text-base mb-2">AI Summary</h3>
      <ul className="space-y-2 text-sm">
        {defaultInsights.map((item, idx) => (
          <li key={idx} className="border border-black-200 rounded-lg p-2 bg-white/60">
            <p className="font-medium">{item.title}</p>
            <p className="text-black-600 text-xs leading-relaxed">{item.detail}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}