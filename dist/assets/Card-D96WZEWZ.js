import{j as s}from"./index-BTwzOfe7.js";function d({children:a,className:o="",onClick:r,hover:t=!1}){return s.jsx("div",{role:r?"button":void 0,tabIndex:r?0:void 0,className:`
        bg-white dark:bg-gray-800 
        border border-gray-300 dark:border-gray-600 
        rounded-lg 
        p-4 sm:p-5
        shadow-sm
        ${t?"hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-primary-500 dark:hover:border-primary-400 hover:shadow-md transition-all cursor-pointer":""}
        ${r?"cursor-pointer touch-manipulation active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900":""}
        ${o}
      `,onClick:r,onKeyDown:r?e=>{(e.key==="Enter"||e.key===" ")&&(e.preventDefault(),r())}:void 0,children:a})}function i({children:a,className:o=""}){return s.jsx("div",{className:`mb-3 sm:mb-4 ${o}`,children:a})}function u({children:a,className:o=""}){return s.jsx("div",{className:o,children:a})}export{d as C,i as a,u as b};
