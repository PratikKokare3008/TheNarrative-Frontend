import React, { useState } from "react";

export default function SportsSchedule() {
  const [showData, setShowData] = useState(false);
  
  // Example static sports data
  const sportsEvents = [
    { date: "9 Oct", event: "Cricket World Cup", teams: "IND vs AUS" },
    { date: "10 Oct", event: "Football ISL", teams: "ATK vs BFC" },
    { date: "11 Oct", event: "Hockey Pro League", teams: "IND vs GER" },
    { date: "12 Oct", event: "Badminton BWF", teams: "Sindhu vs Marin" }
  ];

  const handleViewEvents = () => {
    setShowData(!showData);
  };

  return (
    <div className="sports-schedule">
      <h3>Sports Schedule</h3>
      
      {showData && (
        <div className="sports-table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Event</th>
                <th>Teams</th>
              </tr>
            </thead>
            <tbody>
              {sportsEvents.map((event, index) => (
                <tr key={index}>
                  <td>{event.date}</td>
                  <td className="event-name">{event.event}</td>
                  <td className="team-names">{event.teams}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      <button 
        className="sports-action-btn"
        onClick={handleViewEvents}
      >
        {showData ? "Hide Events" : "View Upcoming Events"}
      </button>
    </div>
  );
}
