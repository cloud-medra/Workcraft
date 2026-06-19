import React from 'react';

const Spinner = ({ size = "md", color = "#0E5B6D" }) => {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-20 h-20"
  };

  return (
    <div className={`relative ${sizeClasses[size]}`}>
      <div
        className="absolute inset-0 border-2 border-t-transparent rounded-full animate-spin"
        style={{
          borderColor: color,
          borderTopColor: 'transparent',
          animationDuration: '0.8s'
        }}
      ></div>

      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className="w-full h-full p-[22%] animate-pulse"
        style={{ fill: color, animationDuration: '0.8s' }}
      >
        <path d="M6.5 20q-2.275 0-3.887-1.575T1 14.575q0-1.95 1.175-3.475T5.25 9.15q.625-2.3 2.5-3.725T12 4q2.925 0 4.963 2.038T19 11q1.725.2 2.863 1.488T23 15.5q0 1.875-1.312 3.188T18.5 20zm0-2h12q1.05 0 1.775-.725T21 15.5t-.725-1.775T18.5 13H17v-2q0-2.075-1.463-3.538T12 6T8.463 7.463T7 11h-.5q-1.45 0-2.475 1.025T3 14.5t1.025 2.475T6.5 18m5.5-6" />
      </svg>
    </div>
  );
};

export default Spinner;