export const randomString = (length: number): string => {
  let str = "";

  while (str.length < length) {
    str += Math.random().toString(36).substring(2);
  }

  return str.substring(0, length);
};
