export const parseDateText = (text: string): string => {
  const [day, month, year] = text.split(".");
  return `${year}-${month}-${day}`;
};
