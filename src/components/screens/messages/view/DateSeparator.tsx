"use client";

import React from "react";

interface DateSeparatorProps {
  date: string;
}

const DateSeparator: React.FC<DateSeparatorProps> = ({ date }) => {
  return (
    <div 
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        margin: "16px 0",
        position: "relative"
      }}
    >
      <div 
        style={{
          width: "100%",
          height: "1px",
          backgroundColor: "rgba(0, 0, 0, 0.1)",
          position: "absolute",
          zIndex: 1
        }}
      />
      <div 
        style={{
          backgroundColor: "#f0f2f5",
          padding: "4px 16px",
          borderRadius: "16px",
          fontSize: "12px",
          color: "#65676B",
          position: "relative",
          zIndex: 2
        }}
      >
        {date}
      </div>
    </div>
  );
};

export default DateSeparator;