function n(s){return s instanceof Error||s!==null&&typeof s=="object"&&"message"in s&&typeof s.message=="string"?s.message:String(s)}export{n as a};
