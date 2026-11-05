import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className = '', size = 24 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Precision open book spine & pages */}
      <path
        d="M2 5.5C2 4.12 3.12 3 4.5 3C6.5 3 9.5 4 12 5.5C14.5 4 17.5 3 19.5 3C20.88 3 22 4.12 22 5.5V18.5C22 19.88 20.88 21 19.5 21C17.5 21 14.5 20 12 18.5C9.5 20 6.5 21 4.5 21C3.12 21 2 19.88 2 18.5V5.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Center binding seam */}
      <path
        d="M12 5.5V18.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      {/* Acoustic wave arcs reflecting audio format */}
      <path
        d="M6 9C7.5 9.5 9 10 10 11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d="M6 13C7.5 13.5 9 14 10 15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d="M18 9C16.5 9.5 15 10 14 11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d="M18 13C16.5 13.5 15 14 14 15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  );
}
