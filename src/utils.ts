export function rand() {
  return Math.random().toString(36).substr(2); // remove `0.`
}

export function randomToken() {
  return rand() + rand(); // to make it longer
}
