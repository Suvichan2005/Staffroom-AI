import React from "react";

export default function StudentSummary({ students, getSummary }) {
  return (
    <div className="sc-card">
      <h3 className="sc-heading text-base mb-3">Per-Student Summary</h3>
      <div className="overflow-auto">
        <table className="sc-table min-w-[520px]">
          <thead>
            <tr>
              <th>Student</th>
              <th>Total</th>
              <th>Present</th>
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => {
              const summary = getSummary(s.studentId);
              return (
                <tr key={s.studentId}>
                  <td className="rounded-l-lg">{s.name}</td>
                  <td>{summary.totalClasses}</td>
                  <td>{summary.presentCount}</td>
                  <td className="rounded-r-lg">{summary.attendancePercent}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
