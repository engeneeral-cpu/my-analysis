'use strict';
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const pages=['tara.html','login.html','companies.html','company-360.html','company.html','company-profile.html'];
for(const page of pages){const text=fs.readFileSync(path.join(root,page),'utf8');if(!/name=["']viewport["']/.test(text))throw new Error(`${page}: viewport meta missing`);}
const css=['tara.css','premium-design.css','login.css','companies.css','company-360.css','company.css','company-profile.css'];
for(const file of css){const text=fs.readFileSync(path.join(root,file),'utf8');if(!/@media/.test(text))throw new Error(`${file}: responsive media query missing`);}
console.log(`Mobile contract OK: ${pages.length} pages, ${css.length} stylesheets`);
