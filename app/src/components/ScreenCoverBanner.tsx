import React from "react";

const ScreenCoverBanner: React.FC<{ message: string }> = ({ message }) => {
  return (
    <div
      className="absolute top-0 left-0 w-full bg-yellow-300 text-center p-4 shadow-md z-50 pointer-events-none"
      style={{ transform: "translateY(-100%)" }}
    >
      <span className="text-black font-bold">{message}</span>
    </div>
  );
};


export default ScreenCoverBanner;