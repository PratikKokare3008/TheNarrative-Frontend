import React, { useState } from "react";

export default function MarketUpdates() {
  const [showData, setShowData] = useState(false);
  
  // Example static market data
  const marketSummary = [
    { name: "Nifty50", value: "22,147 ▲ +0.56%" },
    { name: "Sensex", value: "72,664 ▼ -0.21%" },
    { name: "TCS", value: "₹3,160 ▲ +1.2%" },
    { name: "Reliance", value: "₹2,450 ▼ -0.8%" },
    { name: "HDFC Bank", value: "₹1,720 ▲ +0.3%" },
    { name: "Infosys", value: "₹1,845 ▲ +2.1%" }
  ];

  const handleViewMarket = () => {
    setShowData(!showData);
  };

  return (
    <div className="market-updates">
      <h3>Market Updates</h3>
      
      {showData && (
        <div className="market-list">
          {marketSummary.map((item, index) => (
            <div key={index} className="market-item">
              <span className="market-name">{item.name}</span>
              <span className="market-value">{item.value}</span>
            </div>
          ))}
        </div>
      )}
      
      <button 
        className="market-action-btn"
        onClick={handleViewMarket}
      >
        {showData ? "Hide Market Data" : "View Market Data"}
      </button>
    </div>
  );
}
