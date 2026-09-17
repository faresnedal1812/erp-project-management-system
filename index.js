// Africa/Cairo
// Asia/Tokyo
// UTC

const now = new Date();
console.log(now.getDay());
console.log(now.getUTCDay());
console.log(now.getDate());
console.log(now.getUTCDate());

// console.log(now.getTime());
// console.log(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
// const localNow = new Date(
//   now.toLocaleString("en-US", { timeZone: "America/New_York" }),
// );
// const tzOffset = now.getTime() - localNow.getTime();

// console.log(now);
// console.log(localNow);
// console.log(tzOffset);
