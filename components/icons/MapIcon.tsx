import React from 'react';

export const MapIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.5-12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.894 6.168a2.25 2.25 0 0 0-2.617-2.138l-2.08.519a2.25 2.25 0 0 0-1.745 2.138v2.853m6.883-3.824a2.25 2.25 0 0 1-2.138 2.617l-.519 2.08a2.25 2.25 0 0 1-2.138 1.745H8.25a2.25 2.25 0 0 1-2.138-1.745l-.519-2.08a2.25 2.25 0 0 1 2.138-2.617m6.883 3.824-6.883 3.824m0 0-6.883-3.824m6.883 3.824v-8.25" />
  </svg>
);