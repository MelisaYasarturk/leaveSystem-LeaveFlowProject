/*import React from 'react';

const LeaveTable = () => {
  const leaveRequests = [
    { duration: "15.02.2024 to 19.02.2024", days: 5, reason: "Family vacation", status: "Approved", dateApplied: "20.01.2024" },
    { duration: "01.03.2024 to 05.03.2024", days: 5, reason: "Personal time off", status: "Pending", dateApplied: "25.02.2024" },
    { duration: "10.01.2024 to 12.01.2024", days: 3, reason: "Extended weekend", status: "Rejected", dateApplied: "05.01.2024" },
    { duration: "01.04.2024 to 03.04.2024", days: 3, reason: "Spring break", status: "Approved", dateApplied: "15.03.2024" },
  ];

  return (
    <div className="mt-6 bg-white p-4 rounded shadow">
      <h2 className="font-bold">My Annual Leave Requests</h2>
      <table className="w-full">
        <thead>
          <tr className="bg-gray-200">
            <th className="p-2">Duration</th>
            <th className="p-2">Days</th>
            <th className="p-2">Reason</th>
            <th className="p-2">Status</th>
            <th className="p-2">Applied</th>
          </tr>
        </thead>
        <tbody>
          {leaveRequests.map((request, index) => (
            <tr key={index}>
              <td className="p-2 border-b">{request.duration}</td>
              <td className="p-2 border-b">{request.days}</td>
              <td className="p-2 border-b">{request.reason}</td>
              <td className={`p-2 border-b ${request.status.toLowerCase()}`}>{request.status}</td>
              <td className="p-2 border-b">{request.dateApplied}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LeaveTable;
*/